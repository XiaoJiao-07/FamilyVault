import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDatabase, autoSave, createFamilyForUser } from '../models/database.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'familyvault-dev-secret-change-me'
const TOKEN_TTL = '7d'
const BCRYPT_ROUNDS = 10

const USERNAME_RE = /^[a-zA-Z0-9_]{4,20}$/
const MIN_PASSWORD_LENGTH = 6
const MAX_PASSWORD_LENGTH = 72 // bcrypt 输入上限

// 登录失败限流：同一 IP + 用户名，10 分钟内最多 5 次失败
const WINDOW_MS = 10 * 60 * 1000
const MAX_FAILS = 5
const failures = new Map()

function failKey(req, username) {
  return `${req.ip}|${String(username || '').toLowerCase()}`
}

function isBlocked(key) {
  const entry = failures.get(key)
  if (!entry) return false
  if (Date.now() - entry.first > WINDOW_MS) {
    failures.delete(key)
    return false
  }
  return entry.count >= MAX_FAILS
}

function recordFailure(key) {
  const entry = failures.get(key)
  if (!entry || Date.now() - entry.first > WINDOW_MS) {
    failures.set(key, { count: 1, first: Date.now() })
    return
  }
  entry.count += 1
}

function clearFailures(key) {
  failures.delete(key)
}

// sql.js 查询辅助
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

function signToken(user) {
  return jwt.sign(
    { sub: String(user.id), username: user.username, role: user.role || 'member' },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  )
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.display_name || user.displayName,
    role: user.role || 'member'
  }
}

/** 读取用户所属家庭，附带身份，用于登录/me 返回 */
function familyOf(db, userId) {
  const stmt = db.prepare(
    'SELECT family_id, role FROM family_memberships WHERE user_id = ?'
  )
  try {
    stmt.bind([userId])
    if (!stmt.step()) return { familyId: null, familyRole: null }
    const row = stmt.getAsObject()
    return { familyId: row.family_id, familyRole: row.role }
  } finally {
    stmt.free()
  }
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) {
    return res.status(401).json({ success: false, message: '请先登录' })
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ success: false, message: '登录已过期，请重新登录' })
  }
}

// 注册（需要邀请码）
router.post('/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim()
    const displayName = String(req.body.displayName || '').trim()
    const password = String(req.body.password || '')
    const invitationCode = String(req.body.invitationCode || '').trim().toUpperCase()

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ success: false, message: '用户名需为 4-20 位字母、数字或下划线' })
    }
    if (!displayName || displayName.length > 20) {
      return res.status(400).json({ success: false, message: '昵称不能为空且不超过 20 个字' })
    }
    if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, message: '密码长度需为 6-72 位' })
    }
    if (!invitationCode) {
      return res.status(400).json({ success: false, message: '请填写邀请码' })
    }

    const db = await getDatabase()

    if (queryOne(db, 'SELECT id FROM users WHERE username = ?', [username])) {
      return res.status(409).json({ success: false, message: '该用户名已被使用' })
    }

    const code = queryOne(db, 'SELECT * FROM invitation_codes WHERE code = ?', [invitationCode])
    if (!code || !code.is_active) {
      return res.status(400).json({ success: false, message: '邀请码无效或已失效' })
    }
    if (code.expires_at && new Date(code.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: '邀请码已过期' })
    }
    if (Number(code.current_uses) >= Number(code.max_uses)) {
      return res.status(400).json({ success: false, message: '邀请码使用次数已用尽' })
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
    db.run(
      `INSERT INTO users (username, display_name, password_hash, role, invitation_code_used)
       VALUES (?, ?, ?, 'member', ?)`,
      [username, displayName, passwordHash, invitationCode]
    )

    const nextUses = Number(code.current_uses) + 1
    db.run('UPDATE invitation_codes SET current_uses = ?, is_active = ? WHERE id = ?', [
      nextUses,
      nextUses >= Number(code.max_uses) ? 0 : 1,
      code.id
    ])
    autoSave()

    const user = queryOne(db, 'SELECT * FROM users WHERE username = ?', [username])
    // 每个新账号自动拥有一个家庭，后续可用家庭邀请码加入别人的家
    const family = createFamilyForUser(db, user)
    autoSave()

    return res.json({
      success: true,
      token: signToken(user),
      user: { ...publicUser(user), ...familyOf(db, user.id) },
      family
    })
  } catch (error) {
    console.error('register failed:', error)
    return res.status(500).json({ success: false, message: '注册失败，请稍后重试' })
  }
})

