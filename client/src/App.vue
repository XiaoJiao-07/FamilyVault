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
    <van-tabbar v-if="!hideTabbar" :model-value="activeTab" @change="onTabChange">
      <van-tabbar-item
        v-for="tab in tabs"
        :key="tab.path"
        :name="tab.path"
        :icon="tab.icon"
      >
        {{ tab.label }}
      </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const tabs = [
  { path: '/', icon: 'home-o', label: '首页' },
  { path: '/interview', icon: 'chat-o', label: '采访' },
  { path: '/graph', icon: 'cluster-o', label: '图谱' },
  { path: '/map', icon: 'location-o', label: '地图' },
  { path: '/capsule', icon: 'clock-o', label: '胶囊' }
]

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
  const hit = tabs.find(t => t.path === route.path)
  return hit ? hit.path : '/'
})

// 标签页之间用 replace，不往历史里堆栈：
// 这样在任意标签页按安卓返回键都能直接退出，而不是一页页往回退
const onTabChange = (path) => {
  if (path === route.path) return
  router.replace(path)
}

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
  background-color: var(--fv-paper);
  color: var(--fv-ink);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.app-container {
  min-height: 100vh;
  padding-bottom: 54px;
}

.app-container.no-tabbar {
  padding-bottom: 0;
}

/* 底部导航：图标放大一点，手机上一眼能认出来。
   Vant 自己的 .van-tabbar-item__icon 会覆盖同名类名，这里用变量 + 更高权重双保险 */
.van-tabbar {
  --van-tabbar-height: 54px;
  --van-tabbar-item-icon-size: 27px;
  --van-tabbar-item-text-font-size: 12px;
}

.van-tabbar .van-tabbar-item__icon,
.van-tabbar .van-tabbar-item__icon .van-icon {
  font-size: 27px;
  margin-bottom: 3px;
}

.van-tabbar .van-tabbar-item__text {
  font-size: 12px;
  line-height: 1.25;
}

.van-tabbar .van-tabbar-item--active .van-tabbar-item__text {
  font-weight: 600;
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
