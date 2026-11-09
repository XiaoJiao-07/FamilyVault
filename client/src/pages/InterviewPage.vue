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
            {{ intervieweeMeta }}
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
          <div v-if="message.role === 'ai' && message.kind !== 'question'" class="message-avatar ai-avatar">采</div>
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
          <span>正在把录音转成文字…</span>
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
          点击录音
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

    <!-- 采访结束后：给这段故事标一个年份 -->
    <van-popup v-model:show="showYearAsk" position="bottom" round :close-on-click-overlay="false">
      <div class="year-ask">
        <div class="ya-head">
          <h3>这段故事，是哪一年的事？</h3>
          <p>标上年份，它就能进「家族年轮」，和家人的出生、搬迁排在同一条线上。</p>
        </div>
        <div v-if="yearSuggestions.length" class="ya-chips">
          <span class="ya-chip-label">原话里提到过</span>
          <span
            v-for="y in yearSuggestions"
            :key="y"
            class="ya-chip"
            :class="{ active: String(yearDraft) === String(y) }"
            @click="pickYear(y)"
          >{{ y }}</span>
        </div>
        <div class="ya-input">
          <input
            v-model="yearDraft"
            type="tel"
            inputmode="numeric"
            maxlength="4"
            placeholder="比如 1980"
          />
          <span>年</span>
        </div>
        <div class="ya-foot">
          <van-button round block type="primary" @click="saveYear">就用这一年</van-button>
          <van-button round block plain @click="skipYear">说不好，先跳过</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import speechRecognizer from '@/utils/speech'
import audioRecorder from '@/utils/recorder'
import { mediaAPI } from '@/utils/api'
import { resolveMediaUrl } from '@/utils/media'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { interviewAPI } from '@/utils/api'
import { cloudChat, getCloudSession } from '@/services/cloud'
import EmptyState from '@/components/EmptyState.vue'
import { guessStoryYear, suggestStoryYears, normalizeStoryYear } from '@/utils/storyYear'

const router = useRouter()
// 统一回首页：不逐页后退，回到首页后安卓返回键可直接退出
const goHome = () => router.replace('/')

// 从 localStorage 加载采访对象
const interviewees = ref(storage.get(STORAGE_KEYS.INTERVIEWEES, []))
const aiMode = ref('demo')
const aiLabel = ref('')
const aiThinking = ref(false)

const applyAiMode = (demo) => {
  aiMode.value = demo ? 'demo' : 'live'
}
const selectedInterviewee = ref(null)

// 顶部信息行：空字段不留下多余的“·”
const intervieweeMeta = computed(() => {
  const p = selectedInterviewee.value || {}
  return [p.age ? `${p.age}岁` : '', p.hometown || '', p.relationship || '']
    .filter(Boolean)
    .join(' · ')
})
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
const showYearAsk = ref(false)
const yearDraft = ref('')
const yearSuggestions = ref([])
let pendingYearSessionId = null
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
    '你是家里晚辈请来的“采访助手”，正在帮一个家庭把长辈讲的事原样留下来。',
    `采访对象：${facts.length ? facts.join('；') : '一位家中长辈'}`,
    '要求：',
    '1. 开头先轻轻接一句对方刚说的具体内容（不超过 15 字），不要夸奖、不要感叹，不要重复对方原话',
    '2. 然后只问一个问题，问得具体、有画面感（哪一年、哪道菜、谁在场、什么声音），不要问笼统的大问题',
    '3. 语气像晚辈陪长辈唠家常，用“您”，不用书面语，不说“您能详细说说吗”“这真是一段宝贵的回忆”这类套话',
    '4. 简体中文，总共不超过 60 字，只用一个问号，不要分段编号，不要加“AI：”之类前缀',
    '5. 不要编造对方的经历，不要替对方回答，不要总结人生道理',
    '6. 不要再问之前已经聊过的话题（下面历史里出现过的内容就跳过）'
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
// 统一路径：**先确保真的在录音**（MediaRecorder，任何浏览器都有），
// 浏览器原生语音识别只作为「边说边出字」的实时预览——安卓国内大多调不通，
// 不通也不影响结果，停止后交给服务端识别。
const startRecording = async () => {
  if (isRecording.value) return

  transcribedText.value = ''
  isRecording.value = true
  recordingDuration.value = 0

  durationTimer = setInterval(() => {
    recordingDuration.value++
    // 单次识别上限 5 分钟，提前提醒分段
    if (recordingDuration.value === 240) {
      showToast('已录 4 分钟，建议先停下，分几段讲更好整理')
    }
  }, 1000)

  try {
    await audioRecorder.start()
  } catch (err) {
    stopDurationTimer()
    isRecording.value = false
    const msg = err?.name === 'NotAllowedError'
      ? '麦克风权限被拒绝，请在浏览器设置里允许后再试'
      : (err?.message || '录音启动失败')
    showToast(msg)
    return
  }

  // 实时预览（可选能力，失败静默）
  if (speechRecognizer.recognition) {
    speechRecognizer.onResult = (result) => {
      transcribedText.value = result.full || result.final || result.interim || ''
    }
    speechRecognizer.onError = (error) => {
      console.warn('[speech] 原生识别不可用，改用服务端识别:', error)
    }
    speechRecognizer.onStart = () => {}
    speechRecognizer.onEnd = () => {}
    try {
      speechRecognizer.start()
    } catch {
      /* 实时预览失败不影响录音 */
    }
  }
}

const stopDurationTimer = () => {
  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }
}

