import storage, { STORAGE_KEYS } from './storage'

/**
 * 时光胶囊共享工具：负责「到期自动解锁」与「到期提醒」。
 * 首页与胶囊页共用，保证两处状态一致。
 */

/** 计算某胶囊剩余天数（负数表示已到期） */
export function daysLeft(capsule) {
  const d = capsule?.unlock_date
  if (!d) return 0
  const t = new Date(d).getTime()
  if (Number.isNaN(t)) return 0
  return Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24))
}

/**
 * 扫描所有胶囊：统计已到期但尚未解锁的数量。
 * 注意：到期胶囊不自动改 is_unlocked（保留给用户亲手「立即解锁」那一刻的仪式感），
 * 本函数只负责「数到期」供首页提醒使用。返回值含到期列表。
 */
export function checkDueCapsules() {
  const list = storage.get(STORAGE_KEYS.TIME_CAPSULES, null)
  if (!Array.isArray(list) || list.length === 0) {
    return { unlocked: 0, dueCount: 0, total: list?.length || 0, list: list || [] }
  }

  const now = Date.now()
  const due = list.filter(c => {
    const t = new Date(c?.unlock_date).getTime()
    return Number.isFinite(t) && t <= now && !c.is_unlocked
  })

  const unlocked = list.filter(c => c.is_unlocked).length
  return { unlocked, dueCount: due.length, total: list.length, list }
}

/** 距最近一次到期还有几天（无胶囊时返回 null） */
export function nearestDueInDays() {
  const list = storage.get(STORAGE_KEYS.TIME_CAPSULES, null)
  if (!Array.isArray(list) || list.length === 0) return null
  const future = list
    .filter(c => c && !c.is_unlocked)
    .map(c => daysLeft(c))
    .filter(d => d > 0)
  if (future.length === 0) return null
  return Math.min(...future)
}

export default { daysLeft, checkDueCapsules, nearestDueInDays }
