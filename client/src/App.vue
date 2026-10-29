<template>
  <div class="app-container">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" />
      </keep-alive>
    </router-view>

    <!-- 底部导航栏 -->
    <van-tabbar v-model="activeTab" route>
      <van-tabbar-item icon="home-o" to="/">首页</van-tabbar-item>
      <van-tabbar-item icon="chat-o" to="/interview">采访</van-tabbar-item>
      <van-tabbar-item icon="cluster-o" to="/graph">图谱</van-tabbar-item>
      <van-tabbar-item icon="map-o" to="/map">地图</van-tabbar-item>
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f7f8fa;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  min-height: 100vh;
  padding-bottom: 50px;
}
</style>