// 停止录音：先停原生识别（拿实时文本作参考），再上传录音由服务端转写
const stopRecording = async () => {
  if (!isRecording.value) return

  isRecording.value = false
  isTranscribing.value = true
  stopDurationTimer()

  let liveText = ''
  try {
    const finalText = speechRecognizer.stop()
    liveText = String(finalText || transcribedText.value || '').trim()
  } catch {
    liveText = String(transcribedText.value || '').trim()
  }

  let record = null
  try {
    record = await audioRecorder.stop()
  } catch (err) {
    console.warn('[record] 停止录音失败:', err)
  }

  // 录得太短 / 没录到：有实时文本就先用上
  if (!record || !record.blob || record.blob.size < 200) {
    isTranscribing.value = false
    recordingDuration.value = 0
    if (liveText) {
      messages.value.push({ role: 'user', text: liveText, time: getCurrentTime() })
      scrollToBottom()
      await requestAiTurn(liveText)
    } else {
      showToast('没录到声音，请再试一次')
    }
    return
  }

  const duration = record.duration || recordingDuration.value
  const ext = audioRecorder.getFileExtension()
  const file = audioRecorder.blobToFile(record.blob, `interview-${Date.now()}.${ext}`)

  // 原声本身就是重要资料，先落库；转写在服务端完成
  const res = await mediaAPI.uploadAudio(file, duration)
  isTranscribing.value = false
  recordingDuration.value = 0

  if (!res.success) {
    if (liveText) {
      messages.value.push({ role: 'user', text: liveText, time: getCurrentTime() })
      scrollToBottom()
      await requestAiTurn(liveText)
      return
    }
    showToast(res.message || '录音保存失败')
    return
  }

  const { filename, url, transcription, skipped } = res.data || {}
  const text = String(transcription || '').trim() || liveText

  // 识别出文字：文字 + 原声都留下
  if (text) {
    messages.value.push({
      role: 'user',
      text,
      audio: filename || '',
      audioUrl: url || '',
      time: getCurrentTime()
    })
    scrollToBottom()
    await requestAiTurn(text)
    return
  }

  // 没识别出文字：保留语音留言，继续下一题
  if (skipped === 'too_long') {
    showToast('这段较长，原声已保存；建议每段控制在 5 分钟内')
  }
  messages.value.push({
    role: 'user',
    text: `语音留言 ${formatDuration(duration)}`,
    audio: filename || '',
    audioUrl: url || '',
    time: getCurrentTime()
  })
  scrollToBottom()
  pushNextQuestion()
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

  // 记下这段故事发生在哪一年：猜一个给用户点，不替他决定，也不逼他答
  const guess = guessStoryYear(session)
  yearSuggestions.value = suggestStoryYears(session).filter(y => y !== guess)
  yearDraft.value = guess ? String(guess) : ''
  pendingYearSessionId = session.id
  showYearAsk.value = true

  // 重置状态
  sessionId.value = null
  messages.value = []
  recordingDuration.value = 0
  currentSessionId = null
  transcribedText.value = ''

  showToast('采访已保存')
}

// 把年份写回刚存下的那段记录（走 storage，云端会跟着同步）
const writeStoryYear = (year) => {
  const list = storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, [])
  if (!Array.isArray(list)) return false
  const idx = list.findIndex(s => s && String(s.id) === String(pendingYearSessionId))
  if (idx < 0) return false
  list[idx] = { ...list[idx], storyYear: year }
  storage.set(STORAGE_KEYS.INTERVIEW_SESSIONS, list)
  interviewSessions.value = list
  return true
}

const skipYear = () => {
  pendingYearSessionId = null
  showYearAsk.value = false
}

const saveYear = () => {
  const y = normalizeStoryYear(yearDraft.value)
  if (!y) {
    showToast('填一个四位数年份，比如 1980')
    return
  }
  if (!writeStoryYear(y)) {
    showToast('没找到那段记录，请到故事记录里补')
  } else {
    showToast(`已记为 ${y} 年的事`)
  }
  pendingYearSessionId = null
  showYearAsk.value = false
}

const pickYear = (y) => {
  yearDraft.value = String(y)
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
  height: calc(100vh - 54px);
  height: calc(100dvh - 54px);
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

/* ---------- 故事年份 ---------- */
.year-ask {
  padding: 22px 20px 24px;
}

.ya-head h3 {
  margin: 0 0 8px;
  font-family: var(--fv-font-serif);
  font-size: 18px;
  color: var(--fv-ink);
}

.ya-head p {
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--fv-ink-3);
}

.ya-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.ya-chip-label {
  font-size: 11px;
  color: var(--fv-ink-4);
}

.ya-chip {
  padding: 5px 12px;
  border-radius: 14px;
  font-size: 13px;
  color: var(--fv-ink-2);
  background: var(--fv-surface-cream);
  border: 1px solid var(--fv-border-cream);
  font-family: var(--fv-font-serif);
  cursor: pointer;
}

.ya-chip.active {
  color: #fff;
  background: var(--fv-primary);
  border-color: var(--fv-primary);
}

.ya-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 0 14px;
  height: 52px;
  border-radius: 14px;
  background: var(--fv-paper);
  border: 1px solid var(--fv-border);
}

.ya-input input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 20px;
  letter-spacing: 0.08em;
  color: var(--fv-ink);
  font-family: var(--fv-font-serif);
}

.ya-input input::placeholder {
  font-size: 15px;
  letter-spacing: 0;
  color: var(--fv-ink-4);
}

.ya-input span {
  font-size: 14px;
  color: var(--fv-ink-3);
}

.ya-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
