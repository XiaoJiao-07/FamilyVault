// 数据存储层：本地缓存 + 云端同步（家庭为单位）
//
// 设计要点：
// 1. 读永远是同步的（走 localStorage），页面代码无需改成 async —— 这是零侵入改造的关键
// 2. 写立刻落本地，再防抖推服务端；断网/未登录时自动退化为纯本地，不报错
// 3. 登录后调用 hydrate() 拉取家人在云端的数据，服务端为准
// 4. 冲突（家人同时改同一个 key）按“数组按 id 求并集、其余取服务端”合并后重试一次

const PREFIX = 'familyvault_'
const TOKEN_KEY = 'familyvault_auth_token'
const META_KEY = 'familyvault__sync_meta'
const SYNC_DELAY = 500

// 只属于当前设备的偏好，不参与家庭共享
const LOCAL_ONLY = new Set(['welcome_shown', 'dark_mode', 'search_history', 'user_settings'])

function readMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta))
  } catch {
    /* 忽略配额异常 */
  }
}

function token() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

/** 合并两份数组数据：以服务端为准，只保留本地独有的记录（按 id 去重） */
function mergeArrays(serverValue, localValue) {
  if (!Array.isArray(serverValue) || !Array.isArray(localValue)) return null

  const idOf = (item) => (item && (item.id ?? item.key ?? item.code)) || null
  const hasIds = serverValue.every(idOf) && localValue.every(idOf)
  if (!hasIds) return null

  const merged = [...serverValue]
  const seen = new Set(serverValue.map(idOf))
  for (const item of localValue) {
    if (!seen.has(idOf(item))) {
      merged.push(item)
      seen.add(idOf(item))
    }
  }
  return merged
}

class StorageManager {
  constructor() {
    this.prefix = PREFIX
    this.status = 'idle' // idle | syncing | error | offline
    this.lastSyncedAt = null
    this.hydrated = false
    this.timers = new Map()
    this.listeners = new Set()
    this.bindLifecycle()
  }

  /* ---------------- 状态订阅（供 UI 显示同步状态） ---------------- */

  subscribe(fn) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  emit() {
    const snapshot = { status: this.status, lastSyncedAt: this.lastSyncedAt }
    this.listeners.forEach(fn => {
      try {
        fn(snapshot)
      } catch {
        /* 忽略监听器异常 */
      }
    })
  }

  setStatus(status) {
    if (this.status === status) return
    this.status = status
    this.emit()
  }

  /* ---------------- 本地读写 ---------------- */

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value))
    } catch (err) {
      console.error('Storage set error:', err)
      return false
    }
    this.schedule(key)
    return true
  }

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(this.prefix + key)
      return item ? JSON.parse(item) : defaultValue
    } catch (err) {
      console.error('Storage get error:', err)
      return defaultValue
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key)
    } catch (err) {
      console.error('Storage remove error:', err)
      return false
    }
    this.schedule(key, null)
    return true
  }

  clear() {
    const keys = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix) && key !== META_KEY) keys.push(key)
    }
    keys.forEach(key => localStorage.removeItem(key))
    return true
  }

  getAll() {
    const data = {}
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(this.prefix) && key !== META_KEY) {
        try {
          data[key.substring(this.prefix.length)] = JSON.parse(localStorage.getItem(key))
        } catch {
          /* 跳过坏数据 */
        }
      }
    }
    return data
  }

  setAll(data) {
    Object.entries(data).forEach(([key, value]) => this.set(key, value))
    return true
  }

  /* ---------------- 云端同步 ---------------- */

  schedule(key, value = undefined) {
    if (!token() || LOCAL_ONLY.has(key)) return
    clearTimeout(this.timers.get(key))
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key)
        this.push(key, value === undefined ? this.get(key) : value)
      }, SYNC_DELAY)
    )
  }

  async push(key, value, retried = false) {
    if (!token()) return
    const meta = readMeta()
    this.setStatus('syncing')

    try {
      const res = await fetch(`/api/data/${encodeURIComponent(key)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token()}`
        },
        body: JSON.stringify({ value, baseVersion: meta[key] || null })
      })

      if (res.status === 401) {
        this.setStatus('offline')
        return
      }

      if (res.status === 409 && !retried) {
        const payload = await res.json()
        // 家人已经改过：数组按 id 求并集，其余以服务端为准
        const localValue = this.get(key, null)
        const merged = mergeArrays(payload.data, localValue) ?? payload.data
        localStorage.setItem(this.prefix + key, JSON.stringify(merged))
        const nextMeta = readMeta()
        nextMeta[key] = payload.version
        writeMeta(nextMeta)
        this.emit()
        return this.push(key, merged, true)
      }

      if (!res.ok) {
        this.setStatus('error')
        return
      }

      const data = await res.json()
      const nextMeta = readMeta()
      nextMeta[key] = data.version
      writeMeta(nextMeta)
      this.lastSyncedAt = new Date()
      this.setStatus('idle')
    } catch {
      // 断网：保留本地数据，等下一次改动或手动同步
      this.setStatus('offline')
    }
  }

  /** 登录后拉取家庭数据（服务端为准），并把本地独有的数据上传上去 */
  async hydrate(force = false) {
    if (!token()) return
    if (this.hydrated && !force) return
    this.setStatus('syncing')

    try {
      const res = await fetch('/api/data', {
        headers: { Authorization: `Bearer ${token()}` }
      })
      if (res.status === 401) {
        this.setStatus('offline')
        return
      }
      if (!res.ok) {
        this.setStatus('error')
        return
      }

      const payload = await res.json()
      const remote = payload.data || {}
      const meta = readMeta()

      // 服务端有的：覆盖本地缓存
      for (const [key, entry] of Object.entries(remote)) {
        if (LOCAL_ONLY.has(key)) continue
        localStorage.setItem(this.prefix + key, JSON.stringify(entry.value))
        meta[key] = entry.version
      }
      writeMeta(meta)

      // 本地有、服务端没有的（老用户第一次上云）：推上去
      const localOnly = Object.keys(this.getAll()).filter(
        key => !(key in remote) && !LOCAL_ONLY.has(key)
      )
      for (const key of localOnly) {
        await this.push(key, this.get(key))
      }

      this.hydrated = true
      this.lastSyncedAt = new Date()
      this.setStatus('idle')
      this.emit()
    } catch {
      this.setStatus('offline')
    }
  }

  /** 手动触发全量同步（UI 上的“立即同步”） */
  async syncNow() {
    this.hydrated = false
    await this.hydrate(true)
  }

  bindLifecycle() {
    if (typeof window === 'undefined') return
    // 页面隐藏时立刻把待推送的数据发出去，避免关掉页面丢改动
    const flush = () => {
      this.timers.forEach((timer, key) => {
        clearTimeout(timer)
        this.timers.delete(key)
        this.push(key, this.get(key))
      })
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    window.addEventListener('online', () => {
      if (token()) this.hydrate(true)
    })
  }
}

const storage = new StorageManager()

// 预定义的存储键
export const STORAGE_KEYS = {
  FAMILY_MEMBERS: 'family_members',
  FAMILY_RELATIONSHIPS: 'family_relationships',
  INTERVIEWEES: 'interviewees',
  INTERVIEW_SESSIONS: 'interview_sessions',
  INTERVIEW_MESSAGES: 'interview_messages',
  MEMORY_LOCATIONS: 'memory_locations',
  TIME_CAPSULES: 'time_capsules',
  HEIRLOOMS: 'heirlooms',
  USER_SETTINGS: 'user_settings',
  WELCOME_SHOWN: 'welcome_shown',
  DARK_MODE: 'dark_mode',
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
