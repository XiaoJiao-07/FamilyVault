import axios from 'axios'
import fs from 'fs'
import FormData from 'form-data'

/**
 * Whisper 语音转文字服务
 * 支持本地 Whisper.cpp 服务器或 OpenAI API
 */

/**
 * 转录音频文件
 * @param {string} audioPath - 音频文件路径
 * @returns {string} 转录文本
 */
export async function transcribeAudio(audioPath) {
  const apiUrl = process.env.WHISPER_API_URL

  if (!apiUrl) {
    // 未配置 API：返回演示文本，并明确标记 demo，避免调用方误以为是真实识别
    return { text: getMockTranscription(), demo: true }
  }

  try {
    const form = new FormData()
    form.append('file', fs.createReadStream(audioPath))
    form.append('model', 'whisper-1')
    form.append('language', 'zh')

    const headers = {
      ...form.getHeaders()
    }

    // 如果使用 OpenAI API，需要添加 Authorization
    if (apiUrl.includes('openai.com') && process.env.WHISPER_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.WHISPER_API_KEY}`
    }

    const response = await axios.post(apiUrl, form, {
      headers,
      timeout: 60000 // 60秒超时
    })

    return { text: response.data.text || response.data.transcription || '', demo: false }
  } catch (error) {
    console.error('Whisper 转录失败:', error.message)
    throw error
  }
}

/**
 * 模拟转录（未配置 API 时使用）
 */
function getMockTranscription() {
  const mockTexts = [
    '我小时候啊，家里条件不好，过年才能吃上一顿肉。那时候最期待的就是奶奶做的红烧肉，那个香味啊，整个村子都能闻到。',
    '我记得老家在村东头，门口有棵大槐树。夏天我们一帮小孩子就在树底下玩弹珠、拍洋画。',
    '我跟你妈是在工厂里认识的，那时候她是纺织厂的工人，我是机修车间的。',
    '这辈子最骄傲的事，就是把你们几个都养大成人，没让你们饿着冻着。',
    '我父亲那时候在外面做生意，一年也回不来几次。家里就靠你奶奶一个人撑着。'
  ]

  return mockTexts[Math.floor(Math.random() * mockTexts.length)]
}

/**
 * 检查 Whisper 服务是否可用
 */
export async function checkWhisperHealth() {
  const apiUrl = process.env.WHISPER_API_URL

  if (!apiUrl) {
    return { available: false, message: '未配置 Whisper API' }
  }

  try {
    // 如果是本地服务器，检查健康端点
    if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
      const healthUrl = apiUrl.replace('/inference', '/health')
      const response = await axios.get(healthUrl, { timeout: 5000 })
      return { available: response.status === 200, message: 'Whisper 服务正常' }
    }

    // OpenAI API 不需要健康检查
    return { available: true, message: 'Whisper API 已配置' }
  } catch (error) {
    return { available: false, message: `Whisper 服务不可用: ${error.message}` }
  }
}