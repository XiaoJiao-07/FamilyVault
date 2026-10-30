<template>
  <div class="home-page" :class="{ 'dark-mode': isDarkMode }">
    <!-- 顶部横幅 -->
    <div class="banner">
      <div class="banner-content">
        <div class="banner-header">
          <h1 class="banner-title">FamilyVault</h1>
          <div class="banner-actions">
            <van-icon name="search" class="action-icon" @click="$router.push('/search')" />
            <van-icon
              :name="isDarkMode ? 'sun-o' : 'moon-o'"
              class="action-icon"
              @click="toggleDarkMode"
            />
          </div>
        </div>
        <p class="banner-subtitle">趁老人还能说，把家族故事永久保存</p>
        <div class="banner-stats">
          <div class="stat-item">
            <span class="stat-number">{{ stats.members }}</span>
            <span class="stat-label">家族成员</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.stories }}</span>
            <span class="stat-label">故事记录</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-number">{{ stats.locations }}</span>
            <span class="stat-label">记忆地点</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 功能入口网格 -->
    <div class="feature-grid">
      <div class="feature-card" @click="$router.push('/interview')">
        <div class="feature-icon-wrapper interview-bg">
          <van-icon name="chat-o" size="22" color="#4a5acf" />
        </div>
        <div class="feature-title">采访</div>
        <div class="feature-desc">智能引导，记录家族故事</div>
      </div>

      <div class="feature-card" @click="$router.push('/graph')">
        <div class="feature-icon-wrapper graph-bg">
          <van-icon name="cluster-o" size="22" color="#34a853" />
        </div>
        <div class="feature-title">家族图谱</div>
        <div class="feature-desc">可视化家族关系网络</div>
      </div>

      <div class="feature-card" @click="$router.push('/map')">
        <div class="feature-icon-wrapper map-bg">
          <van-icon name="location-o" size="22" color="#1a73e8" />
        </div>
        <div class="feature-title">记忆地图</div>
        <div class="feature-desc">标注家族迁徙轨迹</div>
      </div>

      <div class="feature-card" @click="$router.push('/capsule')">
        <div class="feature-icon-wrapper capsule-bg">
          <van-icon name="clock-o" size="22" color="#e8457c" />
        </div>
        <div class="feature-title">时光胶囊</div>
        <div class="feature-desc">给未来的人录一段话</div>
      </div>

      <div class="feature-card" @click="$router.push('/heirloom')">
        <div class="feature-icon-wrapper heirloom-bg">
          <van-icon name="gift-card-o" size="22" color="#e88d2a" />
        </div>
        <div class="feature-title">传家宝</div>
        <div class="feature-desc">保存家传菜谱和手艺</div>
      </div>
    </div>

    <!-- 最近采访 -->
    <div class="section">
      <div class="section-header">
        <h2 class="section-title">最近采访</h2>
        <span class="section-more" @click="$router.push('/interview')">查看全部</span>
      </div>
      <div v-if="recentActivities.length > 0" class="activity-list">
        <div v-for="(activity, index) in recentActivities" :key="index" class="activity-item">
          <div class="activity-avatar" :style="{ background: activity.color }">
            <span class="activity-avatar-text">{{ activity.avatar }}</span>
          </div>
          <div class="activity-content">
            <div class="activity-title">{{ activity.title }}</div>
            <div class="activity-desc">{{ activity.desc }}</div>
          </div>
          <div class="activity-time">{{ activity.time }}</div>
        </div>
      </div>
      <div v-else class="empty-activities">
        <p>还没有采访记录，快去记录家族故事吧</p>
      </div>
    </div>

    <!-- 家族名言 -->
    <div class="section">
      <div class="quote-card">
        <div class="quote-icon">"</div>
        <div class="quote-text">{{ dailyQuote.text }}</div>
        <div class="quote-author">—— {{ dailyQuote.author }}</div>
      </div>
    </div>

    <!-- 快速开始 -->
    <div class="section">
      <van-button class="start-btn" type="primary" block round @click="$router.push('/interview')">
        <van-icon name="edit" style="margin-right: 6px" />
        开始第一次采访
      </van-button>
    </div>

    <!-- 分享按钮 -->
    <div class="section">
      <van-button class="share-btn" plain type="default" block round @click="shareApp">
        <van-icon name="share-o" style="margin-right: 6px" />
        分享 FamilyVault
      </van-button>
    </div>

    <!-- 关于 -->
    <div class="section">
      <van-cell title="关于 FamilyVault" is-link @click="$router.push('/about')" />
    </div>

    <!-- 用户信息 -->
    <div class="section" v-if="currentUser">
      <van-cell-group inset>
        <van-cell :title="`当前用户：${currentUser.displayName}`" :label="currentUser.username">
          <template #right-icon>
            <van-button size="small" plain type="default" @click="showInviteCode = true">
              邀请码
            </van-button>
            <van-button size="small" plain type="danger" @click="logout" style="margin-left: 8px">
              退出
            </van-button>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <!-- 邀请码弹窗 -->
    <van-popup v-model:show="showInviteCode" position="bottom" round :style="{ height: '40%' }">
      <div class="invite-code-panel">
        <div class="panel-header">
          <h3>邀请码管理</h3>
          <van-icon name="cross" size="20" @click="showInviteCode = false" />
        </div>
        <div class="panel-content">
          <van-button type="primary" block round @click="generateCode" :loading="generating">
            生成新邀请码
          </van-button>
          <div v-if="generatedCode" class="code-result">
            <p>邀请码：</p>
            <div class="code-display">{{ generatedCode }}</div>
            <p class="code-hint">有效期 7 天，可使用 1 次</p>
            <van-button size="small" plain type="primary" @click="copyCode">
              复制
            </van-button>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { authAPI } from '@/utils/api'

