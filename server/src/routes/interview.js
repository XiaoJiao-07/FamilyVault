import express from 'express'
import { getDatabase, autoSave } from '../models/database.js'
import { generateInterviewTopic } from '../services/aiService.js'

const router = express.Router()

// 获取所有采访对象
router.get('/interviewees', async (req, res) => {
  try {
    const db = await getDatabase()
    const result = db.exec('SELECT * FROM interviewees ORDER BY created_at DESC')

    let interviewees = []
    if (result.length > 0) {
      const columns = result[0].columns
      interviewees = result[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

    res.json({ success: true, data: interviewees })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 创建采访对象
router.post('/interviewees', async (req, res) => {
  try {
    const { name, age, hometown, relationship, avatar, notes } = req.body
    const db = await getDatabase()

    db.run(
      'INSERT INTO interviewees (name, age, hometown, relationship, avatar, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [name, age, hometown, relationship, avatar, notes]
    )
    autoSave()

    const result = db.exec('SELECT last_insert_rowid() as id')
    const id = result[0].values[0][0]

    res.json({
      success: true,
      data: { id, name, age, hometown, relationship, avatar, notes }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 开始新的采访会话
router.post('/sessions/start', async (req, res) => {
  try {
    const { intervieweeId } = req.body
    const db = await getDatabase()

    // 创建会话
    db.run(
      'INSERT INTO interview_sessions (interviewee_id, title) VALUES (?, ?)',
      [intervieweeId, `采访 ${new Date().toLocaleDateString('zh-CN')}`]
    )
    autoSave()

    const sessionIdResult = db.exec('SELECT last_insert_rowid() as id')
    const sessionId = sessionIdResult[0].values[0][0]

    // 获取采访对象信息
    const intervieweeResult = db.exec(`SELECT * FROM interviewees WHERE id = ${intervieweeId}`)
    let interviewee = null
    if (intervieweeResult.length > 0) {
      const columns = intervieweeResult[0].columns
      const row = intervieweeResult[0].values[0]
      interviewee = {}
      columns.forEach((col, idx) => {
        interviewee[col] = row[idx]
      })
    }

    // 生成第一个 AI 话题
    const topic = await generateInterviewTopic(interviewee, [])

    // 保存 AI 消息
    db.run(
      'INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)',
      [sessionId, 'ai', topic]
    )
    autoSave()

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
router.get('/sessions/:sessionId/messages', async (req, res) => {
  try {
    const { sessionId } = req.params
    const db = await getDatabase()

    const result = db.exec(`
      SELECT * FROM messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `)

    let messages = []
    if (result.length > 0) {
      const columns = result[0].columns
      messages = result[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

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
    const db = await getDatabase()

    // 保存用户消息
    db.run(
      'INSERT INTO messages (session_id, role, text, audio_url, duration) VALUES (?, ?, ?, ?, ?)',
      [sessionId, 'user', text, audioUrl, duration]
    )
    autoSave()

    // 获取会话信息
    const sessionResult = db.exec(`
      SELECT s.*, i.name, i.age, i.hometown, i.relationship
      FROM interview_sessions s
      JOIN interviewees i ON s.interviewee_id = i.id
      WHERE s.id = ${sessionId}
    `)

    let session = null
    if (sessionResult.length > 0) {
      const columns = sessionResult[0].columns
      const row = sessionResult[0].values[0]
      session = {}
      columns.forEach((col, idx) => {
        session[col] = row[idx]
      })
    }

    // 获取历史消息
    const historyResult = db.exec(`
      SELECT role, text FROM messages
      WHERE session_id = ${sessionId}
      ORDER BY created_at ASC
    `)

    let history = []
    if (historyResult.length > 0) {
      const columns = historyResult[0].columns
      history = historyResult[0].values.map(row => {
        const obj = {}
        columns.forEach((col, idx) => {
          obj[col] = row[idx]
        })
        return obj
      })
    }

    // 生成 AI 回复
    const aiReply = await generateInterviewTopic(session, history)

    // 保存 AI 消息
    db.run(
      'INSERT INTO messages (session_id, role, text) VALUES (?, ?, ?)',
      [sessionId, 'ai', aiReply]
    )
    autoSave()

    res.json({
      success: true,
      data: { userMessage: text, aiReply }
    })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

// 结束采访会话
router.post('/sessions/:sessionId/end', async (req, res) => {
  try {
    const { sessionId } = req.params
    const db = await getDatabase()

    db.run(`
      UPDATE interview_sessions
      SET status = 'ended', ended_at = CURRENT_TIMESTAMP
      WHERE id = ${sessionId}
    `)
    autoSave()

    res.json({ success: true, message: '会话已结束' })
  } catch (error) {
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router