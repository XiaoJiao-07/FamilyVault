import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { getDatabase, autoSave } from '../models/database.js'
import { authRequired } from './auth.js'
import { transcribeAudio } from '../services/whisperService.js'

/**
 * 媒体上传与访问
 *
 * 安全要点：
 * 1. 上传必须登录，文件登记到家庭（media_files），只能被同家庭的人访问
 * 2. 文件名由服务端随机生成，不采用原始文件名 —— 原实现直接拼接 originalname，
 *    存在路径穿越（../../）风险
 * 3. 不再公开静态目录，改为 HMAC 签名的临时链接；<img> 也能用，泄漏窗口可控
 */
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const UPLOAD_DIR = path.join(__dirname, '../../../data/uploads')
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const SIGN_TTL = 60 * 60 * 1000 // 链接有效期 1 小时
const MEDIA_SECRET = process.env.JWT_SECRET || 'familyvault-dev-secret-change-me'

const ALLOWED = {
  jpeg: { ext: '.jpg', mime: 'image/jpeg', kind: 'image' },
  jpg: { ext: '.jpg', mime: 'image/jpeg', kind: 'image' },
  png: { ext: '.png', mime: 'image/png', kind: 'image' },
  gif: { ext: '.gif', mime: 'image/gif', kind: 'image' },
  webp: { ext: '.webp', mime: 'image/webp', kind: 'image' },
  mp3: { ext: '.mp3', mime: 'audio/mpeg', kind: 'audio' },
  wav: { ext: '.wav', mime: 'audio/wav', kind: 'audio' },
  m4a: { ext: '.m4a', mime: 'audio/mp4', kind: 'audio' },
  mp4: { ext: '.mp4', mime: 'video/mp4', kind: 'video' },
  webm: { ext: '.webm', mime: 'video/webm', kind: 'video' }
}

function pickType(originalName) {
  const ext = path.extname(String(originalName || '')).toLowerCase().replace('.', '')
  return ALLOWED[ext] || null
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const type = pickType(file.originalname)
    // 服务端随机命名，不使用用户提供的文件名
    cb(null, `${Date.now()}-${crypto.randomUUID()}${type ? type.ext : ''}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (pickType(file.originalname)) return cb(null, true)
    cb(new Error('不支持的文件类型'))
  }
})

/** 生成带过期时间的签名路径 */
export function signMediaPath(filename, ttl = SIGN_TTL) {
  const expires = Date.now() + ttl
  const sig = crypto
    .createHmac('sha256', MEDIA_SECRET)
    .update(`${filename}:${expires}`)
    .digest('base64url')
  return `/api/upload/${encodeURIComponent(filename)}?e=${expires}&s=${sig}`
}

function verifySignature(filename, expires, sig) {
  const exp = Number(expires)
  if (!exp || !sig) return false
  if (Date.now() > exp) return false
  const expected = crypto
    .createHmac('sha256', MEDIA_SECRET)
    .update(`${filename}:${exp}`)
    .digest('base64url')
  const a = Buffer.from(String(sig))
  const b = Buffer.from(expected)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function queryOne(db, sql, params = []) {
  const stmt = db.prepare(sql)
  try {
    stmt.bind(params)
    if (stmt.step()) return stmt.getAsObject()
    return null
  } finally {
    stmt.free()
  }
}

/** 中间件：当前用户的家庭 */
async function withFamily(req, res, next) {
  try {
    const db = await getDatabase()
    const membership = queryOne(db, 'SELECT * FROM family_memberships WHERE user_id = ?', [
      Number(req.user.sub)
    ])
    if (!membership) {
      return res.status(409).json({ success: false, message: '账号还没有归属家庭' })
    }
    req.db = db
    req.familyId = Number(membership.family_id)
    next()
  } catch (error) {
    next(error)
  }
}

function saveMedia(req, file) {
  const type = pickType(file.originalname)
  req.db.run(
    `INSERT INTO media_files (filename, original_name, mime_type, size, kind, family_id, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      file.filename,
      String(file.originalname || '').slice(0, 200),
      type.mime,
      file.size,
      type.kind,
      req.familyId,
      Number(req.user.sub)
    ]
  )
  autoSave()
  return {
    filename: file.filename,
    url: signMediaPath(file.filename),
    kind: type.kind,
    size: file.size,
    expiresIn: SIGN_TTL / 1000
  }
}