const router = useRouter()
const isDarkMode = ref(false)
const currentUser = ref(null)
const showInviteCode = ref(false)
const generatedCode = ref('')
const generating = ref(false)

const toggleDarkMode = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', isDarkMode.value)
  document.documentElement.classList.toggle('dark', isDarkMode.value)
}

const logout = async () => {
  await authAPI.logout()
  showToast('已退出登录')
  router.push('/login')
}

const generateCode = async () => {
  generating.value = true
  try {
    const result = await authAPI.generateInvitationCode()
    if (result.success) {
      generatedCode.value = result.code
      showToast('生成成功')
    } else {
      showToast(result.message || '生成失败')
    }
  } catch (err) {
    showToast('生成失败：' + err.message)
  } finally {
    generating.value = false
  }
}

const copyCode = () => {
  navigator.clipboard.writeText(generatedCode.value).then(() => {
    showToast('已复制')
  }).catch(() => {
    showToast('复制失败，请手动复制')
  })
}

const shareApp = async () => {
  const shareData = {
    title: 'FamilyVault - 家庭记忆操作系统',
    text: '快来和我一起记录家族故事，保存珍贵回忆！',
    url: window.location.origin
  }

  if (navigator.share) {
    try {
      await navigator.share(shareData)
      showToast('分享成功')
    } catch (err) {
      if (err.name !== 'AbortError') {
        copyToClipboard(shareData.url)
      }
    }
  } else {
    copyToClipboard(shareData.url)
  }
}

const copyToClipboard = (text) => {
  navigator.clipboard.writeText(text).then(() => {
    showToast('链接已复制，快分享给家人吧！')
  }).catch(() => {
    showToast('请手动复制链接：' + text)
  })
}

onMounted(() => {
  const savedMode = localStorage.getItem('darkMode')
  if (savedMode === 'true') {
    isDarkMode.value = true
    document.documentElement.classList.add('dark')
  }
  loadStats()
  currentUser.value = authAPI.getCurrentUser()
})

const stats = ref({
  members: 0,
  stories: 0,
  locations: 0
})

const recentActivities = ref([])

// 从 localStorage 加载统计数据
const loadStats = () => {
  const members = storage.get(STORAGE_KEYS.FAMILY_MEMBERS, [])
  const sessions = storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, [])
  const locations = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, [])

  stats.value = {
    members: members.length || 0,
    stories: sessions.length || 0,
    locations: locations.length || 0
  }

  // 最近采访记录
  recentActivities.value = sessions.slice(0, 3).map(s => ({
    avatar: s.interviewee.name.charAt(0),
    title: `采访${s.interviewee.name}`,
    desc: `${s.messages.length} 条对话 · ${formatDuration(s.duration)}`,
    time: s.date,
    color: s.interviewee.color
  }))
}

const formatDuration = (seconds) => {
  if (!seconds) return '0分钟'
  const mins = Math.floor(seconds / 60)
  if (mins < 1) return `${seconds}秒`
  return `${mins}分钟`
}

const dailyQuote = ref({
  text: '一粥一饭，当思来处不易；半丝半缕，恒念物力维艰。',
  author: '曾祖父家训'
})
</script>

<style scoped>
.home-page {
  padding: 0;
  background: #f7f8fa;
  min-height: 100vh;
}

