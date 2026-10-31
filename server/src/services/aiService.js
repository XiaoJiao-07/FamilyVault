import axios from 'axios'

/**
 * AI 采访服务
 *
 * 设计原则：**绝不假装**。没有配置 API Key 时返回演示话题，并带 demo: true，
 * 前端会明确显示「演示模式」，而不是让用户以为 AI 坏了。
 */

const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const QWEN_API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const TIMEOUT = 20000

function activeProvider() {
  if (process.env.DOUBAO_API_KEY) {
    return {
      name: 'doubao',
      label: '豆包',
      url: DOUBAO_API_URL,
      key: process.env.DOUBAO_API_KEY,
      model: process.env.DOUBAO_MODEL || 'doubao-pro-32k'
    }
  }
  if (process.env.QWEN_API_KEY) {
    return {
      name: 'qwen',
      label: '通义千问',
      url: QWEN_API_URL,
      key: process.env.QWEN_API_KEY,
      model: process.env.QWEN_MODEL || 'qwen-turbo'
    }
  }
  return null
}

/** 供前端展示当前 AI 能力状态 */
export function aiStatus() {
  const provider = activeProvider()
  return {
    mode: provider ? 'live' : 'demo',
    provider: provider?.name || null,
    providerLabel: provider?.label || null,
    model: provider?.model || null,
    speechToText: Boolean(process.env.WHISPER_API_URL)
  }
}

function buildSystemPrompt(interviewee = {}) {
  const facts = []
  if (interviewee.name) facts.push(`称呼：${interviewee.name}`)
  if (interviewee.age) facts.push(`年龄：${interviewee.age} 岁`)
  if (interviewee.hometown) facts.push(`籍贯：${interviewee.hometown}`)
  if (interviewee.relationship) facts.push(`与记录者的关系：${interviewee.relationship}`)

  return `你是 FamilyVault 的 AI 采访助手，正在帮一个家庭留存长辈的口述历史。

采访对象：${facts.length ? facts.join('；') : '一位家中长辈'}

要求：
1. 先自然地回应对方刚说的内容（一句，具体，不要空洞的夸奖）
2. 再提出下一个问题，只问一个问题，具体、有画面感（食物、声音、气味、地点、人名）
3. 语气像晚辈陪长辈聊天，不说"您能详细说说吗"这种套话
4. 使用简体中文，总字数不超过 80 字，分成两段，不要加"AI："之类的前缀
5. 不要编造采访对象的经历，只基于他/她说过的话追问`
}

async function callLLM(messages) {
  const provider = activeProvider()
  if (!provider) throw new Error('NO_PROVIDER')

  const response = await axios.post(
    provider.url,
    {
      model: provider.model,
      messages,
      temperature: 0.85,
      max_tokens: 240
    },
    {
      timeout: TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.key}`
      }
    }
  )

  const text = response.data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('EMPTY_RESPONSE')
  return text
}

function toMessages(history = []) {
  return history
    .slice(-20)
    .filter(m => m && m.text)
    .map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: String(m.text).slice(0, 1000)
    }))
}

/** 开场：招呼 + 第一个问题 */
export async function generateOpening(interviewee) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(interviewee) },
    {
      role: 'user',
      content: '采访刚开始。请用一句符合我们关系的招呼开场，然后问出第一个问题（例如童年、家乡、家常菜这类容易开口的话题）。'
    }
  ]

  try {
    return { text: await callLLM(messages), demo: false }
  } catch (error) {
    if (error.message !== 'NO_PROVIDER') {
      console.error('AI 开场生成失败，降级为演示话题：', error.message)
    }
    return { text: mockOpening(interviewee), demo: true }
  }
}

/** 一轮对话：回应 + 追问 */
export async function generateTurn({ interviewee, history, userText }) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(interviewee) },
    ...toMessages(history),
    { role: 'user', content: String(userText || '').slice(0, 2000) }
  ]

  try {
    return { text: await callLLM(messages), demo: false }
  } catch (error) {
    if (error.message !== 'NO_PROVIDER') {
      console.error('AI 追问失败，降级为演示话题：', error.message)
    }
    return { text: mockTurn(interviewee, history, userText), demo: true }
  }
}

/* ---------------- 演示模式：本地话题库，明确标记 demo ---------------- */

const TOPIC_BANK = {
  childhood: [
    '您小时候住的房子是什么样子？院子有多大，屋里是什么味道？',
    '小时候过年，家里一定会做哪道菜？是谁做的？',
    '您小时候最常玩的是什么？跟谁一起玩？',
    '您记得的第一件让您特别害怕的事是什么？',
    '小时候家里谁说话最有分量？他/她是什么样的人？'
  ],
  youth: [
    '您第一次离开家是去哪里？当时心里在想什么？',
    '您年轻时做什么工作？第一天上班是什么感觉？',
    '您和另一半是怎么认识的？第一次见面在哪儿？',
    '年轻时候有没有一件现在想起来还想笑的事？',
    '您那时候最大的愿望是什么？后来实现了吗？'
  ],
  family: [
    '您父亲是个什么样的人？他说话是什么口音？',
    '您母亲最拿手的菜是什么？做法您还记得吗？',
    '家里兄弟姐妹几个？谁最调皮？',
    '您这辈子最像家里的哪个人？为什么这么说？',
    '有没有一句话，是家里长辈常说的，您现在还会讲？'
  ],
  wisdom: [
    '您觉得过日子最重要的是什么？',
    '这辈子最难的那段时间，您是怎么熬过来的？',
    '如果可以给孙辈留一句话，您想说什么？',
    '您做过最不后悔的一个决定是什么？',
    '有什么事，您希望我们这代人别再重复？'
  ]
}

const RELATION_HINT = {
  爸爸: 'childhood',
  妈妈: 'childhood',
  父亲: 'childhood',
  母亲: 'childhood',
  爷爷: 'childhood',
  奶奶: 'childhood',
  外公: 'childhood',
  外婆: 'childhood',
  姥爷: 'childhood',
  姥姥: 'childhood'
}

function pickTopic(interviewee = {}, askedCount = 0) {
  const hint = RELATION_HINT[interviewee.relationship] || null
  const order = hint
    ? [hint, 'childhood', 'family', 'youth', 'wisdom']
    : ['childhood', 'youth', 'family', 'wisdom']

  const pool = order.flatMap(key => TOPIC_BANK[key])
  return pool[askedCount % pool.length]
}

function greet(interviewee = {}) {
  const name = interviewee.name || '您'
  return `${name}，我是家里的 AI 采访助手，想听您讲讲过去的事。您慢慢说，不着急。`
}

function mockOpening(interviewee) {
  return `${greet(interviewee)}\n${pickTopic(interviewee, 0)}`
}

function mockTurn(interviewee, history = [], userText = '') {
  const aiCount = history.filter(m => m.role === 'ai').length
  const echo = String(userText).trim()
  const ackOptions = [
    '这个细节我记下了。',
    '听着就像能看见那个画面。',
    '这段挺珍贵的，我给您存着。',
    '原来是这样。'
  ]
  const ack = ackOptions[echo.length % ackOptions.length]
  return `${ack}\n${pickTopic(interviewee, aiCount + 1)}`
}
