import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'

// Vant 样式
import 'vant/lib/index.css'

// 全局设计系统（暖纸质主题）
import './styles/theme.css'

import { handleCloudCallback, getCloudSession } from './services/cloud'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// OAuth 回调必须在任何路由守卫之前处理：回调落在站点根路径，
// 被守卫打断会让一次性 code 失效，用户无法重试。
async function bootstrap() {
  try {
    const res = await handleCloudCallback()
    if (res?.error) console.warn('[cloud] 登录回调失败:', res.error)
  } catch (err) {
    console.warn('[cloud] 登录回调异常:', err)
  }
  try {
    await getCloudSession()
  } catch { /* 未登录是正常状态 */ }
  app.mount('#app')
}

bootstrap()