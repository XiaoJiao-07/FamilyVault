import express from 'express'
import { getDatabase, autoSave } from '../models/database.js'
import { authRequired } from './auth.js'

/**
 * 家庭数据同步接口
 *
 * 作用域是「家庭」而不是「用户」：同一家人的所有账号读写同一份数据，
 * 这也是 FamilyVault 与普通单机记事应用的根本区别。
 *
 * 冲突策略：每个 key 带一个 version（写入时生成）。
 * 客户端提交时带 baseVersion，与服务端不一致则返回 409 + 服务端当前值，
 * 由客户端合并后重试，避免家人同时编辑时互相覆盖。
 */
const router = express.Router()

router.use(authRequired)

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

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql)
  const rows = []
  try {
    stmt.bind(params)
    while (stmt.step()) rows.push(stmt.getAsObject())
    return rows
  } finally {
    stmt.free()
  }
}

function newVersion() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

/** 中间件：解析当前用户的家庭，未归属家庭则明确报错 */
function requireFamily(req, res, next) {
  getDatabase()
    .then((db) => {
      const membership = queryOne(db, 'SELECT * FROM family_memberships WHERE user_id = ?', [
        Number(req.user.sub)
      ])
      if (!membership) {
        return res.status(409).json({ success: false, message: '账号还没有归属家庭，请重新登录' })
      }
      req.db = db
      req.familyId = Number(membership.family_id)
      return next()
    })
    .catch(next)
}

router.use(requireFamily)

/** 全量拉取：登录后启动时一次拿全，作为本地缓存的权威来源 */
router.get('/', async (req, res) => {
  try {
    const rows = queryAll(req.db, 'SELECT * FROM family_data WHERE family_id = ?', [req.familyId])
    const data = {}
    for (const row of rows) {
      let parsed = null
      try {
        parsed = row.value === null ? null : JSON.parse(row.value)
      } catch {
        parsed = null
      }
      data[row.data_key] = { value: parsed, version: row.version, updatedAt: row.updated_at }
    }
    return res.json({ success: true, data, familyId: req.familyId })
  } catch (error) {
    console.error('read all data failed:', error)
    return res.status(500).json({ success: false, message: '读取失败' })
  }
})

/** 读取单条 */
router.get('/:key', async (req, res) => {
  try {
    const row = queryOne(
      req.db,
      'SELECT * FROM family_data WHERE family_id = ? AND data_key = ?',
      [req.familyId, req.params.key]
    )
    if (!row) return res.json({ success: true, data: null, version: null })
    return res.json({
      success: true,
      data: row.value === null ? null : JSON.parse(row.value),
      version: row.version,
      updatedAt: row.updated_at
    })
  } catch (error) {
    console.error('read data failed:', error)
    return res.status(500).json({ success: false, message: '读取失败' })
  }
})

/** 写入单条（带版本校验的 upsert） */
router.put('/:key', async (req, res) => {
  try {
    const key = String(req.params.key || '')
    if (!key || key.length > 64) {
      return res.status(400).json({ success: false, message: '数据键无效' })
    }

    const value = JSON.stringify(req.body.value ?? null)
    if (value.length > 2 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: '数据过大' })
    }

    const baseVersion = req.body.baseVersion ?? null
    const current = queryOne(
      req.db,
      'SELECT * FROM family_data WHERE family_id = ? AND data_key = ?',
      [req.familyId, key]
    )

    // 冲突：客户端基于的版本已经过期
    if (current && baseVersion && baseVersion !== current.version) {
      let serverValue = null
      try {
        serverValue = current.value === null ? null : JSON.parse(current.value)
      } catch {
        serverValue = null
      }
      return res.status(409).json({
        success: false,
        conflict: true,
        message: '数据已被家人更新',
        data: serverValue,
        version: current.version,
        updatedAt: current.updated_at
      })
    }

    const version = newVersion()
    if (current) {
      req.db.run(
        `UPDATE family_data
         SET value = ?, version = ?, updated_by = ?, updated_at = datetime('now')
         WHERE family_id = ? AND data_key = ?`,
        [value, version, Number(req.user.sub), req.familyId, key]
      )
    } else {
      req.db.run(
        `INSERT INTO family_data (family_id, data_key, value, version, updated_by, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [req.familyId, key, value, version, Number(req.user.sub)]
      )
    }
    autoSave()

    return res.json({ success: true, version, updatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('write data failed:', error)
    return res.status(500).json({ success: false, message: '保存失败' })
  }
})

export default router
