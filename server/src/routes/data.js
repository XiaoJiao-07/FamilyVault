import express from 'express'
import { getDatabase, autoSave } from '../models/database.js'
import { authRequired } from './auth.js'

const router = express.Router()

router.use(authRequired)

function userId(req) {
  return Number(req.user.sub)
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

// 读取单条数据
router.get('/:key', async (req, res) => {
  try {
    const db = await getDatabase()
    const row = queryOne(db, 'SELECT value FROM user_data WHERE user_id = ? AND data_key = ?', [
      userId(req),
      req.params.key
    ])
    if (!row) return res.json({ success: true, data: null })
    return res.json({ success: true, data: JSON.parse(row.value) })
  } catch (error) {
    console.error('read data failed:', error)
    return res.status(500).json({ success: false, message: '读取失败' })
  }
})

// 写入单条数据（upsert）
router.put('/:key', async (req, res) => {
  try {
    const db = await getDatabase()
    const value = JSON.stringify(req.body.value ?? null)
    const uid = userId(req)

    db.run('UPDATE user_data SET value = ?, synced_at = datetime("now") WHERE user_id = ? AND data_key = ?', [
      value,
      uid,
      req.params.key
    ])
    if (db.getRowsModified() === 0) {
      db.run('INSERT INTO user_data (user_id, data_key, value, synced_at) VALUES (?, ?, ?, datetime("now"))', [
        uid,
        req.params.key,
        value
      ])
    }
    autoSave()
    return res.json({ success: true })
  } catch (error) {
    console.error('write data failed:', error)
    return res.status(500).json({ success: false, message: '保存失败' })
  }
})

export default router