// 登录
router.post('/login', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim()
    const password = String(req.body.password || '')
    const key = failKey(req, username)

    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请填写用户名和密码' })
    }
    if (isBlocked(key)) {
      return res.status(429).json({ success: false, message: '尝试次数过多，请 10 分钟后再试' })
    }

    const db = await getDatabase()
    const user = queryOne(db, 'SELECT * FROM users WHERE username = ?', [username])

    // 统一的失败文案，避免账号枚举
    const invalid = () => {
      recordFailure(key)
      return res.status(401).json({ success: false, message: '用户名或密码错误' })
    }

    if (!user) return invalid()

    const matched = await bcrypt.compare(password, user.password_hash)
    if (!matched) return invalid()

    clearFailures(key)
    db.run('UPDATE users SET last_login_at = datetime("now") WHERE id = ?', [user.id])
    autoSave()

    return res.json({
      success: true,
      token: signToken(user),
      user: { ...publicUser(user), ...familyOf(db, user.id) }
    })
  } catch (error) {
    console.error('login failed:', error)
    return res.status(500).json({ success: false, message: '登录失败，请稍后重试' })
  }
})

// 退出登录（JWT 无状态，客户端丢弃 token 即可）
router.post('/logout', (req, res) => {
  res.json({ success: true })
})

// 当前登录用户
router.get('/me', authRequired, async (req, res) => {
  try {
    const db = await getDatabase()
    const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [Number(req.user.sub)])
    if (!user) {
      return res.status(401).json({ success: false, message: '账号不存在' })
    }
    return res.json({ success: true, user: { ...publicUser(user), ...familyOf(db, user.id) } })
  } catch (error) {
    console.error('me failed:', error)
    return res.status(500).json({ success: false, message: '获取用户信息失败' })
  }
})

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCode(length = 8) {
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

// 生成邀请码（已登录用户可用）
router.post('/invitation-codes', authRequired, async (req, res) => {
  try {
    const maxUses = Math.min(Math.max(Number(req.body.maxUses) || 1, 1), 100)
    const expiresDays = Math.min(Math.max(Number(req.body.expiresDays) || 7, 0), 365)

    const db = await getDatabase()
    const creator = queryOne(db, 'SELECT id FROM users WHERE id = ?', [Number(req.user.sub)])
    if (!creator) {
      return res.status(401).json({ success: false, message: '账号不存在' })
    }

    let code = ''
    for (let i = 0; i < 5; i += 1) {
      const candidate = randomCode()
      if (!queryOne(db, 'SELECT id FROM invitation_codes WHERE code = ?', [candidate])) {
        code = candidate
        break
      }
    }
    if (!code) {
      return res.status(500).json({ success: false, message: '邀请码生成失败，请重试' })
    }

    const expiresAt = expiresDays > 0
      ? new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000).toISOString()
      : null

    db.run(
      `INSERT INTO invitation_codes (code, created_by, max_uses, current_uses, expires_at, is_active)
       VALUES (?, ?, ?, 0, ?, 1)`,
      [code, creator.id, maxUses, expiresAt]
    )
    autoSave()

    return res.json({ success: true, code, expiresAt, maxUses })
  } catch (error) {
    console.error('generate invitation code failed:', error)
    return res.status(500).json({ success: false, message: '生成失败，请稍后重试' })
  }
})

export default router
