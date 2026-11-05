import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vant 样式
import 'vant/lib/index.css'

// 全局设计系统（暖纸质主题）
import './styles/theme.css'

import { handleCloudCallback, getCloudSession } from './services/cloud'
import { startDemoCleanup } from './utils/cleanupDemo'
import { showToast } from 'vant'

// 清除早期版本内置的示例数据（按完整指纹精确匹配，用户动过的记录一律保留）。
// 必须在 mount 之前跑，页面才不会先渲染一遍假数据再闪一下。
let appMounted = false
const pendingNotices = []
const notifyCleanup = (list) => {
  const message = `已清除 ${list.join('、')}，家史里只剩你录入的内容`
  if (appMounted) {
    showToast({ message, position: 'bottom', duration: 3600 })
  } else {
    pendingNotices.push(message)
  }
}
startDemoCleanup(notifyCleanup)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// OAuth 回调必须在任何路由守卫之前处理：回调落在站点根路径，
// 被守卫打断会让一次性 code 失效，用户无法重试。
async function bootstrap() {
  let backToAbout = false
  try {
    const res = await handleCloudCallback()
    if (res?.error) console.warn('[cloud] 登录回调失败:', res.error)
    if (res?.session) {
      const url = new URL(location.href)
      if (url.searchParams.get('cloudback') === '1') {
        backToAbout = true
        sessionStorage.setItem('fv_cloud_connected', '1')
        url.searchParams.delete('cloudback')
        history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
      }
    }
  } catch (err) {
    console.warn('[cloud] 登录回调异常:', err)
  }
  try {
    await getCloudSession()
  } catch { /* 未登录是正常状态 */ }
  app.mount('#app')
  appMounted = true
  pendingNotices.forEach(message =>
    showToast({ message, position: 'bottom', duration: 3600 })
  )

  // 云账号授权回来直接回「关于」页，用户能立刻看到连接结果
  if (backToAbout) {
    router.isReady().then(() => router.replace('/about'))
  }
}

bootstrap()