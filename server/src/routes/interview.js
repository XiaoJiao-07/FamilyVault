import express from 'express'
import { authRequired } from './auth.js'
import { aiStatus, generateOpening, generateTurn } from '../services/aiService.js'

/**
 * AI 采访接口
 *
 * 说明：采访记录本身存放在家庭数据（/api/data/interview_sessions）里，
 * 与家人共享、可离线，不需要再单独建一套会话表。
 * 这里只负责「生成下一句 AI 的话」，是无状态的。
 */
const router = express.Router()

router.use(authRequired)

// 简单的每用户限流：1 分钟 30 次，避免接口被刷
const WINDOW_MS = 60 * 1000
const MAX_CALLS = 30
const calls = new Map()

function rateLimited(userId) {
  const now = Date.now()
  const list = (calls.get(userId) || []).filter(t => now - t < WINDOW_MS)
  if (list.length >= MAX_CALLS) {
    calls.set(userId, list)
    return true
  }
  list.push(now)
  calls.set(userId, list)
  return false
}

function cleanInterviewee(input) {
  if (!input || typeof input !== 'object') return {}
  return {
    name: String(input.name || '').slice(0, 20),
    age: Number(input.age) || null,
    hometown: String(input.hometown || '').slice(0, 30),
    relationship: String(input.relationship || '').slice(0, 20)
  }
}

function cleanHistory(input) {
  if (!Array.isArray(input)) return []
  return input
    .slice(-40)
    .filter(m => m && typeof m.text === 'string')
    .map(m => ({
      role: m.role === 'ai' ? 'ai' : 'user',
      text: m.text.slice(0, 2000)
    }))
}

/** 当前 AI 能力：真实 / 演示 */
router.get('/ai-status', (req, res) => {
  res.json({ success: true, data: aiStatus() })
})

/** 开场话题 */
router.post('/opening', async (req, res) => {
  try {
    if (rateLimited(Number(req.user.sub))) {
      return res.status(429).json({ success: false, message: '问得太快了，歇一下再聊' })
    }
    const interviewee = cleanInterviewee(req.body.interviewee)
    const result = await generateOpening(interviewee)
    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('opening failed:', error)
    return res.status(500).json({ success: false, message: 'AI 暂时不可用' })
  }
})

/** 一轮对话：回应 + 追问 */
router.post('/turn', async (req, res) => {
  try {
    if (rateLimited(Number(req.user.sub))) {
      return res.status(429).json({ success: false, message: '问得太快了，歇一下再聊' })
    }

    const interviewee = cleanInterviewee(req.body.interviewee)
    const history = cleanHistory(req.body.history)
    const userText = String(req.body.userText || '').slice(0, 2000)

    if (!userText.trim()) {
      return res.status(400).json({ success: false, message: '内容为空' })
    }

    const result = await generateTurn({ interviewee, history, userText })
    return res.json({ success: true, data: result })
  } catch (error) {
    console.error('turn failed:', error)
    return res.status(500).json({ success: false, message: 'AI 暂时不可用' })
  }
})

export default router
