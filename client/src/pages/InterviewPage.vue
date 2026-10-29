<template>
  <div class="interview-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="AI 采访" left-arrow @click-left="$router.back()" />

    <!-- 采访对象选择 -->
    <div v-if="!sessionId" class="setup-section">
      <div class="section-title">选择采访对象</div>

      <!-- 已有采访对象列表 -->
      <div v-if="interviewees.length > 0" class="interviewee-list">
        <div
          v-for="person in interviewees"
          :key="person.id"
          class="interviewee-card"
          :class="{ active: selectedInterviewee?.id === person.id }"
          @click="selectInterviewee(person)"
        >
          <van-image
            round
            width="50"
            height="50"
            :src="person.avatar || defaultAvatar"
          />
          <div class="info">
            <div class="name">{{ person.name }}</div>
            <div class="meta">{{ person.age }}岁 · {{ person.hometown }}</div>
          </div>
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
              添加并开始采访
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
        <van-image
          round
          width="50"
          height="50"
          :src="selectedInterviewee.avatar || defaultAvatar"
        />
        <div class="info-content">
          <div class="name">{{ selectedInterviewee.name }}</div>
          <div class="meta">
            {{ selectedInterviewee.age }}岁 · {{ selectedInterviewee.hometown }}
            <span v-if="recordingDuration" class="duration">
              录音 {{ formatDuration(recordingDuration) }}
            </span>
          </div>
        </div>
        <van-button size="small" @click="endInterview">结束</van-button>
      </div>

      <!-- 对话区域 -->
      <div class="chat-area" ref="chatArea">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message-item', message.role]"
        >
          <div class="message-avatar">
            <van-image
              round
              width="36"
              height="36"
              :src="message.role === 'ai' ? aiAvatar : userAvatar"
            />
          </div>
          <div class="message-content">
            <div class="message-text">{{ message.text }}</div>
            <div class="message-time">{{ message.time }}</div>
          </div>
        </div>

        <!-- 录音中提示 -->
        <div v-if="isRecording" class="recording-indicator">
          <div class="recording-wave">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>
          <span>正在录音... 点击停止</span>
        </div>

        <!-- 转文字中提示 -->
        <div v-if="isTranscribing" class="transcribing-indicator">
          <van-loading type="spinner" size="20" />
          <span>正在转文字...</span>
        </div>
      </div>

      <!-- 底部操作区 -->
      <div class="action-bar">
        <van-button
          v-if="!isRecording && !isTranscribing"
          type="primary"
          block
          round
          size="large"
          @click="startRecording"
        >
          <van-icon name="audio" size="18" /> 按住录音
        </van-button>

        <van-button
          v-else-if="isRecording"
          type="danger"
          block
          round
          size="large"
          @click="stopRecording"
        >
          <van-icon name="stop-circle-o" size="18" /> 停止录音
        </van-button>

        <van-button
          v-else
          type="default"
          block
          round
          size="large"
          loading
          loading-text="转文字中..."
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast, showLoadingToast, closeToast } from 'vant'
import audioRecorder from '@/utils/recorder'
import { interviewApi, uploadApi } from '@/services/api'

// 数据
const interviewees = ref([])
const selectedInterviewee = ref(null)
const sessionId = ref(null)
const messages = ref([])
const isRecording = ref(false)
const isTranscribing = ref(false)
const recordingDuration = ref(0)
const chatArea = ref(null)

// 新采访对象表单
const newInterviewee = ref({
  name: '',
  age: '',
  hometown: '',
  relationship: ''
})

// 头像
const defaultAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
const aiAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
const userAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'

// 格式化时长
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 选择采访对象
const selectInterviewee = (person) => {
  selectedInterviewee.value = person
}

// 添加采访对象
const addInterviewee = async () => {
  try {
    const res = await interviewApi.createInterviewee({
      name: newInterviewee.value.name,
      age: parseInt(newInterviewee.value.age) || null,
      hometown: newInterviewee.value.hometown,
      relationship: newInterviewee.value.relationship
    })

    if (res.success) {
      interviewees.value.push(res.data)
      selectedInterviewee.value = res.data
      showToast('添加成功')

      // 清空表单
      newInterviewee.value = {
        name: '',
        age: '',
        hometown: '',
        relationship: ''
      }
    }
  } catch (error) {
    showToast('添加失败：' + error.message)
  }
}

