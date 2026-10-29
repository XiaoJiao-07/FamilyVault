<template>
  <div class="interview-page">
    <!-- 顶部导航 -->
    <van-nav-bar title="AI 采访" left-arrow @click-left="$router.back()" />

    <!-- 采访对象信息 -->
    <div class="interviewee-info" v-if="interviewee">
      <van-image
        round
        width="60"
        height="60"
        :src="interviewee.avatar || defaultAvatar"
      />
      <div class="info-content">
        <div class="name">{{ interviewee.name }}</div>
        <div class="meta">{{ interviewee.age }}岁 · {{ interviewee.hometown }}</div>
      </div>
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
        <van-loading type="spinner" />
        <span>正在录音...</span>
      </div>
    </div>

    <!-- 底部操作区 -->
    <div class="action-bar">
      <van-button
        v-if="!isRecording"
        type="primary"
        block
        round
        @click="startRecording"
        :disabled="!canStartInterview"
      >
        <van-icon name="audio" /> 开始录音
      </van-button>

      <van-button
        v-else
        type="danger"
        block
        round
        @click="stopRecording"
      >
        <van-icon name="stop-circle-o" /> 停止录音
      </van-button>

      <div class="action-tips" v-if="!isRecording && messages.length === 0">
        提示：AI 会根据老人的背景自动生成采访话题
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { showToast } from 'vant'

const interviewee = ref({
  name: '爸爸',
  age: 55,
  hometown: '湖北武汉',
  avatar: null
})

const messages = ref([])
const isRecording = ref(false)
const chatArea = ref(null)

const defaultAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
const aiAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'
const userAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'

const canStartInterview = computed(() => {
  return interviewee.value && interviewee.value.name
})

// 模拟 AI 生成的话题
const aiTopics = [
  '爸，您小时候过年都吃什么？有没有什么特别的年菜？',
  '您还记得爷爷年轻时候是做什么工作的吗？',
  '您小时候住在哪里？那个地方现在变成什么样了？',
  '您和妈是怎么认识的？',
  '您这辈子最骄傲的事情是什么？'
]

let currentTopicIndex = 0

const startRecording = async () => {
  isRecording.value = true
  showToast('开始录音')

  // 模拟 AI 生成第一个话题
  setTimeout(() => {
    addMessage('ai', aiTopics[currentTopicIndex])
    currentTopicIndex++
  }, 1000)
}

const stopRecording = async () => {
  isRecording.value = false
  showToast('录音已保存')

  // 模拟用户回复
  setTimeout(() => {
    addMessage('user', '（这里是录音转文字的内容）')

    // AI 继续下一个话题
    setTimeout(() => {
      if (currentTopicIndex < aiTopics.length) {
        addMessage('ai', aiTopics[currentTopicIndex])
        currentTopicIndex++
      } else {
        addMessage('ai', '今天的采访就到这里，感谢您的分享！')
      }
    }, 1500)
  }, 500)
}

const addMessage = (role, text) => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  messages.value.push({
    role,
    text,
    time
  })

  nextTick(() => {
    if (chatArea.value) {
      chatArea.value.scrollTop = chatArea.value.scrollHeight
    }
  })
}

onMounted(() => {
  // 初始化欢迎消息
  addMessage('ai', `您好！我是 FamilyVault 的 AI 采访助手。今天我们来聊聊${interviewee.value.name}的故事。`)
})
</script>

<style scoped>
.interview-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f7f8fa;
}

.interviewee-info {
  display: flex;
  align-items: center;
  padding: 16px;
  background: white;
  border-bottom: 1px solid #eee;
}

.info-content {
  margin-left: 12px;
}

.name {
  font-size: 16px;
  font-weight: 500;
}

.meta {
  font-size: 13px;
  color: #999;
  margin-top: 4px;
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

.recording-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  margin: 16px auto;
  width: fit-content;
}

.recording-indicator span {
  margin-left: 8px;
  font-size: 13px;
  color: #ee0a24;
}

.action-bar {
  padding: 12px 16px;
  background: white;
  border-top: 1px solid #eee;
}

.action-tips {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}
</style>