.banner {
  background: linear-gradient(135deg, #007aff 0%, #5856d6 100%);
  padding: 24px 20px 28px;
  position: relative;
  overflow: hidden;
}

.banner::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -20%;
  width: 200px;
  height: 200px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.banner::after {
  content: '';
  position: absolute;
  bottom: -30%;
  left: -10%;
  width: 150px;
  height: 150px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.banner-content {
  position: relative;
  z-index: 1;
}

.banner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.banner-actions {
  display: flex;
  gap: 12px;
}

.action-icon {
  font-size: 20px;
  color: white;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: background 0.2s;
}

.action-icon:active {
  background: rgba(255, 255, 255, 0.2);
}

.banner-title {
  font-size: 26px;
  font-weight: 700;
  color: white;
  margin: 0;
  letter-spacing: 1px;
}

.banner-subtitle {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin: 0 0 20px;
}

.banner-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 12px 0;
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: white;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 2px;
}

.stat-divider {
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.3);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding: 16px;
}

.feature-card {
  background: white;
  border-radius: 14px;
  padding: 16px 10px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
}

.feature-card:active {
  transform: scale(0.95);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
}

.feature-icon-wrapper {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.interview-bg { background: linear-gradient(135deg, #e8eaf6, #c5cae9); }
.graph-bg { background: linear-gradient(135deg, #e8f5e9, #c8e6c9); }
.map-bg { background: linear-gradient(135deg, #e3f2fd, #bbdefb); }
.capsule-bg { background: linear-gradient(135deg, #fce4ec, #f8bbd0); }
.heirloom-bg { background: linear-gradient(135deg, #fff3e0, #ffe0b2); }

.feature-icon {
  font-size: 22px;
}

.feature-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  margin-bottom: 3px;
}

.feature-desc {
  font-size: 10px;
  color: #999;
  line-height: 1.3;
}

.section {
  padding: 0 16px;
  margin-bottom: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.section-more {
  font-size: 13px;
  color: #007aff;
  cursor: pointer;
}

.activity-list {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.activity-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.activity-avatar-text {
  color: white;
  font-size: 16px;
  font-weight: 600;
}

.activity-content {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.activity-title {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 3px;
}

.activity-desc {
  font-size: 12px;
  color: #999;
}

.activity-time {
  font-size: 11px;
  color: #bbb;
  flex-shrink: 0;
  margin-left: 8px;
}

.quote-card {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  border-radius: 14px;
  padding: 20px;
  position: relative;
}

.quote-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.5);
  position: absolute;
  top: 8px;
  left: 16px;
  font-family: Georgia, serif;
  line-height: 1;
}

.quote-text {
  font-size: 14px;
  color: #5d4037;
  line-height: 1.7;
  position: relative;
  z-index: 1;
  padding-top: 16px;
}

.quote-author {
  font-size: 12px;
  color: #8d6e63;
  text-align: right;
  margin-top: 8px;
}

.start-btn {
  height: 48px;
  font-size: 15px;
  font-weight: 500;
  background: #007aff;
  border: none;
}

.share-btn {
  height: 44px;
  font-size: 14px;
  margin-top: 12px;
}

/* 暗色模式 */
.home-page.dark-mode {
  background: #1a1a1a;
}

.dark-mode .feature-card {
  background: #2a2a2a;
}

.dark-mode .feature-title {
  color: #e0e0e0;
}

.dark-mode .feature-desc {
  color: #888;
}

.dark-mode .section-title {
  color: #e0e0e0;
}

.dark-mode .activity-list {
  background: #2a2a2a;
}

.dark-mode .activity-item {
  border-bottom-color: #333;
}

.dark-mode .activity-title {
  color: #e0e0e0;
}

.dark-mode .activity-desc {
  color: #888;
}

.dark-mode .activity-time {
  color: #666;
}

.dark-mode .quote-card {
  background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
}

.dark-mode .quote-text {
  color: #e0e0e0;
}

.dark-mode .quote-author {
  color: #aaa;
}

.empty-activities {
  text-align: center;
  padding: 24px 16px;
  color: #999;
  font-size: 14px;
}

.empty-activities p {
  margin: 0;
}

.invite-code-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.panel-content {
  padding: 20px;
  flex: 1;
}

.code-result {
  margin-top: 20px;
  text-align: center;
}

.code-result p {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px;
}

.code-display {
  font-size: 24px;
  font-weight: 700;
  color: #007aff;
  background: #f0f7ff;
  padding: 16px;
  border-radius: 12px;
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.code-hint {
  font-size: 12px;
  color: #999;
  margin-bottom: 16px;
}
</style>