// 开始采访
const startInterview = async () => {
  if (!selectedInterviewee.value) {
    showToast('请先选择采访对象')
    return
  }

  try {
    showLoadingToast({
      message: '正在开始采访...',
      forbidClick: true
    })

    const res = await interviewApi.startSession(selectedInterviewee.value.id)

    if (res.success) {
      sessionId.value = res.data.sessionId
      messages.value = [
        {
          role: 'ai',
          text: res.data.firstTopic,
          time: getCurrentTime()
        }
      ]
      closeToast()
      showToast('采访已开始')
    }
  } catch (error) {
    closeToast()
    showToast('开始采访失败：' + error.message)
  }
}

// 开始录音
const startRecording = async () => {
  try {
    await audioRecorder.start()
    isRecording.value = true
    recordingDuration.value = 0

    // 监听时长更新
    audioRecorder.onDurationUpdate = (duration) => {
      recordingDuration.value = duration
    }

    showToast('开始录音')
  } catch (error) {
    showToast(error.message || '录音启动失败')
  }
}

// 停止录音
const stopRecording = async () => {
  try {
    isRecording.value = false
    isTranscribing.value = true

    // 停止录音并获取音频
    const { blob, duration } = await audioRecorder.stop()

    // 转换为文件
    const audioFile = audioRecorder.blobToFile(blob, `interview_${Date.now()}.webm`)

    // 上传音频并转文字
    const res = await uploadApi.uploadAudio(audioFile, duration)

    if (res.success) {
      // 添加用户消息
      const userMessage = {
        role: 'user',
        text: res.data.transcription,
        time: getCurrentTime()
      }
      messages.value.push(userMessage)

      // 发送到后端获取 AI 回复
      const replyRes = await interviewApi.sendMessage(sessionId.value, {
        text: res.data.transcription,
        audioUrl: res.data.audioUrl,
        duration: duration
      })

      if (replyRes.success) {
        // 添加 AI 回复
        setTimeout(() => {
          messages.value.push({
            role: 'ai',
            text: replyRes.data.aiReply,
            time: getCurrentTime()
          })
          scrollToBottom()
        }, 500)
      }
    }

    recordingDuration.value = 0
  } catch (error) {
    showToast('录音处理失败：' + error.message)
  } finally {
    isTranscribing.value = false
    scrollToBottom()
  }
}

// 结束采访
const endInterview = async () => {
  try {
    await interviewApi.endSession(sessionId.value)
    showToast('采访已结束')
    sessionId.value = null
    messages.value = []
    recordingDuration.value = 0
  } catch (error) {
    showToast('结束采访失败')
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

// 加载采访对象列表
const loadInterviewees = async () => {
  try {
    const res = await interviewApi.getInterviewees()
    if (res.success) {
      interviewees.value = res.data
    }
  } catch (error) {
    console.error('加载采访对象失败:', error)
  }
}

// 生命周期
onMounted(() => {
  loadInterviewees()
})

onUnmounted(() => {
  // 清理录音器
  audioRecorder.destroy()
})
</script>

<style scoped>
.interview-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f8fa;
}

/* 设置区域 */
.setup-section {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  padding-left: 4px;
}

.section-subtitle {
  font-size: 14px;
  color: #666;
  margin: 16px 0 12px 4px;
}

.interviewee-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.interviewee-card {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.interviewee-card.active {
  border-color: #07c160;
  background: #f0fff5;
}

.interviewee-card .info {
  margin-left: 12px;
  flex: 1;
}

.interviewee-card .name {
  font-size: 15px;
  font-weight: 500;
}

.interviewee-card .meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.add-section {
  margin-bottom: 16px;
}

.start-section {
  margin-top: 16px;
}

/* 采访界面 */
.interviewee-info {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #eee;
}

.info-content {
  margin-left: 12px;
  flex: 1;
}

.info-content .name {
  font-size: 15px;
  font-weight: 500;
}

.info-content .meta {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.info-content .duration {
  color: #ee0a24;
  font-weight: 500;
}

.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message-item {
  display: flex;
  margin-bottom: 16px;
}

.message-item.ai {
  flex-direction: row;
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  max-width: 70%;
  margin: 0 10px;
}

.message-item.user .message-content {
  text-align: right;
}

.message-text {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.5;
  word-break: break-word;
}

.message-item.ai .message-text {
  background: white;
  color: #333;
}

.message-item.user .message-text {
  background: #07c160;
  color: white;
}

.message-time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

/* 录音指示器 */
.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 12px 20px;
  background: rgba(238, 10, 36, 0.1);
  border-radius: 20px;
  margin: 16px auto;
  width: fit-content;
  cursor: pointer;
}

.recording-indicator span {
  font-size: 13px;
  color: #ee0a24;
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
  background: #ee0a24;
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

.transcribing-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  margin: 16px auto;
  width: fit-content;
}

.transcribing-indicator span {
  font-size: 13px;
  color: #666;
}

.action-bar {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #eee;
}
</style>