import axios from 'axios'

/**
 * AI 采访话题生成服务
 * 支持豆包 API 和通义千问 API
 */

const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

/**
 * 生成采访话题
 * @param {Object} interviewee - 采访对象信息
 * @param {Array} history - 历史对话
 * @returns {string} AI 生成的话题
 */
export async function generateInterviewTopic(interviewee, history) {
  const systemPrompt = buildSystemPrompt(interviewee)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: m.text
    }))
  ]

  // 优先使用豆包 API
  if (process.env.DOUBAO_API_KEY) {
    return await callDoubaoAPI(messages)
  }

  // 其次使用通义千问 API
  if (process.env.QWEN_API_KEY) {
    return await callQwenAPI(messages)
  }

  // 如果都没有配置，返回模拟数据
  return getMockTopic(interviewee, history.length)
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(interviewee) {
  return `你是 FamilyVault 的 AI 采访助手。你的任务是通过温暖、自然的问题引导，帮助记录家族故事和记忆。

采访对象信息：
- 称呼：${interviewee.name}
- 年龄：${interviewee.age}岁
- 籍贯：${interviewee.hometown}
- 关系：${interviewee.relationship}

采访原则：
1. 问题要具体、有画面感，避免抽象
2. 从日常生活细节入手，容易回忆
3. 语气亲切自然，像家人聊天
4. 每次只问一个问题
5. 根据对方的回答追问细节
6. 关注情感而非事实准确性

话题方向（按优先级）：
1. 童年记忆（食物、游戏、节日）
2. 青春岁月（学校、工作、恋爱）
3. 家庭故事（父母、兄弟姐妹、子女）
4. 人生转折（重大决定、难忘经历）
5. 智慧传承（人生感悟、家训格言）

请用中文提问，每次只输出一个问题，不要有多余的解释。`
}

/**
 * 调用豆包 API
 */
async function callDoubaoAPI(messages) {
  try {
    const response = await axios.post(DOUBAO_API_URL, {
      model: process.env.DOUBAO_MODEL || 'doubao-pro-32k',
      messages,
      temperature: 0.8,
      max_tokens: 200
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DOUBAO_API_KEY}`
      }
    })

    return response.data.choices[0].message.content.trim()
  } catch (error) {
    console.error('豆包 API 调用失败:', error.message)
    throw error
  }
}

/**
 * 调用通义千问 API
 */
async function callQwenAPI(messages) {
  try {
    const response = await axios.post(QWEN_API_URL, {
      model: process.env.QWEN_MODEL || 'qwen-turbo',
      messages,
      temperature: 0.8,
      max_tokens: 200
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.QWEN_API_KEY}`
      }
    })

    return response.data.choices[0].message.content.trim()
  } catch (error) {
    console.error('通义千问 API 调用失败:', error.message)
    throw error
  }
}

/**
 * 模拟话题生成（未配置 API 时使用）
 */
function getMockTopic(interviewee, historyLength) {
  const topics = [
    `${interviewee.name}，您小时候过年都吃什么？有没有什么特别的年菜？`,
    `您还记得${interviewee.hometown}老家的房子是什么样的吗？`,
    `您年轻时候最喜欢做什么消遣？`,
    `您和${interviewee.relationship}是怎么认识的？`,
    `您这辈子最骄傲的事情是什么？`,
    `您小时候家里谁做饭最好吃？会做什么菜？`,
    `您还记得第一次离开家是什么时候吗？去哪里？`,
    `您觉得现在的生活跟您年轻时候比，最大的变化是什么？`
  ]

  return topics[historyLength % topics.length]
}

/**
 * 从对话中提取实体（人物、地点、事件、时间）
 * @param {string} text - 对话文本
 * @returns {Object} 提取的实体
 */
export async function extractEntities(text) {
  // TODO: 使用 NER 模型或 LLM 提取实体
  // 这里先返回模拟数据
  return {
    persons: [],
    locations: [],
    events: [],
    times: []
  }
}