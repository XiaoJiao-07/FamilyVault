import express from 'express'
import { getDatabase } from '../models/database.js'
import cron from 'node-cron'

const router = express.Router()

// 创建时光胶囊
router.post('/', (req, res) => {
  try {
    const { fromPerson, toPerson, messageType, content, mediaUrl, unlockDate } = req.body
    const db = getDatabase()

    const stmt = db.prepare(`
      INSERT INTO time_capsules (from_person, to_person, message_type, content, media_url, unlock_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(fromPerson, toPerson, messageType, content, mediaUrl, unlockDate)

    res.json({
      success: true,
      data: {
        id: result.lastInsertRowid,
        fromPerson,
        toPerson,
        messageType,
        content,
        unlockDate
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取所有胶囊
router.get('/', (req, res) => {
  try {
    const db = getDatabase()
    const capsules = db.prepare(`
      SELECT * FROM time_capsules
      ORDER BY created_at DESC
    `).all()

    // 标记已解锁的胶囊
    const now = new Date().toISOString()
    const updatedCapsules = capsules.map(c => ({
      ...c,
      is_unlocked: c.is_unlocked || new Date(c.unlock_date) <= new Date(now)
    }))

    res.json({ success: true, data: updatedCapsules })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 解锁胶囊
router.post('/:id/unlock', (req, res) => {
  try {
    const { id } = req.params
    const db = getDatabase()

    const capsule = db.prepare('SELECT * FROM time_capsules WHERE id = ?').get(id)

    if (!capsule) {
      return res.status(404).json({ success: false, error: '胶囊不存在' })
    }

    if (new Date(capsule.unlock_date) > new Date()) {
      return res.status(400).json({
        success: false,
        error: `胶囊尚未到解锁时间，解锁时间：${capsule.unlock_date}`
      })
    }

    db.prepare('UPDATE time_capsules SET is_unlocked = 1 WHERE id = ?').run(id)

    res.json({ success: true, data: capsule })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 定时任务：检查并发送解锁提醒
const checkCapsules = () => {
  try {
    const db = getDatabase()
    const now = new Date().toISOString()

    const dueCapsules = db.prepare(`
      SELECT * FROM time_capsules
      WHERE unlock_date <= ? AND is_unlocked = 0
    `).all(now)

    for (const capsule of dueCapsules) {
      console.log(`🔔 时光胶囊 #${capsule.id} 已到期，发送给 ${capsule.to_person}`)
      // TODO: 发送邮件/短信/推送通知
    }
  } catch (error) {
    console.error('检查胶囊失败:', error)
  }
}

// 每小时检查一次
cron.schedule(process.env.CAPSULE_CHECK_INTERVAL || '0 * * * *', checkCapsules)

export default router