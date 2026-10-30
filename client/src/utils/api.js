// API 工具 - 处理认证和数据同步

// 模拟后端 API（后续可替换为真实接口）
const MOCK_DELAY = 300

// 本地存储键
const AUTH_TOKEN_KEY = 'familyvault_auth_token'
const CURRENT_USER_KEY = 'familyvault_current_user'

// 模拟用户数据库（实际应该在云端）
const getUsersDB = () => {
  const db = localStorage.getItem('familyvault_users_db')
  return db ? JSON.parse(db) : { users: [], codes: [] }
}

const saveUsersDB = (db) => {
  localStorage.setItem('familyvault_users_db', JSON.stringify(db))
}

// 生成简单 token
const generateToken = () => {
  return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// 生成邀请码
const generateInvitationCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// 简单密码哈希（实际应该用 bcrypt 等安全算法）
const hashPassword = (password) => {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

export const authAPI = {
  // 登录
  async login(username, password) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    
    const db = getUsersDB()
    const user = db.users.find(u => u.username === username)
    
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    
    if (user.passwordHash !== hashPassword(password)) {
      return { success: false, message: '密码错误' }
    }
    
    // 生成 token
    const token = generateToken()
    user.token = token
    user.lastLoginAt = new Date().toISOString()
    saveUsersDB(db)
    
    // 保存到本地
    localStorage.setItem(AUTH_TOKEN_KEY, token)
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({
      id: user.id,
      username: user.username,
      displayName: user.displayName
    }))
    
    return { success: true, user: { username: user.username, displayName: user.displayName } }
  },
  
  // 注册
  async register({ username, displayName, password, invitationCode }) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    
    const db = getUsersDB()
    
    // 检查用户名是否已存在
    if (db.users.some(u => u.username === username)) {
      return { success: false, message: '用户名已存在' }
    }
    
    // 验证邀请码
    const code = db.codes.find(c => c.code === invitationCode && c.isActive)
    if (!code) {
      return { success: false, message: '邀请码无效' }
    }
    
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      return { success: false, message: '邀请码已过期' }
    }
    
    if (code.currentUses >= code.maxUses) {
      return { success: false, message: '邀请码已达到使用次数上限' }
    }
    
    // 创建用户
    const newUser = {
      id: 'user_' + Date.now(),
      username,
      displayName,
      passwordHash: hashPassword(password),
      invitationCodeUsed: invitationCode,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: null,
      token: null
    }
    
    db.users.push(newUser)
    
    // 更新邀请码使用次数
    code.currentUses += 1
    if (code.currentUses >= code.maxUses) {
      code.isActive = false
    }
    
    saveUsersDB(db)
    
    return { success: true, message: '注册成功' }
  },
  
  // 登出
  async logout() {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (token) {
      const db = getUsersDB()
      const user = db.users.find(u => u.token === token)
      if (user) {
        user.token = null
        saveUsersDB(db)
      }
    }
    
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(CURRENT_USER_KEY)
    
    return { success: true }
  },
  
  // 检查登录状态
  async checkAuth() {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    const userStr = localStorage.getItem(CURRENT_USER_KEY)
    
    if (!token || !userStr) {
      return { loggedIn: false }
    }
    
    const db = getUsersDB()
    const user = db.users.find(u => u.token === token)
    
    if (!user) {
      localStorage.removeItem(AUTH_TOKEN_KEY)
      localStorage.removeItem(CURRENT_USER_KEY)
      return { loggedIn: false }
    }
    
    const userData = JSON.parse(userStr)
    return { loggedIn: true, user: userData }
  },
  
  // 生成邀请码（管理员功能）
  async generateInvitationCode(maxUses = 1, expiresDays = 7) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      return { success: false, message: '未登录' }
    }
    
    const db = getUsersDB()
    const currentUser = db.users.find(u => u.token === token)
    
    if (!currentUser) {
      return { success: false, message: '用户不存在' }
    }
    
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresDays)
    
    const newCode = {
      id: 'code_' + Date.now(),
      code: generateInvitationCode(),
      createdBy: currentUser.id,
      maxUses,
      currentUses: 0,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      isActive: true
    }
    
    db.codes.push(newCode)
    saveUsersDB(db)
    
    return { success: true, code: newCode.code, expiresAt: newCode.expiresAt }
  },
  
  // 获取当前用户信息
  getCurrentUser() {
    const userStr = localStorage.getItem(CURRENT_USER_KEY)
    return userStr ? JSON.parse(userStr) : null
  }
}

// 数据同步 API
export const syncAPI = {
  // 上传数据
  async uploadData(key, value) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      return { success: false, message: '未登录' }
    }
    
    const db = getUsersDB()
    const user = db.users.find(u => u.token === token)
    
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    
    // 存储用户数据（简化版，实际应该在单独的表）
    const dataKey = `user_data_${user.id}_${key}`
    localStorage.setItem(dataKey, JSON.stringify({
      value,
      syncedAt: new Date().toISOString(),
      version: 1
    }))
    
    return { success: true }
  },
  
  // 下载数据
  async downloadData(key) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      return { success: false, message: '未登录' }
    }
    
    const db = getUsersDB()
    const user = db.users.find(u => u.token === token)
    
    if (!user) {
      return { success: false, message: '用户不存在' }
    }
    
    const dataKey = `user_data_${user.id}_${key}`
    const dataStr = localStorage.getItem(dataKey)
    
    if (!dataStr) {
      return { success: true, data: null }
    }
    
    const data = JSON.parse(dataStr)
    return { success: true, data: data.value }
  },
  
  // 同步所有数据
  async syncAllData(localData) {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      return { success: false, message: '未登录' }
    }
    
    // 上传本地数据
    for (const [key, value] of Object.entries(localData)) {
      await this.uploadData(key, value)
    }
    
    // 下载云端数据（简化版，直接返回本地数据）
    return { success: true, remoteData: localData }
  }
}

// 检查是否需要登录
export const requireAuth = (to, from, next) => {
  authAPI.checkAuth().then(result => {
    if (result.loggedIn) {
      next()
    } else {
      next('/login')
    }
  })
}
