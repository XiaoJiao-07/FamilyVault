<template>
  <div class="home-page">
    <!-- 顶部横幅 -->
    <div class="banner">
      <h1 class="banner-title">FamilyVault</h1>
      <p class="banner-subtitle">家史馆 · 开源家庭记忆操作系统</p>
    </div>

    <!-- 功能入口网格 -->
    <div class="feature-grid">
      <div class="feature-card" @click="$router.push('/interview')">
        <div class="feature-icon">🎙️</div>
        <div class="feature-title">AI 采访</div>
        <div class="feature-desc">智能引导，记录家族故事</div>
      </div>

      <div class="feature-card" @click="$router.push('/graph')">
        <div class="feature-icon">🌳</div>
        <div class="feature-title">家族图谱</div>
        <div class="feature-desc">可视化家族关系网络</div>
      </div>

      <div class="feature-card" @click="$router.push('/map')">
        <div class="feature-icon">🗺️</div>
        <div class="feature-title">记忆地图</div>
        <div class="feature-desc">标注家族迁徙轨迹</div>
      </div>

      <div class="feature-card" @click="$router.push('/capsule')">
        <div class="feature-icon">💊</div>
        <div class="feature-title">时光胶囊</div>
        <div class="feature-desc">给未来的人录一段话</div>
      </div>

      <div class="feature-card" @click="$router.push('/heirloom')">
        <div class="feature-icon">📜</div>
        <div class="feature-title">传家宝</div>
        <div class="feature-desc">保存家传菜谱和手艺</div>
      </div>
    </div>

    <!-- 最近活动 -->
    <div class="section">
      <h2 class="section-title">最近活动</h2>
      <van-empty v-if="!recentActivities.length" description="还没有活动记录" />
      <van-cell-group v-else inset>
        <van-cell
          v-for="(activity, index) in recentActivities"
          :key="index"
          :title="activity.title"
          :label="activity.time"
          :icon="activity.icon"
        />
      </van-cell-group>
    </div>

    <!-- 快速开始 -->
    <div class="section">
      <h2 class="section-title">快速开始</h2>
      <van-button type="primary" block @click="$router.push('/interview')">
        开始第一次采访
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const recentActivities = ref([])
</script>

<style scoped>
.home-page {
  padding: 16px;
}

.banner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 32px 20px;
  border-radius: 12px;
  margin-bottom: 20px;
  text-align: center;
}

.banner-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.banner-subtitle {
  font-size: 14px;
  opacity: 0.9;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.feature-card {
  background: white;
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.2s;
}

.feature-card:active {
  transform: scale(0.96);
}

.feature-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.feature-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.feature-desc {
  font-size: 12px;
  color: #999;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 12px;
  padding-left: 4px;
}
</style>