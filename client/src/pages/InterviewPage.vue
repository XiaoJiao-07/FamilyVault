<template>
  <div class="interview-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="采访" left-arrow @click-left="goHome">
      <template #right>
        <van-icon name="clock-o" size="20" @click="showHistory = true" />
      </template>
    </van-nav-bar>

    <!-- AI 能力状态 -->
    <div class="ai-banner" :class="aiMode">
      <span class="ai-dot" />
      <span class="ai-text">
        {{ aiMode === 'live'
          ? `AI 采访助手已连接${aiLabel ? '（' + aiLabel + '）' : ''}`
          : '提纲模式：没连接 AI，按问题一问一答记录就好' }}
      </span>
      <span v-if="aiThinking" class="ai-thinking">正在思考…</span>
    </div>

    <!-- 采访对象选择 -->
    <div v-if="!sessionId" class="setup-section">
      <div class="section-header">
        <div class="section-title">选择采访对象</div>
      </div>

      <!-- 已有采访对象列表 -->
      <div v-if="interviewees.length > 0" class="interviewee-list">
        <div
          v-for="person in interviewees"
          :key="person.id"
          class="interviewee-card"
          :class="{ active: selectedInterviewee?.id === person.id }"
          @click="selectInterviewee(person)"
        >
          <div class="avatar" :style="{ background: person.color }">
            <span class="avatar-text">{{ person.name.charAt(0) }}</span>
          </div>
          <div class="info">
            <div class="name">{{ person.name }}</div>
            <div class="meta">
              <span v-if="person.age">{{ person.age }}岁</span>
              <span v-if="person.hometown"> · {{ person.hometown }}</span>
              <span v-if="person.sessions_count"> · {{ person.sessions_count }}次</span>
            </div>
          </div>
          <van-icon v-if="selectedInterviewee?.id === person.id" name="success" color="#10b981" size="20" />
          <van-icon
            class="interviewee-delete"
            name="delete-o"
            color="var(--fv-ink-4)"
            size="18"
            @click.stop="removeInterviewee(person)"
          />
        </div>
      </div>

      <!-- 还没有采访对象 -->
      <EmptyState
        v-else
        compact
        icon="friends-o"
        title="还没有采访对象"
        desc="在下面填一位家人的称呼就能开始；录下的对话会按人物存好，随时翻回来听。"
      />

      <!-- 添加新采访对象 -->
      <div class="add-section">
        <div class="section-subtitle">或添加新采访对象</div>
        <van-form @submit="addInterviewee">
          <van-cell-group inset>
            <van-field
              v-model="newInterviewee.name"
              name="name"
              label="称呼"
              placeholder="例如：爸爸、妈妈、爷爷"
              required
            />
            <van-field
              v-model="newInterviewee.age"
              name="age"
              label="年龄"
              type="number"
              placeholder="例如：55"
            />
            <van-field
              v-model="newInterviewee.hometown"
              name="hometown"
              label="籍贯"
              placeholder="例如：湖北武汉"
            />
            <van-field
              v-model="newInterviewee.relationship"
              name="relationship"
              label="关系"
              placeholder="例如：父亲、母亲"
            />
          </van-cell-group>
          <div style="margin: 16px">
            <van-button round block type="primary" native-type="submit">
              添加
            </van-button>
          </div>
        </van-form>
      </div>

      <!-- 开始采访按钮 -->
      <div v-if="selectedInterviewee" class="start-section">
        <van-button
          type="primary"
          block
          round
          size="large"
          class="start-btn"
          @click="startInterview"
        >
          开始采访 {{ selectedInterviewee.name }}
        </van-button>
      </div>
    </div>

    <!-- 采访对话界面 -->
    <template v-else>
      <!-- 采访对象信息 -->
      <div class="interviewee-info">
        <div class="avatar" :style="{ background: selectedInterviewee.color }">
          <span class="avatar-text">{{ selectedInterviewee.name.charAt(0) }}</span>
        </div>
        <div class="info-content">
          <div class="name">{{ selectedInterviewee.name }}</div>
          <div class="meta">
            {{ selectedInterviewee.age }}岁 · {{ selectedInterviewee.hometown }}
            <span v-if="recordingDuration" class="duration">
              {{ formatDuration(recordingDuration) }}
            </span>
          </div>
        </div>
        <van-button size="small" round @click="endInterview">结束</van-button>
      </div>

      <!-- 对话区域 -->
      <div class="chat-area" ref="chatArea">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message-item', message.role, { 'is-question': message.kind === 'question' }]"
        >
          <div v-if="message.role === 'ai' && message.kind !== 'question'" class="message-avatar ai-avatar">AI</div>
          <div class="message-content">
            <div v-if="message.kind === 'question'" class="question-card">
              <div class="question-label">
                <van-icon name="question-o" size="13" /> 采访提纲
              </div>
              <div class="question-text">{{ message.text }}</div>
              <div class="question-skip" @click="skipQuestion">跳过这题，换下一个</div>
            </div>
            <div v-else class="message-bubble" :class="message.role">{{ message.text }}</div>
            <audio
              v-if="message.audioUrl"
              :src="message.audioUrl"
              controls
              preload="none"
              class="voice-audio"
            />
            <div class="message-time">{{ message.time }}</div>
          </div>
        </div>

        <!-- AI 思考中 -->
        <div v-if="aiThinking" class="message-item ai">
          <div class="message-avatar ai-avatar">AI</div>
          <div class="message-content">
            <div class="message-bubble ai typing">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <!-- 录音中提示 -->
        <div v-if="isRecording" class="recording-indicator" @click="stopRecording">
          <div class="recording-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>正在录音... 点击停止</span>
          <div v-if="transcribedText" class="transcription-preview">
            {{ transcribedText }}
          </div>
        </div>

        <!-- 转文字中提示 -->
        <div v-if="isTranscribing" class="transcribing-indicator">
          <van-loading type="spinner" size="20" color="var(--fv-primary)" />
          <span>正在转文字...</span>
        </div>
      </div>

      <!-- 底部操作区 -->
      <div class="action-bar">
        <!-- 手动输入框 -->
        <div v-if="!isRecording && !isTranscribing" class="manual-input">
          <van-field
            v-model="manualInputText"
            type="textarea"
            rows="2"
            placeholder="或手动输入文字..."
            autosize
          />
          <van-button
            type="primary"
            size="small"
            :disabled="!manualInputText.trim()"
            @click="sendManualInput"
            style="margin-top: 8px"
          >
            发送
          </van-button>
        </div>

        <van-button
          v-if="!isRecording && !isTranscribing"
          type="primary"
          block
          round
          size="large"
          class="record-btn"
          @click="startRecording"
        >
          <van-icon name="audio" size="18" style="margin-right: 6px" />
          {{ speechSupported ? '点击录音' : '录音（保存为语音）' }}
        </van-button>

        <van-button
          v-else-if="isRecording"
          type="danger"
          block
          round
          size="large"
          @click="stopRecording"
        >
          <van-icon name="stop-circle-o" size="18" style="margin-right: 6px" /> 停止录音
        </van-button>

        <van-button
          v-else
          type="default"
          block
          round
          size="large"
          loading
          loading-text="处理中..."
        />
      </div>
    </template>

    <!-- 采访历史弹窗 -->
    <van-popup v-model:show="showHistory" position="bottom" round :style="{ height: '75%' }">
      <div class="history-panel">
        <div class="history-header">
          <h3>采访记录</h3>
          <van-icon name="cross" size="20" @click="showHistory = false" />
        </div>
        <div class="history-list">
          <div v-if="interviewSessions.length === 0" class="empty-history">
            <van-icon name="chat-o" size="48" color="#ddd" />
            <p>暂无采访记录</p>
          </div>
          <div
            v-for="session in interviewSessions"
            :key="session.id"
            class="history-card"
            @click="viewSession(session)"
          >
            <div class="history-avatar" :style="{ background: session.interviewee.color }">
              <span class="avatar-text">{{ session.interviewee.name.charAt(0) }}</span>
            </div>
            <div class="history-info">
              <div class="history-name">{{ session.interviewee.name }}</div>
              <div class="history-date">{{ session.date }}</div>
              <div class="history-stats">
                {{ session.messages.length }}条对话 · {{ formatDuration(session.duration) }}
              </div>
            </div>
            <van-icon name="arrow" color="var(--fv-ink-3)" />
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 查看历史详情弹窗 -->
    <van-popup v-model:show="showSessionDetail" position="bottom" round :style="{ height: '85%' }">
      <div class="session-detail" v-if="currentSession">
        <div class="detail-header">
          <van-icon name="arrow-left" size="20" @click="showSessionDetail = false" />
          <span>与{{ currentSession.interviewee.name }}的采访</span>
          <van-icon name="share-o" size="20" @click="shareSession" />
        </div>
        <div class="detail-meta">
          <span>{{ currentSession.date }}</span>
          <span>{{ formatDuration(currentSession.duration) }}</span>
          <span>{{ currentSession.messages.length }}条对话</span>
        </div>
        <div class="detail-messages">
          <div
            v-for="(msg, idx) in currentSession.messages"
            :key="idx"
            :class="['message-item', msg.role]"
          >
            <div class="message-avatar" :style="{ background: msg.role === 'ai' ? 'var(--fv-primary)' : '#5f7a52' }">
              <span class="avatar-text-small">{{ msg.role === 'ai' ? 'AI' : currentSession.interviewee.name.charAt(0) }}</span>
            </div>
            <div class="message-content">
              <div class="message-bubble" :class="msg.role">{{ msg.text }}</div>
              <div class="message-time">{{ msg.time }}</div>
            </div>
          </div>
        </div>
        <div class="detail-actions">
          <van-button type="primary" round block @click="exportSession">
            <van-icon name="down" style="margin-right: 6px" /> 导出采访记录
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import speechRecognizer from '@/utils/speech'
import audioRecorder from '@/utils/recorder'
import { mediaAPI } from '@/utils/api'
import { resolveMediaUrl } from '@/utils/media'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { interviewAPI } from '@/utils/api'
import { cloudChat, getCloudSession } from '@/services/cloud'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
// 统一回首页：不逐页后退，回到首页后安卓返回键可直接退出
const goHome = () => router.replace('/')

