<template>
  <div class="app-container" :class="{ 'no-tabbar': hideTabbar }">
    <router-view v-slot="{ Component, route }">
      <transition name="fade-slide" mode="out-in">
        <keep-alive>
          <component :is="Component" :key="route.path" />
        </keep-alive>
      </transition>
    </router-view>

    <!-- 底部导航栏：登录/欢迎等独立页面不显示 -->
    <van-tabbar v-if="!hideTabbar" v-model="activeTab" route>
      <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item icon="chat-o" to="/interview">采访</van-tabbar-item>
      <van-tabbar-item icon="cluster-o" to="/graph">图谱</van-tabbar-item>
      <van-tabbar-item icon="location-o" to="/map">地图</van-tabbar-item>
      <van-tabbar-item icon="clock-o" to="/capsule">胶囊</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const activeTab = ref(0)
const route = useRoute()

// 路由 meta.hideTabbar 优先，其次兜底独立页面
const hideTabbar = computed(() => {
  if (route.meta?.hideTabbar) return true
  return ['/login', '/welcome'].includes(route.path)
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  background-color: #f7f8fa;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  min-height: 100vh;
  padding-bottom: 50px;
}

.app-container.no-tabbar {
  padding-bottom: 0;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}

::-webkit-scrollbar-thumb {
  background: #ddd;
  border-radius: 2px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

/* 页面切换动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(15px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-15px);
}
</style>
