<template>
  <div class="interview-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="采访" left-arrow @click-left="$router.back()">
      <template #right>
        <van-icon name="clock-o" size="20" @click="showHistory = true" />
      </template>
    </van-nav-bar>

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
        </div>
      </div>

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
          :class="['message-item', message.role]"
        >
          <div v-if="message.role === 'ai'" class="message-avatar ai-avatar">AI</div>
          <div class="message-content">
            <div class="message-bubble" :class="message.role">{{ message.text }}</div>
            <div class="message-time">{{ message.time }}</div>
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
          <van-icon name="audio" size="18" style="margin-right: 6px" /> 点击录音
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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast } from 'vant'
import speechRecognizer from '@/utils/speech'
import storage, { STORAGE_KEYS } from '@/utils/storage'

// 从 localStorage 加载采访对象
const interviewees = ref(storage.get(STORAGE_KEYS.INTERVIEWEES, []))
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

// 根据用户输入生成回应 - 更自然的对话风格
const generateResponse = (userText) => {
  const text = userText

  // 更自然的回应，带语气词和情感
  const responseMap = [
    { keywords: ['相亲', '介绍', '媒人'], responses: ['哦，相亲认识的啊', '那时候相亲挺正式的吧', '原来是相亲认识的'] },
    { keywords: ['结婚', '婚礼', '办酒'], responses: ['那时候婚礼肯定很热闹', '办酒席一定很忙吧', '结婚那天肯定很难忘'] },
    { keywords: ['上学', '读书', '学校'], responses: ['那时候上学不容易啊', '读书条件艰苦吧', '能上学就很好了'] },
    { keywords: ['工作', '上班', '干活'], responses: ['那时候工作可没现在轻松', '肯定吃了不少苦', '干活累吧'] },
    { keywords: ['孩子', '养大', '带大'], responses: ['带孩子真不容易', '几个孩子都带大了，厉害', '养孩子辛苦啊'] },
    { keywords: ['困难', '艰难', '苦'], responses: ['那段日子确实难', '挺过来就不容易', '苦日子都过去了'] },
    { keywords: ['开心', '高兴', '快乐'], responses: ['那挺好的', '听起来不错', '开心就好'] },
    { keywords: ['菜', '做饭', '拿手'], responses: ['听着就好吃', '怎么做的啊', '教教我呗'] },
    { keywords: ['过年', '春节'], responses: ['过年最热闹了', '那时候过年有意思', '年味浓吧'] },
    { keywords: ['爷爷', '奶奶', '祖'], responses: ['老一辈的故事啊', '他们那时候不容易', '老人家故事多'] },
    { keywords: ['爸爸', '妈妈', '父', '母'], responses: ['父母那辈人辛苦', '他们对你好吗', '跟爸妈关系怎么样'] },
    { keywords: ['变化', '以前', '现在'], responses: ['变化确实大', '现在跟以前不一样了', '这些年改变得多'] }
  ]

  // 查找匹配
  for (const item of responseMap) {
    if (item.keywords.some(k => text.includes(k))) {
      const responses = item.responses
      return responses[Math.floor(Math.random() * responses.length)]
    }
  }

  // 更自然的默认回应
  const defaults = [
    '嗯，然后呢',
    '后来怎么样了',
    '哦哦',
    '这样啊',
    '嗯嗯',
    '明白了',
    '继续说',
    '还有吗',
    '真的啊',
    '那挺好的'
  ]

  return defaults[Math.floor(Math.random() * defaults.length)]
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

// 开始采访
const startInterview = () => {
  if (!selectedInterviewee.value) {
    showToast('请先选择采访对象')
    return
  }

  currentSessionId = Date.now()
  sessionId.value = currentSessionId
  const firstTopic = getNextTopic()

  messages.value = [
    {
      role: 'ai',
      text: `${selectedInterviewee.value.name}您好！我是 FamilyVault 的 AI 采访助手。今天我们来聊聊您的故事，请您慢慢讲，不着急。`,
      time: getCurrentTime()
    },
    {
      role: 'ai',
      text: firstTopic,
      time: getCurrentTime()
    }
  ]

  showToast('采访已开始')
  scrollToBottom()
}

// 开始录音
const startRecording = () => {
  // 检查浏览器支持
  if (!speechRecognizer.recognition) {
    showToast('浏览器不支持语音，请用手动输入或换 Chrome/Edge')
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

// 停止录音
const stopRecording = () => {
  if (!isRecording.value) return

  isRecording.value = false
  isTranscribing.value = true

  if (durationTimer) {
    clearInterval(durationTimer)
    durationTimer = null
  }

  // 停止语音识别并获取最终文本
  const finalText = speechRecognizer.stop()

  // 使用转写的文字
  setTimeout(() => {
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

    // AI 回复
    setTimeout(() => {
      const userText = messages.value[messages.value.length - 1].text
      const response = generateResponse(userText)
      const nextTopic = getNextTopic()

      messages.value.push({
        role: 'ai',
        text: `${response}\n\n${nextTopic}`,
        time: getCurrentTime()
      })

      recordingDuration.value = 0
      scrollToBottom()
    }, 800)
  }, 1500)
}

// 发送手动输入的文字
const sendManualInput = () => {
  if (!manualInputText.value.trim()) return

  messages.value.push({
    role: 'user',
    text: manualInputText.value,
    time: getCurrentTime()
  })

  const userInput = manualInputText.value
  manualInputText.value = ''
  scrollToBottom()

  // AI 回复
  setTimeout(() => {
    const response = generateResponse(userInput)
    const nextTopic = getNextTopic()

    messages.value.push({
      role: 'ai',
      text: response + '\n\n' + nextTopic,
      time: getCurrentTime()
    })
    scrollToBottom()
  }, 1000)
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

onMounted(() => {
  // 初始化默认采访对象（如果是首次使用且为空）
  if (interviewees.value.length === 0) {
    const defaults = [
      {
        id: 1,
        name: '爷爷',
        age: 74,
        hometown: '湖北武汉',
        relationship: '祖父',
        color: 'var(--fv-primary)',
        sessions_count: 0,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: '奶奶',
        age: 72,
        hometown: '四川成都',
        relationship: '祖母',
        color: '#af52de',
        sessions_count: 0,
        created_at: new Date().toISOString()
      },
      {
        id: 3,
        name: '爸爸',
        age: 46,
        hometown: '湖北武汉',
        relationship: '父亲',
        color: 'var(--fv-primary-deep)',
        sessions_count: 0,
        created_at: new Date().toISOString()
      }
    ]
    interviewees.value = defaults
    saveInterviewees()
  }
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
  height: 100vh;
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
</style>
