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

// 家庭空间（家人共享同一份家史库）
export const familyAPI = {
  async get() {
    try {
      const data = await request.get('/family')
      return { success: true, family: data.data, role: data.role }
    } catch (error) {
      return { success: false, message: errorMessage(error, '获取家庭信息失败') }
    }
  },

  async rename(name) {
    try {
      const data = await request.put('/family', { name })
      return { success: true, family: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, '改名失败') }
    }
  },

  async join(code) {
    try {
      const data = await request.post('/family/join', { code })
      return { success: true, family: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, '加入失败') }
    }
  },

  async rotateInvite() {
    try {
      const data = await request.post('/family/invite/rotate')
      return { success: true, family: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, '重置邀请码失败') }
    }
  }
}

// AI 采访（服务端生成话题，未配置大模型时返回 demo 标记）
export const interviewAPI = {
  async status() {
    try {
      const data = await request.get('/interview/ai-status')
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, data: { mode: 'demo' }, message: errorMessage(error, '获取 AI 状态失败') }
    }
  },

  async opening(interviewee) {
    try {
      const data = await request.post('/interview/opening', { interviewee })
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, 'AI 暂时不可用') }
    }
  },

  async turn({ interviewee, history, userText }) {
    try {
      const data = await request.post('/interview/turn', { interviewee, history, userText })
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, 'AI 暂时不可用') }
    }
  }
}

// 媒体上传（家庭内可见，返回带签名的临时链接）
export const mediaAPI = {
  async uploadImage(file) {
    try {
      const form = new FormData()
      form.append('image', file)
      const data = await request.post('/upload/image', form)
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, '上传失败') }
    }
  },

  async uploadAudio(file, duration = 0) {
    try {
      const form = new FormData()
      form.append('audio', file)
      form.append('duration', String(duration))
      const data = await request.post('/upload/audio', form)
      return { success: true, data: data.data }
    } catch (error) {
      return { success: false, message: errorMessage(error, '上传失败') }
    }
  },

  async sign(names) {
    try {
      const data = await request.get('/upload/sign', {
        params: { names: names.join(',') }
      })
      return { success: true, urls: data.urls, expiresIn: data.expiresIn }
    } catch (error) {
      return { success: false, urls: {}, message: errorMessage(error, '签名失败') }
    }
  }
}
