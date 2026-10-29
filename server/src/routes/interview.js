import express from 'express'
import { getDatabase } from '../models/database.js'
import { generateInterviewTopic } from '../services/aiService.js'

const router = express.Router()

// 获取所有采访对象
router.get('/interviewees', (req, res) => {
  try {
    const db = getDatabase()
    const interviewees = db.prepare('SELECT * FROM interviewees ORDER BY created_at DESC').all()
    res.json({ success: true, data: interviewees })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 创建采访对象
router.post('/interviewees', (req, res) => {
  try {
    const { name, age, hometown, relationship, avatar, notes } = req.body
    const db = getDatabase()

    const stmt = db.prepare(`
      INSERT INTO interviewees (name, age, hometown, relationship, avatar, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    const result = stmt.run(name, age, hometown, relationship, avatar, notes)

    res.json({
      success: true,
      data: { id: result.lastInsertRowid, name, age, hometown, relationship, avatar, notes }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 开始新的采访会话
router.post('/sessions/start', async (req, res) => {
  try {
    const { intervieweeId } = req.body
    const db = getDatabase()

    // 创建会话
    const stmt = db.prepare(`
      INSERT INTO interview_sessions (interviewee_id, title)
      VALUES (?, ?)
    `)
    const result = stmt.run(intervieweeId, `采访 ${new Date().toLocaleDateString('zh-CN')}`)
    const sessionId = result.lastInsertRowid

    // 获取采访对象信息
    const interviewee = db.prepare('SELECT * FROM interviewees WHERE id = ?').get(intervieweeId)

    // 生成第一个 AI 话题
    const topic = await generateInterviewTopic(interviewee, [])

    // 保存 AI 消息
    const msgStmt = db.prepare(`
      INSERT INTO messages (session_id, role, text)
      VALUES (?, 'ai', ?)
    `)
    msgStmt.run(sessionId, topic)

    res.json({
      success: true,
      data: {
        sessionId,
        interviewee,
        firstTopic: topic
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 获取会话消息列表
router.get('/sessions/:sessionId/messages', (req, res) => {
  try {
    const { sessionId } = req.params
    const db = getDatabase()

    const messages = db.prepare(`
      SELECT * FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId)

    res.json({ success: true, data: messages })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 发送用户消息（录音转文字后）
router.post('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params
    const { text, audioUrl, duration } = req.body
    const db = getDatabase()

    // 保存用户消息
    const stmt = db.prepare(`
      INSERT INTO messages (session_id, role, text, audio_url, duration)
      VALUES (?, 'user', ?, ?, ?)
    `)
    stmt.run(sessionId, text, audioUrl, duration)

    // 获取会话信息
    const session = db.prepare(`
      SELECT s.*, i.name, i.age, i.hometown, i.relationship
      FROM interview_sessions s
      JOIN interviewees i ON s.interviewee_id = i.id
      WHERE s.id = ?
    `).get(sessionId)

    // 获取历史消息
    const history = db.prepare(`
      SELECT role, text FROM messages
      WHERE session_id = ?
      ORDER BY created_at ASC
    `).all(sessionId)

    // 生成 AI 回复
    const aiReply = await generateInterviewTopic(session, history)

    // 保存 AI 消息
    const aiStmt = db.prepare(`
      INSERT INTO messages (session_id, role, text)
      VALUES (?, 'ai', ?)
    `)
    aiStmt.run(sessionId, aiReply)

    res.json({
      success: true,
      data: { userMessage: text, aiReply }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 结束采访会话
router.post('/sessions/:sessionId/end', (req, res) => {
  try {
    const { sessionId } = req.params
    const db = getDatabase()

    db.prepare(`
      UPDATE interview_sessions
      SET status = 'ended', ended_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(sessionId)

    res.json({ success: true, message: '会话已结束' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router