/** 上传图片 */
router.post('/image', authRequired, withFamily, upload.single('image'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传图片' })
    if (pickType(req.file.originalname).kind !== 'image') {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ success: false, message: '只支持图片' })
    }
    return res.json({ success: true, data: saveMedia(req, req.file) })
  } catch (error) {
    console.error('upload image failed:', error)
    return res.status(500).json({ success: false, message: '上传失败' })
  }
})

/** 上传音频并转文字 */
router.post('/audio', authRequired, withFamily, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '请上传音频' })
    if (pickType(req.file.originalname).kind !== 'audio') {
      fs.unlinkSync(req.file.path)
      return res.status(400).json({ success: false, message: '只支持音频' })
    }

    const media = saveMedia(req, req.file)
    let transcription = ''
    let demo = false
    try {
      const result = await transcribeAudio(req.file.path)
      transcription = typeof result === 'string' ? result : result.text || ''
      demo = typeof result === 'object' && Boolean(result.demo)
    } catch (err) {
      console.error('transcribe failed:', err.message)
    }

    return res.json({
      success: true,
      data: { ...media, transcription, demo, duration: Number(req.body.duration) || 0 }
    })
  } catch (error) {
    console.error('upload audio failed:', error)
    return res.status(500).json({ success: false, message: '上传失败' })
  }
})

/** 为已存在的文件批量换取新的签名链接（链接过期后用） */
router.get('/sign', authRequired, withFamily, async (req, res) => {
  try {
    const names = String(req.query.names || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 50)

    const urls = {}
    for (const name of names) {
      const row = queryOne(
        req.db,
        'SELECT filename FROM media_files WHERE filename = ? AND family_id = ?',
        [name, req.familyId]
      )
      if (row) urls[name] = signMediaPath(row.filename)
    }
    return res.json({ success: true, urls, expiresIn: SIGN_TTL / 1000 })
  } catch (error) {
    console.error('sign media failed:', error)
    return res.status(500).json({ success: false, message: '签名失败' })
  }
})

/** 读取文件：签名校验通过才返回，且必须是本家庭的文件 */
router.get('/:filename', async (req, res) => {
  try {
    const filename = String(req.params.filename || '')
    if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
      return res.status(400).end()
    }
    if (!verifySignature(filename, req.query.e, req.query.s)) {
      return res.status(403).json({ success: false, message: '链接无效或已过期' })
    }

    const db = await getDatabase()
    const row = queryOne(db, 'SELECT * FROM media_files WHERE filename = ?', [filename])
    if (!row) return res.status(404).end()

    const filePath = path.join(UPLOAD_DIR, filename)
    if (!filePath.startsWith(UPLOAD_DIR) || !fs.existsSync(filePath)) {
      return res.status(404).end()
    }

    res.setHeader('Content-Type', row.mime_type || 'application/octet-stream')
    res.setHeader('Cache-Control', 'private, max-age=3600')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    return res.sendFile(filePath)
  } catch (error) {
    console.error('serve media failed:', error)
    return res.status(500).end()
  }
})

/** 删除自己家庭的媒体 */
router.delete('/:filename', authRequired, withFamily, async (req, res) => {
  try {
    const filename = String(req.params.filename || '')
    const row = queryOne(
      req.db,
      'SELECT * FROM media_files WHERE filename = ? AND family_id = ?',
      [filename, req.familyId]
    )
    if (!row) return res.status(404).json({ success: false, message: '文件不存在' })

    const filePath = path.join(UPLOAD_DIR, filename)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    req.db.run('DELETE FROM media_files WHERE id = ?', [row.id])
    autoSave()
    return res.json({ success: true })
  } catch (error) {
    console.error('delete media failed:', error)
    return res.status(500).json({ success: false, message: '删除失败' })
  }
})

export default router