// 从 localStorage 加载采访对象
const interviewees = ref(storage.get(STORAGE_KEYS.INTERVIEWEES, []))
const aiMode = ref('demo')
const aiLabel = ref('')
const aiThinking = ref(false)
// 浏览器是否支持原生语音转文字（安卓 WebView / 微信内置浏览器通常不支持）
const speechSupported = ref(Boolean(speechRecognizer.recognition))
// 不支持转写时，改为「只录音、存成语音留言」
const audioRecordMode = ref(false)

const applyAiMode = (demo) => {
  aiMode.value = demo ? 'demo' : 'live'
}
const selectedInterviewee = ref(null)
const sessionId = ref(null)
const messages = ref([])
const isRecording = ref(false)
const isTranscribing = ref(false)
const recordingDuration = ref(0)
const chatArea = ref(null)
const transcribedText = ref('')
const manualInputText = ref('')
const showHistory = ref(false)
const showSessionDetail = ref(false)
const currentSession = ref(null)
let durationTimer = null
let currentSessionId = null

// 从 localStorage 加载采访历史
const interviewSessions = ref(storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, []))

// 新采访对象表单
const newInterviewee = ref({
  name: '',
  age: '',
  hometown: '',
  relationship: ''
})

// AI 话题库 - 通用 + 按关系分类
const topicPool = {
  general: [
    '您小时候最开心的事情是什么？',
    '您还记得小时候住在哪里吗？那个地方现在变成什么样了？',
    '您年轻时候有什么梦想？后来实现了吗？',
    '您这辈子最骄傲的事情是什么？',
    '您经历过最艰难的时期是什么时候？怎么熬过来的？',
    '您有什么人生格言或者教训想留给后辈的？',
    '您小时候过年都有什么习俗？',
    '您觉得这些年变化最大的是什么？',
    '您最珍惜的一段回忆是什么？',
    '如果能回到过去，您最想回到哪个时刻？'
  ],
  '爷爷': [
    '爷爷，您小时候过年都吃什么？有没有什么特别的年菜？',
    '您还记得太爷爷年轻时候是做什么的吗？',
    '您小时候上学吗？那时候的学校是什么样的？',
    '您和奶奶是怎么认识的？当时是什么情况？',
    '您年轻时最拿手的本事是什么？',
    '您经历过的最难忘的一件事是什么？'
  ],
  '奶奶': [
    '奶奶，您年轻时候最喜欢做什么？',
    '您有什么拿手菜可以教教我吗？具体怎么做的？',
    '您小时候家里是什么样的条件？',
    '您和爷爷是怎么走到一起的？',
    '您带大几个孩子？那时候养孩子有什么难处？',
    '您对我们这些晚辈有什么想说的吗？'
  ],
  '爸爸': [
    '爸，您小时候最调皮的事是什么？',
    '您年轻时候有什么梦想？实现了吗？',
    '您和妈妈是怎么认识的？',
    '您工作中最难忘的经历是什么？',
    '您对我有什么期望吗？',
    '您觉得咱们家最大的变化是什么？'
  ],
  '妈妈': [
    '妈，您小时候最喜欢做什么？',
    '您和爸爸是怎么认识的？',
    '您觉得养我最大的挑战是什么？',
    '您有什么特别的家传菜吗？',
    '您年轻时候有什么遗憾的事吗？',
    '您最希望我成为什么样的人？'
  ]
}

