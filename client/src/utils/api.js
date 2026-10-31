// API 工具 - 认证与数据同步（对接 /api/auth 与 /api/data）
import axios from 'axios'

const TOKEN_KEY = 'familyvault_auth_token'
const USER_KEY = 'familyvault_current_user'

const request = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      clearSession()
    }
    return Promise.reject(error)
  }
)

function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function saveSession({ token, user }) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
}

function errorMessage(error, fallback) {
  return error.response?.data?.message || fallback
}

export const authAPI = {
  // 登录
  async login(username, password) {
    try {
      const data = await request.post('/auth/login', { username, password })
      saveSession(data)
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, message: errorMessage(error, '登录失败，请稍后重试') }
    }
  },

  // 注册（成功后直接返回 token，免二次登录）
  async register({ username, displayName, password, invitationCode }) {
    try {
      const data = await request.post('/auth/register', {
        username,
        displayName,
        password,
        invitationCode
      })
      saveSession(data)
      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, message: errorMessage(error, '注册失败，请稍后重试') }
    }
  },

  // 登出
  async logout() {
    try {
      await request.post('/auth/logout')
    } catch {
      // 忽略网络异常，本地会话必须清理
    }
    clearSession()
    return { success: true }
  },

  // 检查登录状态
  async checkAuth() {
    if (!localStorage.getItem(TOKEN_KEY)) {
      return { loggedIn: false }
    }
    try {
      const data = await request.get('/auth/me')
      saveSession({ user: data.user })
      return { loggedIn: true, user: data.user }
    } catch {
      clearSession()
      return { loggedIn: false }
    }
  },

  // 生成邀请码
  async generateInvitationCode(maxUses = 1, expiresDays = 7) {
    try {
      const data = await request.post('/auth/invitation-codes', { maxUses, expiresDays })
      return { success: true, code: data.code, expiresAt: data.expiresAt }
    } catch (error) {
      return { success: false, message: errorMessage(error, '生成失败，请稍后重试') }
    }
  },

  // 获取当前用户信息（本地缓存，同步返回）
  getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY)
    if (!userStr) return null
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  },

  isLoggedIn() {
    return Boolean(localStorage.getItem(TOKEN_KEY))
  }
}

// 数据同步 API
export const syncAPI = {
  async uploadData(key, value) {
    try {
      await request.put(`/data/${encodeURIComponent(key)}`, { value })
      return { success: true }
    } catch (error) {
      return { success: false, message: errorMessage(error, '上传失败') }
    }
  },

  async downloadData(key) {
    try {
      const data = await request.get(`/data/${encodeURIComponent(key)}`)
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, '下载失败') }
    }
  },

  async syncAllData(localData) {
    try {
      for (const [key, value] of Object.entries(localData)) {
        await request.put(`/data/${encodeURIComponent(key)}`, { value })
      }
      return { success: true, remoteData: localData }
    } catch (error) {
      return { success: false, message: errorMessage(error, '同步失败') }
    }
  }
}
