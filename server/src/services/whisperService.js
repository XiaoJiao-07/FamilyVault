import axios from 'axios'
import fs from 'fs'
import FormData from 'form-data'

/**
 * 语音转文字服务
 *
 * 优先级：
 * 1. 通义千问 ASR（qwen3-asr-flash）—— 复用已有的 QWEN_API_KEY，无需额外开通
 *    该模型只接受公网可访问的音频链接，因此调用方需传入 publicUrl
 * 2. 自建 / 第三方 Whisper（可选，配置 WHISPER_API_URL）
 *
 * 都没有时返回空文本，**绝不编造内容**（旧实现会返回随机假句子，误导用户）。
 */

const DASHSCOPE_CHAT_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const ASR_MODEL = process.env.ASR_MODEL || 'qwen3-asr-flash'
const ASR_TIMEOUT = Number(process.env.ASR_TIMEOUT) || 45000

// 纯语气词、标点的识别结果视为「没听清」，不作为回答内容
const FILLER = /^[\s。，、？！,.?!嗯啊哦呃唉哎哈噢唔]+$/

function qwenKey() {
  return process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY || ''
}

/**
 * 转录音频文件
 * @param {string|{audioPath?: string, publicUrl?: string}} input
 * @returns {Promise<{text: string, demo: boolean, provider: string, unavailable?: boolean}>}
 */
export async function transcribeAudio(input) {
  const { audioPath, publicUrl } = typeof input === 'string' ? { audioPath: input } : input || {}

  // 1. 通义 ASR —— 需要公网可访问链接
  if (qwenKey() && publicUrl) {
    try {
      const text = await transcribeByQwen(publicUrl)
      return { text, demo: false, provider: 'qwen-asr' }
    } catch (error) {
      console.error('通义语音识别失败:', error.message)
    }
  }

  // 2. 自建 / 第三方 Whisper
  if (process.env.WHISPER_API_URL && audioPath) {
    try {
      const text = await transcribeByWhisper(audioPath)
      return { text, demo: false, provider: 'whisper' }
    } catch (error) {
      console.error('Whisper 转录失败:', error.message)
    }
  }

  // 3. 都没有：明确返回不可用，让前端保留语音留言
  return { text: '', demo: false, provider: null, unavailable: true }
}

async function transcribeByQwen(url) {
  const res = await axios.post(
    DASHSCOPE_CHAT_URL,
    {
      model: ASR_MODEL,
      modalities: ['text'],
      asr_options: { language: 'zh' },
      messages: [
        { role: 'user', content: [{ type: 'input_audio', input_audio: { data: url } }] }
      ]
    },
    {
      headers: { Authorization: `Bearer ${qwenKey()}`, 'Content-Type': 'application/json' },
      timeout: ASR_TIMEOUT
    }
  )

  const raw = res.data?.choices?.[0]?.message?.content
  const text = (Array.isArray(raw) ? raw.map(p => p?.text || '').join('') : raw) || ''
  const clean = String(text).trim()

  return FILLER.test(clean) ? '' : clean
}

async function transcribeByWhisper(audioPath) {
  const apiUrl = process.env.WHISPER_API_URL
  const form = new FormData()
  form.append('file', fs.createReadStream(audioPath))
  form.append('model', 'whisper-1')
  form.append('language', 'zh')

  const headers = { ...form.getHeaders() }
  if (apiUrl.includes('openai.com') && process.env.WHISPER_API_KEY) {
    headers['Authorization'] = `Bearer ${process.env.WHISPER_API_KEY}`
  }

  const response = await axios.post(apiUrl, form, { headers, timeout: 60000 })
  const text = response.data.text || response.data.transcription || ''
  const clean = String(text).trim()
  return FILLER.test(clean) ? '' : clean
}

/** 语音识别是否可用于状态展示 */
export function asrStatus() {
  if (qwenKey()) return { available: true, provider: 'qwen-asr', model: ASR_MODEL }
  if (process.env.WHISPER_API_URL) return { available: true, provider: 'whisper', model: 'whisper-1' }
  return { available: false, provider: null, model: null }
}

/**
 * 检查语音服务是否可用
 */
export async function checkWhisperHealth() {
  const status = asrStatus()
  if (!status.available) {
    return { available: false, message: '未配置语音识别服务' }
  }
  if (status.provider === 'whisper') {
    const apiUrl = process.env.WHISPER_API_URL
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      try {
        const healthUrl = apiUrl.replace('/inference', '/health')
        const response = await axios.get(healthUrl, { timeout: 5000 })
        return { available: response.status === 200, message: 'Whisper 服务正常' }
      } catch (error) {
        return { available: false, message: `Whisper 服务不可用: ${error.message}` }
      }
    }
  }
  return { available: true, message: '语音识别已就绪', ...status }
}
