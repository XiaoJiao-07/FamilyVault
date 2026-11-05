<template>
  <div class="welcome-page">
    <!-- 跳过按钮 -->
    <div class="skip-btn" @click="skipWelcome">
      跳过 <van-icon name="arrow" />
    </div>

    <!-- 轮播内容 -->
    <van-swipe ref="swipeRef" class="welcome-swipe" :show-indicator="false" @change="onSwipeChange">
      <!-- 第一屏：欢迎 -->
      <van-swipe-item>
        <div class="welcome-content">
          <div class="welcome-icon">
            <!-- 品牌记号：玉璧·传家（红绳系璧） -->
            <svg class="jade-logo" viewBox="0 0 100 100" aria-hidden="true">
              <defs>
                <radialGradient id="jade-plate-welcome" cx="0.5" cy="0.42" r="0.72">
                  <stop offset="0" stop-color="#BFD2C4" />
                  <stop offset="1" stop-color="#82A08E" />
                </radialGradient>
              </defs>
              <!-- 玉环：外圆 + 内孔 -->
              <circle cx="50" cy="50" r="33" fill="url(#jade-plate-welcome)" stroke="#608270" stroke-width="2.5" />
              <circle cx="50" cy="50" r="13" fill="#fffdf8" stroke="#608270" stroke-width="2" />
              <!-- 乳钉纹 -->
              <g fill="#D8E6DC">
                <circle cx="69.9" cy="61.5" r="3.2" />
                <circle cx="50" cy="73" r="3.2" />
                <circle cx="30.1" cy="61.5" r="3.2" />
                <circle cx="30.1" cy="38.5" r="3.2" />
                <circle cx="50" cy="27" r="3.2" />
                <circle cx="69.9" cy="38.5" r="3.2" />
              </g>
              <!-- 红绳：穿孔 + 结 + 双股穗 -->
              <line x1="50" y1="6" x2="50" y2="65" stroke="#B4442E" stroke-width="4.5" stroke-linecap="round" />
              <circle cx="50" cy="69" r="5" fill="#9E3626" />
              <circle cx="50" cy="67.5" r="2" fill="#B4442E" />
              <line x1="50" y1="73" x2="45.5" y2="88" stroke="#B4442E" stroke-width="2.5" stroke-linecap="round" />
              <line x1="50" y1="73" x2="54.5" y2="88" stroke="#B4442E" stroke-width="2.5" stroke-linecap="round" />
              <circle cx="45.5" cy="88.5" r="1.8" fill="#9E3626" />
              <circle cx="54.5" cy="88.5" r="1.8" fill="#9E3626" />
            </svg>
          </div>
          <h1 class="welcome-title">FamilyVault</h1>
          <h2 class="welcome-subtitle">家史馆</h2>
          <p class="welcome-desc">
            趁老人还能说<br>
            把家族故事永久保存
          </p>
        </div>
      </van-swipe-item>

      <!-- 第二屏：AI 采访 -->
      <van-swipe-item>
        <div class="welcome-content">
          <div class="welcome-icon">
            <van-icon name="chat-o" size="64" color="var(--fv-primary)" />
          </div>
          <h2 class="feature-title">AI 智能采访</h2>
          <p class="feature-desc">
            AI 根据老人背景自动生成话题<br>
            像聊天一样自然记录家族故事<br>
            支持语音录音 + 实时转文字
          </p>
          <div class="feature-preview">
            <div class="chat-bubble ai">爸，您小时候过年都吃什么？</div>
            <div class="chat-bubble user">那时候穷，能吃到肉就不错了...</div>
          </div>
        </div>
      </van-swipe-item>

      <!-- 第三屏：家族图谱 -->
      <van-swipe-item>
        <div class="welcome-content">
          <div class="welcome-icon">
            <van-icon name="cluster-o" size="64" color="var(--fv-graph)" />
          </div>
          <h2 class="feature-title">家族知识图谱</h2>
          <p class="feature-desc">
            可视化家族关系网络<br>
            从对话中自动提取人物、地点、事件<br>
            支持自然语言查询
          </p>
          <div class="feature-preview">
            <div class="graph-preview">
              <span class="node">曾祖父</span>
              <span class="line">—</span>
              <span class="node">曾祖母</span>
            </div>
          </div>
        </div>
      </van-swipe-item>

      <!-- 第四屏：记忆地图 -->
      <van-swipe-item>
        <div class="welcome-content">
          <div class="welcome-icon">
            <van-icon name="location-o" size="64" color="var(--fv-map)" />
          </div>
          <h2 class="feature-title">记忆地图</h2>
          <p class="feature-desc">
            在地图上标注家族故事发生地<br>
            可视化家族迁徙路线<br>
            按时间轴筛选不同年代的记忆
          </p>
        </div>
      </van-swipe-item>

      <!-- 第五屏：时光胶囊 -->
      <van-swipe-item>
        <div class="welcome-content">
          <div class="welcome-icon">
            <van-icon name="clock-o" size="64" color="var(--fv-capsule)" />
          </div>
          <h2 class="feature-title">时光胶囊</h2>
          <p class="feature-desc">
            给未来的人录一段话<br>
            设定日期解锁<br>
            端到端加密，到时间自动推送
          </p>
        </div>
      </van-swipe-item>

      <!-- 第六屏：开始使用 -->
      <van-swipe-item>
        <div class="welcome-content">
          <div class="welcome-icon">
            <van-icon name="star" size="64" color="var(--fv-brass)" />
          </div>
          <h2 class="feature-title">准备好了吗？</h2>
          <p class="feature-desc">
            每一次对话都是珍贵的记忆<br>
            每一个故事都值得被记录<br>
            让我们开始吧！
          </p>
          <van-button type="primary" block round size="large" @click="startUsing">
            开始使用 FamilyVault
          </van-button>
        </div>
      </van-swipe-item>
    </van-swipe>

    <!-- 指示器 -->
    <div class="indicator">
      <span
        v-for="i in 6"
        :key="i"
        class="dot"
        :class="{ active: currentSlide === i - 1 }"
        @click="goToSlide(i - 1)"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const swipeRef = ref(null)
