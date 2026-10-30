// 本地存储管理工具

class StorageManager {
  constructor() {
    this.prefix = 'familyvault_'
  }

  // 设置数据
  set(key, value) {
    try {
      const storageKey = this.prefix + key
      localStorage.setItem(storageKey, JSON.stringify(value))
      return true
    } catch (err) {
      console.error('Storage set error:', err)
      return false
    }
  }

  // 获取数据
  get(key, defaultValue = null) {
    try {
      const storageKey = this.prefix + key
      const item = localStorage.getItem(storageKey)
      return item ? JSON.parse(item) : defaultValue
    } catch (err) {
      console.error('Storage get error:', err)
      return defaultValue
    }
  }

  // 删除数据
  remove(key) {
    try {
      const storageKey = this.prefix + key
      localStorage.removeItem(storageKey)
      return true
    } catch (err) {
      console.error('Storage remove error:', err)
      return false
    }
  }

  // 清空所有数据
  clear() {
    try {
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      return true
    } catch (err) {
      console.error('Storage clear error:', err)
      return false
    }
  }

  // 获取所有数据（用于导出）
  getAll() {
    const data = {}
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(this.prefix)) {
          const shortKey = key.substring(this.prefix.length)
          data[shortKey] = JSON.parse(localStorage.getItem(key))
        }
      }
    } catch (err) {
      console.error('Storage getAll error:', err)
    }
    return data
  }

  // 批量设置数据（用于导入）
  setAll(data) {
    try {
      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value)
      })
      return true
    } catch (err) {
      console.error('Storage setAll error:', err)
      return false
    }
  }
}

// 创建单例
const storage = new StorageManager()

// 预定义的存储键
export const STORAGE_KEYS = {
  // 家族成员
  FAMILY_MEMBERS: 'family_members',
  // 家族关系
  FAMILY_RELATIONSHIPS: 'family_relationships',
  // 采访对象
  INTERVIEWEES: 'interviewees',
  // 采访会话
  INTERVIEW_SESSIONS: 'interview_sessions',
  // 采访消息
  INTERVIEW_MESSAGES: 'interview_messages',
  // 记忆地点
  MEMORY_LOCATIONS: 'memory_locations',
  // 时光胶囊
  TIME_CAPSULES: 'time_capsules',
  // 传家宝
  HEIRLOOMS: 'heirlooms',
  // 用户设置
  USER_SETTINGS: 'user_settings',
  // 欢迎页已显示
  WELCOME_SHOWN: 'welcome_shown',
  // 暗色模式
  DARK_MODE: 'dark_mode',
  // 搜索历史
  SEARCH_HISTORY: 'search_history'
}

// 响应式存储（配合 Vue 的 reactive）
export function createReactiveStorage(key, defaultValue) {
  return {
    get value() {
      return storage.get(key, defaultValue)
    },
    set value(newValue) {
      storage.set(key, newValue)
    }
  }
}

export default storage