// 格式化时长
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 保存采访对象列表
const saveInterviewees = () => {
  storage.set(STORAGE_KEYS.INTERVIEWEES, interviewees.value)
}

// 选择采访对象
const selectInterviewee = (person) => {
  selectedInterviewee.value = person
}

// 删除采访对象（TA 的采访记录一并删除）
const removeInterviewee = (person) => {
  const related = interviewSessions.value.filter(
    s => s.interviewee && s.interviewee.id === person.id
  )
  showConfirmDialog({
    title: '删除采访对象',
    message: related.length
      ? `确定删除「${person.name}」吗？\nTA 的 ${related.length} 条采访记录也会一并删除。`
      : `确定删除「${person.name}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#B4442E'
  })
    .then(() => {
      interviewees.value = interviewees.value.filter(p => p.id !== person.id)
      saveInterviewees()
      if (related.length) {
        interviewSessions.value = interviewSessions.value.filter(
          s => !(s.interviewee && s.interviewee.id === person.id)
        )
        storage.set(STORAGE_KEYS.INTERVIEW_SESSIONS, interviewSessions.value)
      }
      if (selectedInterviewee.value?.id === person.id) {
        selectedInterviewee.value = null
      }
      showToast('已删除')
    })
    .catch(() => {})
}

// 添加采访对象
const addInterviewee = () => {
  if (!newInterviewee.value.name) {
    showToast('请输入称呼')
    return
  }

  const colors = [
    'var(--fv-primary)', 'var(--fv-primary-deep)', '#ff9500', 'var(--fv-primary)',
    '#34c759', '#af52de', '#ff2d55', '#00c7be'
  ]

  const name = newInterviewee.value.name

  const newPerson = {
    id: Date.now(),
    name: name,
    age: parseInt(newInterviewee.value.age) || null,
    hometown: newInterviewee.value.hometown,
    relationship: newInterviewee.value.relationship,
    color: colors[Math.floor(Math.random() * colors.length)],
    sessions_count: 0,
    created_at: new Date().toISOString()
  }

  interviewees.value.push(newPerson)
  saveInterviewees()
  selectedInterviewee.value = newPerson
  showToast('添加成功')

  newInterviewee.value = { name: '', age: '', hometown: '', relationship: '' }
}

// 获取下一个话题
const getNextTopic = () => {
  const name = selectedInterviewee.value?.name || ''
  const topics = topicPool[name] || topicPool.general

  const askedTopics = messages.value
    .filter(m => m.role === 'ai')
    .map(m => m.text)

  const unasked = topics.filter(t => !askedTopics.some(a => a.includes(t) || t.includes(a)))

  if (unasked.length > 0) {
    return unasked[Math.floor(Math.random() * unasked.length)]
  }
  const generalUnasked = topicPool.general.filter(t => !askedTopics.some(a => a.includes(t)))
  return generalUnasked.length > 0
    ? generalUnasked[Math.floor(Math.random() * generalUnasked.length)]
    : '您还有什么想分享的故事吗？'
}

// 云大模型提示词（与服务端保持一致的行为约束；system 必须是 messages[0]）
const buildCloudSystem = (interviewee = {}) => {
  const facts = []
  if (interviewee.name) facts.push(`称呼：${interviewee.name}`)
  if (interviewee.age) facts.push(`年龄：${interviewee.age} 岁`)
  if (interviewee.hometown) facts.push(`籍贯：${interviewee.hometown}`)
  if (interviewee.relationship) facts.push(`与记录者的关系：${interviewee.relationship}`)

  return [
    '你是 FamilyVault 的 AI 采访助手，正在帮一个家庭留存长辈的口述历史。',
    `采访对象：${facts.length ? facts.join('；') : '一位家中长辈'}`,
    '要求：',
    '1. 先自然地回应对方刚说的内容（一句，具体，不要空洞的夸奖）',
    '2. 再提出下一个问题，只问一个问题，具体、有画面感（食物、声音、气味、地点、人名）',
    '3. 语气像晚辈陪长辈聊天，不说"您能详细说说吗"这种套话',
    '4. 使用简体中文，总字数不超过 80 字，分成两段，不要加"AI："之类的前缀',
    '5. 不要编造采访对象的经历，只基于他/她说过的话追问'
  ].join('\n')
}

const toCloudMessages = (history = []) =>
  history
    .slice(-20)
    .filter(m => m && m.text)
    .map(m => ({
      role: m.role === 'ai' ? 'assistant' : 'user',
      content: String(m.text).slice(0, 1000)
    }))

/** 云大模型优先；未登录云账号或调用失败时返回 null，由调用方降级 */
const requestCloudTurn = async (messagesPayload) => {
  try {
    const session = await getCloudSession()
    if (!session) return null
    const text = await cloudChat(messagesPayload, { temperature: 0.85 })
    return text?.trim() || null
  } catch (err) {
    console.warn('[cloud] 大模型调用失败，尝试其它通道', err)
    return null
  }
}

// 请求一轮 AI 回应（云大模型 → 服务端 → 本地话题库）
const requestAiTurn = async (userText) => {
  aiThinking.value = true
  scrollToBottom()
  let text = ''

  const baseMessages = toCloudMessages(messages.value.slice(0, -1))
  const cloudMessages = [
    { role: 'system', content: buildCloudSystem(selectedInterviewee.value) },
    ...baseMessages,
    { role: 'user', content: String(userText || '').slice(0, 2000) }
  ]
  const cloudText = await requestCloudTurn(cloudMessages)
  if (cloudText) {
    text = cloudText
    applyAiMode(false)
    aiLabel.value = '云端大模型'
  } else {
    try {
      const result = await interviewAPI.turn({
        interviewee: selectedInterviewee.value,
        history: messages.value.slice(0, -1),
        userText
      })
      // demo 文本是内置话术，会显得很假，直接忽略，走提纲模式
      if (result.success && result.data?.text && !result.data.demo) {
        text = result.data.text
        applyAiMode(false)
      }
    } catch (err) {
      console.warn('AI 接口不可用，使用采访提纲', err)
    }
  }

  aiThinking.value = false

  if (!text) {
    applyAiMode(true)
    pushNextQuestion()
    return
  }

  messages.value.push({ role: 'ai', text, time: getCurrentTime() })
  scrollToBottom()
}

// 没有 AI 时：只把下一个问题摆出来，不假装对话
const pushNextQuestion = () => {
  messages.value.push({
    role: 'ai',
    kind: 'question',
    text: getNextTopic(),
    time: getCurrentTime()
  })
  scrollToBottom()
}

// 跳过这一题
const skipQuestion = () => {
  pushNextQuestion()
}

// 开始采访
const startInterview = async () => {
  if (!selectedInterviewee.value) {
    showToast('请先选择采访对象')
    return
  }

  currentSessionId = Date.now()
  sessionId.value = currentSessionId
  messages.value = []
  aiThinking.value = true

  let text = ''

  const cloudText = await requestCloudTurn([
    { role: 'system', content: buildCloudSystem(selectedInterviewee.value) },
    {
      role: 'user',
      content:
        '采访刚开始。请用一句符合我们关系的招呼开场，然后问出第一个问题（例如童年、家乡、家常菜这类容易开口的话题）。'
    }
  ])
  if (cloudText) {
    text = cloudText
    applyAiMode(false)
    aiLabel.value = '云端大模型'
  } else {
    try {
      const result = await interviewAPI.opening(selectedInterviewee.value)
      if (result.success && result.data?.text && !result.data.demo) {
        text = result.data.text
        applyAiMode(false)
      }
    } catch (err) {
      console.warn('AI 接口不可用，使用采访提纲', err)
    }
  }

  aiThinking.value = false

  if (!text) {
    applyAiMode(true)
    messages.value = [
      {
        role: 'ai',
        kind: 'question',
        text: `我们照采访提纲慢慢聊，一次一个问题。回答不上来就说「跳过」。\n\n${getNextTopic()}`,
        time: getCurrentTime()
      }
    ]
    showToast('采访已开始')
    scrollToBottom()
    return
  }

  messages.value = [{ role: 'ai', text, time: getCurrentTime() }]

  showToast('采访已开始')
  scrollToBottom()
}

// 开始录音
const startRecording = async () => {
  // 不支持语音转文字：退回纯录音，照样能留下长辈的声音
  if (!speechRecognizer.recognition) {
    await startAudioOnlyRecording()
    return
  }

  isRecording.value = true
  recordingDuration.value = 0
  transcribedText.value = ''

  // 设置语音识别回调
  speechRecognizer.onStart = () => {
    console.log('语音识别已启动')
    showToast('开始录音，请说话...')
  }

  speechRecognizer.onResult = (result) => {
    // 更新实时转写文字（显示完整内容：最终+中间）
    transcribedText.value = result.full || result.final || result.interim
    console.log('转写结果:', result)
  }

  speechRecognizer.onError = (error, message) => {
    console.error('语音识别错误:', error, message)
    let errorMsg = '语音识别失败'
    if (error === 'not-allowed') {
      errorMsg = '请允许麦克风权限'
    } else if (error === 'no-speech') {
      errorMsg = '未检测到语音，请重试'
    } else if (error === 'network') {
      errorMsg = '网络错误，请检查网络'
    } else if (error === 'aborted') {
      errorMsg = '录音已取消'
    } else if (error === 'service-not-allowed') {
      errorMsg = '浏览器不支持，请用手动输入或换 Chrome'
    }
    showToast(errorMsg)
    isRecording.value = false
  }

  speechRecognizer.onEnd = (finalTranscript) => {
    console.log('语音识别结束，最终文本:', finalTranscript)
    isRecording.value = false
    // 确保最终文本被保存
    if (finalTranscript && !transcribedText.value) {
      transcribedText.value = finalTranscript
    }
  }

  // 开始录音计时
  durationTimer = setInterval(() => {
    recordingDuration.value++
  }, 1000)

  // 启动语音识别
  try {
    speechRecognizer.start()
  } catch (err) {
    console.error('启动语音识别失败:', err)
    showToast('启动语音识别失败：' + err.message)
    isRecording.value = false
  }
}

// 不支持语音转写的浏览器：用 MediaRecorder 纯录音，保存成语音留言
const startAudioOnlyRecording = async () => {
  try {
    await audioRecorder.start()
    audioRecordMode.value = true
    isRecording.value = true
    recordingDuration.value = 0
    durationTimer = setInterval(() => {
      recordingDuration.value++
    }, 1000)
    showToast('正在录音，说完点「停止录音」')
  } catch (err) {
    isRecording.value = false
    const msg = err?.name === 'NotAllowedError'
      ? '麦克风权限被拒绝，请在浏览器设置里允许后再试'
      : (err?.message || '录音启动失败')
    showToast(msg)
  }
}

const stopAudioOnlyRecording = async () => {
  let record = null
  try {
    record = await audioRecorder.stop()
  } catch {
    record = null
  }
  if (!record || !record.blob || record.blob.size < 200) {
    audioRecordMode.value = false
    isTranscribing.value = false
    showToast('没录到声音，请再试一次')
    return
  }

  const duration = record.duration || recordingDuration.value
  const ext = audioRecorder.getFileExtension()
  const file = audioRecorder.blobToFile(record.blob, `interview-${Date.now()}.${ext}`)
  const res = await mediaAPI.uploadAudio(file, duration)
  audioRecordMode.value = false
  isTranscribing.value = false

  if (!res.success) {
    showToast(res.message || '录音保存失败')
    return
  }

  const { filename, url, transcription, demo } = res.data || {}

  // 服务端配置了语音识别：直接把转写结果当作回答
  if (transcription && !demo) {
    messages.value.push({ role: 'user', text: transcription, time: getCurrentTime() })
    scrollToBottom()
    await requestAiTurn(transcription)
    recordingDuration.value = 0
    return
  }

  // 没转写就存成可回放的语音留言，然后继续问下一个问题
  const playUrl = url || (filename ? await resolveMediaUrl(filename) : null)
  messages.value.push({
    role: 'user',
    text: `语音留言 ${formatDuration(duration)}`,
    audio: filename || '',
    audioUrl: playUrl || '',
    time: getCurrentTime()
  })
  audioRecordMode.value = false
  isTranscribing.value = false
  scrollToBottom()
  pushNextQuestion()
  recordingDuration.value = 0
}

// 停止录音
const stopRecording = async () => {
  if (!isRecording.value) return

  isRecording.value = false
  isTranscribing.value = true

  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }

  if (audioRecordMode.value) {
    await stopAudioOnlyRecording()
    return
  }

  // 停止语音识别并获取最终文本
  const finalText = speechRecognizer.stop()

  // 使用转写的文字
  setTimeout(async () => {
    // 优先使用最终文本，其次使用实时转写文本
    const userText = finalText || transcribedText.value || ''

    if (!userText.trim()) {
      showToast('未识别到语音内容，请重试')
      isTranscribing.value = false
      return
    }

    messages.value.push({
      role: 'user',
      text: userText,
      time: getCurrentTime()
    })

    isTranscribing.value = false

    // AI 回复（真实接口，失败时本地兜底）
    await requestAiTurn(userText)
    recordingDuration.value = 0
  }, 1500)
}

// 发送手动输入的文字
const sendManualInput = async () => {
  if (!manualInputText.value.trim()) return

  const userInput = manualInputText.value
  messages.value.push({
    role: 'user',
    text: userInput,
    time: getCurrentTime()
  })

  manualInputText.value = ''
  scrollToBottom()

  await requestAiTurn(userInput)
}

// 结束采访 - 保存到 localStorage
const endInterview = () => {
  if (messages.value.length <= 2) {
    sessionId.value = null
    messages.value = []
    recordingDuration.value = 0
    currentSessionId = null
    showToast('采访已取消')
    return
  }

  // 创建采访记录
  const session = {
    id: currentSessionId,
    interviewee: { ...selectedInterviewee.value },
    date: new Date().toLocaleString('zh-CN'),
    timestamp: Date.now(),
    duration: recordingDuration.value,
    messages: [...messages.value]
  }

  // 保存到历史列表
  interviewSessions.value.unshift(session)
  storage.set(STORAGE_KEYS.INTERVIEW_SESSIONS, interviewSessions.value)

  // 更新采访对象的采访次数
  const person = interviewees.value.find(p => p.id === selectedInterviewee.value.id)
  if (person) {
    person.sessions_count = (person.sessions_count || 0) + 1
    saveInterviewees()
  }

  // 重置状态
  sessionId.value = null
  messages.value = []
  recordingDuration.value = 0
  currentSessionId = null
  transcribedText.value = ''

  showToast('采访已保存')
}

// 查看历史会话
const viewSession = (session) => {
  currentSession.value = session
  showHistory.value = false
  showSessionDetail.value = true
}

// 导出采访记录
const exportSession = () => {
  if (!currentSession.value) return

  const session = currentSession.value
  let text = `采访记录：${session.interviewee.name}\n`
  text += `时间：${session.date}\n`
  text += `时长：${formatDuration(session.duration)}\n`
  text += `${'='.repeat(40)}\n\n`

  session.messages.forEach(msg => {
    const role = msg.role === 'ai' ? 'AI助手' : session.interviewee.name
    text += `[${msg.time}] ${role}：${msg.text}\n\n`
  })

  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `采访记录_${session.interviewee.name}_${session.date.replace(/[/: ]/g, '-')}.txt`
  a.click()
  URL.revokeObjectURL(url)

  showToast('导出成功')
}

// 分享采访记录
const shareSession = () => {
  if (!currentSession.value) return
  const session = currentSession.value

  const text = `我刚完成了对${session.interviewee.name}的采访，记录了${session.messages.length}条对话，快来 FamilyVault 看看！`

  if (navigator.share) {
    navigator.share({ title: 'FamilyVault 采访记录', text })
  } else {
    navigator.clipboard.writeText(text)
    showToast('已复制到剪贴板')
  }
}

// 获取当前时间
const getCurrentTime = () => {
  const now = new Date()
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (chatArea.value) {
      chatArea.value.scrollTop = chatArea.value.scrollHeight
    }
  })
}

onMounted(async () => {
  // 拉取 AI 能力状态，决定是否显示演示模式提示
  try {
    const status = await interviewAPI.status()
    if (status.success) {
      aiMode.value = status.data.mode
      aiLabel.value = status.data.providerLabel || ''
    }
  } catch {
    aiMode.value = 'demo'
  }

  // 云账号可用时优先走云端大模型
  try {
    if (await getCloudSession()) {
      aiMode.value = 'live'
      aiLabel.value = '云端大模型'
    }
  } catch { /* 未连接云账号 */ }

  // 不预置任何示例采访对象：用户没加过就是空的，先让自己的家人出现在这里
})

onUnmounted(() => {
  if (durationTimer) {
    clearInterval(durationTimer)
  }
})
</script>

<style scoped>
.interview-page {
  display: flex;
  flex-direction: column;
  /* 减去底部标签栏的 50px，否则录音按钮会被标签栏压住 */
  height: calc(100vh - 50px);
  height: calc(100dvh - 50px);
  background: var(--fv-paper);
}

/* 设置区域 */
.setup-section {
  flex: 1;
  overflow-y: auto;
  padding: 20px 16px;
}

.section-header {
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--fv-ink);
  letter-spacing: -0.3px;
}

.section-subtitle {
  font-size: 13px;
  color: var(--fv-ink-3);
  margin: 24px 0 12px 0;
}

.interviewee-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.interviewee-card {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: var(--fv-surface);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1.5px solid transparent;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.interviewee-delete {
  margin-left: 12px;
  padding: 6px;
  flex-shrink: 0;
}

.interviewee-card.active {
  border-color: var(--fv-primary);
  background: var(--fv-primary-soft);
  box-shadow: 0 2px 8px rgba(0, 122, 255, 0.1);
}

.interviewee-card:active {
  transform: scale(0.98);
  background: var(--fv-surface-soft);
}

.avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.interviewee-card .info {
  margin-left: 14px;
  flex: 1;
  min-width: 0;
}

.interviewee-card .name {
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
  margin-bottom: 3px;
}

.interviewee-card .meta {
  font-size: 12px;
  color: var(--fv-ink-3);
}

.add-section {
  margin-bottom: 16px;
}

.start-section {
  margin-top: 20px;
  padding-bottom: 20px;
}

.start-btn {
  height: 50px;
  font-size: 16px;
  font-weight: 600;
  background: var(--fv-primary);
  border: none;
  border-radius: 14px;
  letter-spacing: 0.3px;
}

/* 采访界面 */
.interviewee-info {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: var(--fv-surface);
  border-bottom: 1px solid var(--fv-border-soft);
}

.info-content {
  margin-left: 14px;
  flex: 1;
}

.info-content .name {
  font-size: 16px;
  font-weight: 600;
  color: var(--fv-ink);
  margin-bottom: 3px;
}

.info-content .meta {
  font-size: 12px;
  color: var(--fv-ink-3);
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-content .duration {
  color: var(--fv-primary);
  font-weight: 600;
  font-size: 12px;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: var(--fv-paper);
}

.message-item {
  display: flex;
  margin-bottom: 14px;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.message-item.ai {
  flex-direction: row;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-avatar {
  background: var(--fv-primary);
}

.avatar-text-small {
  color: white;
  font-size: 11px;
  font-weight: 600;
}

.message-content {
  max-width: 75%;
  margin: 0 10px;
}

.message-item.user .message-content {
  text-align: right;
}

.message-bubble {
  display: inline-block;
  padding: 12px 16px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-word;
  text-align: left;
  letter-spacing: 0.2px;
}

.message-bubble.ai {
  background: var(--fv-surface);
  color: var(--fv-ink);
  border-bottom-left-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.message-bubble.user {
  background: var(--fv-primary);
  color: white;
  border-bottom-right-radius: 6px;
}

.message-time {
  font-size: 11px;
  color: var(--fv-ink-4);
  margin-top: 5px;
  padding: 0 4px;
}

/* 提纲卡片：没有 AI 时只给问题，不假装对话 */
.message-item.is-question .message-content {
  max-width: 88%;
}

.question-card {
  background: var(--fv-surface-cream, #fdf7ec);
  border: 1px solid var(--fv-border-cream);
  border-radius: 14px;
  padding: 12px 14px;
  text-align: left;
}

.question-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  letter-spacing: 0.5px;
  color: var(--fv-brass);
  margin-bottom: 6px;
}

.question-text {
  font-family: var(--fv-font-serif);
  font-size: 15px;
  line-height: 1.7;
  color: var(--fv-ink-2);
  white-space: pre-wrap;
}

.question-skip {
  margin-top: 8px;
  font-size: 12px;
  color: var(--fv-ink-4);
  text-decoration: underline;
  text-underline-offset: 3px;
  display: inline-block;
}

/* 语音留言播放器 */
.voice-audio {
  display: block;
  width: 100%;
  max-width: 240px;
  height: 36px;
  margin-top: 6px;
}

/* 录音指示器 */
.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--fv-surface);
  border-radius: 24px;
  margin: 16px auto;
  width: fit-content;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(238, 10, 36, 0.15);
  border: 1px solid rgba(238, 10, 36, 0.2);
}

.recording-indicator span {
  font-size: 13px;
  color: var(--fv-primary);
  font-weight: 500;
}

.recording-wave {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
}

.recording-wave span {
  display: block;
  width: 3px;
  background: var(--fv-primary);
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.recording-wave span:nth-child(1) { height: 8px; animation-delay: 0s; }
.recording-wave span:nth-child(2) { height: 14px; animation-delay: 0.1s; }
.recording-wave span:nth-child(3) { height: 20px; animation-delay: 0.2s; }
.recording-wave span:nth-child(4) { height: 14px; animation-delay: 0.3s; }
.recording-wave span:nth-child(5) { height: 8px; animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% { transform: scaleY(0.5); }
  50% { transform: scaleY(1); }
}

.transcription-preview {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 8px;
  font-size: 13px;
  color: var(--fv-ink);
  max-width: 280px;
  text-align: left;
  line-height: 1.5;
  word-break: break-all;
}

.transcribing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px;
  background: var(--fv-surface);
  border-radius: 20px;
  margin: 16px auto;
  width: fit-content;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.transcribing-indicator span {
  font-size: 13px;
  color: var(--fv-ink-2);
}

.action-bar {
  padding: 12px 16px 16px;
  background: var(--fv-surface);
  border-top: 1px solid var(--fv-border-soft);
}

.record-btn {
  background: var(--fv-primary);
  border: none;
  height: 48px;
  font-size: 15px;
  font-weight: 500;
  margin-top: 10px;
}

.manual-input {
  margin-bottom: 10px;
}

/* 发送按钮右对齐，避免和整条录音按钮挤在一起显得乱 */
.manual-input .van-button {
  display: block;
  margin-left: auto !important;
  margin-top: 8px !important;
  padding: 0 20px;
}

.manual-input :deep(.van-field) {
  background: var(--fv-surface-soft);
  border-radius: 8px;
  padding: 10px 12px;
}

.manual-input :deep(.van-field__control) {
  font-size: 14px;
}

/* 采访历史 */
.history-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--fv-border-soft);
}

.history-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
}

.empty-history {
  text-align: center;
  padding: 60px 20px;
  color: var(--fv-ink-3);
}

.empty-history p {
  margin-top: 12px;
  font-size: 14px;
}

.history-card {
  display: flex;
  align-items: center;
  padding: 14px;
  background: var(--fv-surface);
  border-radius: 14px;
  margin-bottom: 10px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.2s;
}

.history-card:active {
  transform: scale(0.98);
  background: var(--fv-primary-soft);
}

.history-avatar {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.history-avatar .avatar-text {
  color: white;
  font-size: 18px;
  font-weight: 600;
}

.history-info {
  margin-left: 12px;
  flex: 1;
}

.history-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
}

.history-date {
  font-size: 12px;
  color: var(--fv-ink-3);
  margin-top: 2px;
}

.history-stats {
  font-size: 11px;
  color: var(--fv-ink-4);
  margin-top: 3px;
}

/* 历史详情 */
.session-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--fv-border-soft);
  font-size: 15px;
  font-weight: 600;
}

.detail-meta {
  display: flex;
  gap: 16px;
  padding: 12px 20px;
  font-size: 12px;
  color: var(--fv-ink-3);
  background: var(--fv-surface-soft);
}

.detail-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.detail-actions {
  padding: 12px 16px 24px;
  border-top: 1px solid var(--fv-border-soft);
}

/* ---------- AI 状态横幅 ---------- */
.ai-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-size: 12px;
  background: var(--fv-surface-soft);
  border-bottom: 1px solid var(--fv-border-soft);
  color: var(--fv-ink-3);
}

.ai-banner.demo {
  background: #fdf3e6;
  color: #8a5a2b;
}

.ai-banner.live {
  background: #eef4ea;
  color: #46603c;
}

.ai-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fv-brass);
  flex: none;
}

.ai-banner.live .ai-dot {
  background: #5f7a52;
}

.ai-text {
  flex: 1;
  line-height: 1.4;
}

.ai-thinking {
  color: var(--fv-primary);
  flex: none;
}

/* ---------- 打字中气泡 ---------- */
.message-bubble.typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 12px 14px;
}

.message-bubble.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--fv-ink-4);
  animation: typing-breathe 1.2s ease-in-out infinite;
}

.message-bubble.typing span:nth-child(2) {
  animation-delay: 0.15s;
}

.message-bubble.typing span:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes typing-breathe {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}
</style>