const currentSlide = ref(0)

const onSwipeChange = (index) => {
  currentSlide.value = index
}

const goToSlide = (index) => {
  swipeRef.value?.swipeTo(index)
}

const skipWelcome = () => {
  localStorage.setItem('welcomeShown', 'true')
  router.push('/login')
}

const startUsing = () => {
  localStorage.setItem('welcomeShown', 'true')
  router.push('/login')
}
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}

.skip-btn {
  position: absolute;
  top: 20px;
  right: 20px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
  cursor: pointer;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
}

.welcome-swipe {
  height: 100vh;
}

/* 强制隐藏 van-swipe 自带指示器，只保留自定义圆点 */
.welcome-swipe :deep(.van-swipe__indicators) {
  display: none !important;
}

.welcome-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 30px;
  text-align: center;
  color: white;
}

.welcome-icon {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}

.welcome-title {
  font-size: 36px;
  font-weight: 700;
  margin: 0 0 8px;
  letter-spacing: 2px;
}

.welcome-subtitle {
  font-size: 18px;
  font-weight: 400;
  margin: 0 0 30px;
  opacity: 0.9;
}

.welcome-desc {
  font-size: 16px;
  line-height: 1.8;
  opacity: 0.95;
  margin: 0;
}

.feature-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 20px;
}

.feature-desc {
  font-size: 15px;
  line-height: 1.8;
  opacity: 0.9;
  margin: 0 0 30px;
}

.feature-preview {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  width: 100%;
  max-width: 300px;
}

.chat-bubble {
  padding: 10px 14px;
  border-radius: 12px;
  margin: 8px 0;
  font-size: 13px;
  text-align: left;
}

.chat-bubble.ai {
  background: rgba(255, 255, 255, 0.2);
  margin-right: 40px;
}

.chat-bubble.user {
  background: rgba(255, 255, 255, 0.3);
  margin-left: 40px;
}

.graph-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
}

.graph-preview .node {
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 12px;
  border-radius: 8px;
}

.graph-preview .line {
  opacity: 0.5;
}

.indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 10;
}

.dot {
  position: relative;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  transition: all 0.3s;
}

/* 扩大点击热区，方便手指点按 */
.dot::after {
  content: '';
  position: absolute;
  inset: -9px;
}

.dot.active {
  width: 24px;
  border-radius: 4px;
  background: white;
}

/* ================= 暖纸质主题覆写 ================= */
.welcome-page {
  background:
    radial-gradient(120% 65% at 50% -10%, var(--fv-paper-glow) 0%, rgba(255, 251, 242, 0) 62%),
    radial-gradient(80% 50% at 100% 102%, rgba(201, 154, 91, 0.22), rgba(201, 154, 91, 0) 62%),
    var(--fv-paper);
}

.skip-btn {
  top: calc(20px + env(safe-area-inset-top));
  color: var(--fv-ink-3);
}

.welcome-content {
  color: var(--fv-ink);
}

.welcome-icon {
  width: 84px;
  height: 84px;
  border-radius: 22px;
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
  box-shadow:
    inset 0 0 0 2px rgba(255, 246, 234, 0.5),
    0 16px 30px -18px rgba(156, 56, 38, 0.55);
  backdrop-filter: none;
  margin-bottom: 26px;
}

.jade-logo {
  width: 76px;
  height: 76px;
  display: block;
}

.welcome-title {
  font-family: var(--fv-font-serif);
  color: var(--fv-ink);
  font-size: 34px;
  letter-spacing: 0.2em;
  text-indent: 0.2em;
}

.welcome-subtitle {
  color: var(--fv-primary);
  opacity: 1;
  font-size: 16px;
  letter-spacing: 0.16em;
}

.welcome-desc {
  color: var(--fv-ink-2);
  font-family: var(--fv-font-serif);
  font-size: 15px;
  line-height: 2;
  opacity: 1;
}

.feature-title {
  font-family: var(--fv-font-serif);
  color: var(--fv-ink);
  letter-spacing: 0.08em;
  font-size: 22px;
}

.feature-desc {
  color: var(--fv-ink-3);
  opacity: 1;
  font-size: 14px;
  line-height: 1.9;
}

.feature-preview {
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
  border-radius: 18px;
  box-shadow: var(--fv-shadow);
  backdrop-filter: none;
}

.chat-bubble.ai {
  background: var(--fv-surface-soft);
  border: 1px solid var(--fv-border);
  color: var(--fv-ink-2);
}

.chat-bubble.user {
  background: var(--fv-primary-soft);
  border: 1px solid var(--fv-border-warm);
  color: var(--fv-ink);
}

.graph-preview .node {
  background: var(--fv-brass-soft);
  border: 1px solid var(--fv-border);
  color: var(--fv-ink-2);
}

.graph-preview .line {
  opacity: 0.45;
  color: var(--fv-ink-3);
}

.dot {
  background: rgba(43, 33, 25, 0.16);
}

.dot.active {
  background: var(--fv-primary);
}
</style>
