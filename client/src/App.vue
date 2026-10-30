<template>
  <div class="app-container">
    <router-view v-slot="{ Component, route }">
      <transition name="fade-slide" mode="out-in">
        <keep-alive>
          <component :is="Component" :key="route.path" />
        </keep-alive>
      </transition>
    </router-view>

    <!-- 底部导航栏 -->
    <van-tabbar v-model="activeTab" route>
      <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item icon="chat-o" to="/interview">采访</van-tabbar-item>
      <van-tabbar-item icon="cluster-o" to="/graph">图谱</van-tabbar-item>
      <van-tabbar-item icon="location-o" to="/map">地图</van-tabbar-item>
      <van-tabbar-item icon="clock-o" to="/capsule">胶囊</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const activeTab = ref(0)
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
