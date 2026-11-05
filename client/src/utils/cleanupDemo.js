// 历史示例数据清理
//
// 背景：早期版本的「家族图谱 / 记忆地图 / 时光胶囊 / 传家宝」四页内置了示例内容，
// 其中时光胶囊在第一次打开时会自动写入 localStorage，并随同步推到家庭云端。
// 这些内容不是用户录入的，留在家里会让人以为家史是演示数据。
//
// 清理策略：**完整指纹匹配**。一条记录必须同时命中示例数据的多个字段
// （标题 + 人物 + 日期 + 内容开头等）才会被删除；只要用户改过其中任何一项
// （改了名字、补了简介、加过照片、换了解锁日期…），这条就会被保留。
// 清理走 storage.set，因此会同步覆盖云端，不会下次登录又被拉回来。

import storage, { STORAGE_KEYS } from './storage'

const DEMO_CAPSULES = [
  {
    title: '给 30 岁的你',
    from_person: '爸爸',
    to_person: '未来的儿子',
    unlock_date: '2035-01-01',
    contentHead: '儿子，当你看到这个的时候，应该已经 30 岁了。'
  },
  {
    title: '结婚当天的祝福',
    from_person: '妈妈',
    to_person: '女儿',
    unlock_date: '2025-06-01',
    contentHead: '亲爱的女儿，今天是你结婚的日子，妈妈为你感到骄傲。'
  },
  {
    title: '家族的故事',
    from_person: '爷爷',
    to_person: '曾孙',
    unlock_date: '2040-01-01',
    contentHead: '孩子，我是你的曾祖父。'
  }
]

const DEMO_MEMBERS = [
  ['曾祖父', 1920, '湖北武汉', '商人'],
  ['曾祖母', 1922, '湖北武汉', '家庭主妇'],
  ['爷爷', 1950, '湖北武汉', '工程师'],
  ['奶奶', 1952, '四川成都', '教师'],
  ['大伯', 1975, '湖北武汉', '医生'],
  ['爸爸', 1978, '湖北武汉', '程序员'],
  ['妈妈', 1980, '湖南长沙', '会计'],
  ['我', 2005, '湖北武汉', '学生'],
  ['堂哥', 2003, '湖北武汉', '大学生'],
  ['姑姑', 1982, '湖北武汉', '设计师']
]

const DEMO_LOCATIONS = [
  ['爷爷的老家', 1930],
  ['奶奶的娘家', 1935],
  ['爸妈结婚的地方', 1975],
  ['爸爸上大学', 1996],
  ['我的出生地', 2005]
]

// 旧版采访页会自动创建的示例采访对象
const DEMO_INTERVIEWEES = [
  ['爷爷', 74, '湖北武汉', '祖父'],
  ['奶奶', 72, '四川成都', '祖母'],
  ['爸爸', 46, '湖北武汉', '父亲']
]

const normalize = (text) => String(text || '').replace(/\s+/g, '')

// 比较内容开头：取两侧可用的最短长度，避免「示例文案比截断长度短」时误判
const startsWithSeed = (content, headText) => {
  const c = normalize(content)
  const h = normalize(headText)
  if (!c || !h) return false
  const n = Math.min(16, h.length)
  return c.slice(0, n) === h.slice(0, n)
}

const isDemoCapsule = (c) =>
  DEMO_CAPSULES.some(
    d =>
      c &&
      c.title === d.title &&
      c.from_person === d.from_person &&
      c.to_person === d.to_person &&
      c.unlock_date === d.unlock_date &&
      startsWithSeed(c.content, d.contentHead)
  )

// 用户动过的成员一律保留：补过简介、加过照片、记过事件，都不再算示例
const isDemoMember = (m) => {
  if (!m) return false
  if (m.bio && String(m.bio).trim()) return false
  if (Array.isArray(m.events) && m.events.some(e => e && (e.text || e.year))) return false
  if (Array.isArray(m.photos) && m.photos.length) return false
  return DEMO_MEMBERS.some(
    ([name, year, hometown, occupation]) =>
      m.name === name &&
      Number(m.birthYear) === year &&
      m.hometown === hometown &&
      m.occupation === occupation
  )
}

const isDemoLocation = (l) =>
  l && DEMO_LOCATIONS.some(([name, year]) => l.name === name && Number(l.year) === year)

// 示例采访对象：只有从没被采访过（0 条记录）才算示例，被用过就保留
const isDemoInterviewee = (p, sessionOwnerIds) =>
  p &&
  !(p.sessions_count > 0) &&
  !sessionOwnerIds.has(p.id) &&
  DEMO_INTERVIEWEES.some(
    ([name, age, hometown, relationship]) =>
      p.name === name &&
      Number(p.age) === age &&
      p.hometown === hometown &&
      p.relationship === relationship
  )

const idOf = (v) => (v && typeof v === 'object' ? v.id : v)

/**
 * 执行一次清理，返回被清除内容的说明（无内容则返回空数组）。
 * 幂等：没有示例数据时什么都不写。
 */
export function cleanupDemoData() {
  const removed = []

  // 1. 时光胶囊
  const capsules = storage.get(STORAGE_KEYS.TIME_CAPSULES, null)
  if (Array.isArray(capsules) && capsules.length) {
    const kept = capsules.filter(c => !isDemoCapsule(c))
    if (kept.length !== capsules.length) {
      storage.set(STORAGE_KEYS.TIME_CAPSULES, kept)
      removed.push(`${capsules.length - kept.length} 条示例时光胶囊`)
    }
  }

  // 2. 家族成员 + 连带清理指向已删成员的关系
  const members = storage.get(STORAGE_KEYS.FAMILY_MEMBERS, null)
  if (Array.isArray(members) && members.length) {
    const kept = members.filter(m => !isDemoMember(m))
    if (kept.length !== members.length) {
      storage.set(STORAGE_KEYS.FAMILY_MEMBERS, kept)
      removed.push(`${members.length - kept.length} 位示例成员`)

      const alive = new Set(kept.map(m => m.id))
      const edges = storage.get(STORAGE_KEYS.FAMILY_RELATIONSHIPS, null)
      if (Array.isArray(edges) && edges.length) {
        const keptEdges = edges.filter(
          e => e && alive.has(idOf(e.source)) && alive.has(idOf(e.target))
        )
        if (keptEdges.length !== edges.length) {
          storage.set(STORAGE_KEYS.FAMILY_RELATIONSHIPS, keptEdges)
        }
      }
    }
  }

  // 3. 记忆地点
  const locations = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, null)
  if (Array.isArray(locations) && locations.length) {
    const kept = locations.filter(l => !isDemoLocation(l))
    if (kept.length !== locations.length) {
      storage.set(STORAGE_KEYS.MEMORY_LOCATIONS, kept)
      removed.push(`${locations.length - kept.length} 个示例地点`)
    }
  }

  // 4. 采访对象（被采访过的示例对象保留，只清从没用过的）
  const interviewees = storage.get(STORAGE_KEYS.INTERVIEWEES, null)
  if (Array.isArray(interviewees) && interviewees.length) {
    const sessions = storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, null)
    const sessionOwnerIds = new Set(
      (Array.isArray(sessions) ? sessions : [])
        .map(s => s && s.interviewee && s.interviewee.id)
        .filter(id => id != null)
    )
    const kept = interviewees.filter(p => !isDemoInterviewee(p, sessionOwnerIds))
    if (kept.length !== interviewees.length) {
      storage.set(STORAGE_KEYS.INTERVIEWEES, kept)
      removed.push(`${interviewees.length - kept.length} 个示例采访对象`)
    }
  }

  return removed
}

/**
 * 启动时清理一次；登录后云端数据会覆盖本地，所以同步完成后再复查一次。
 * onRemoved(说明数组) 只在该轮真的清掉东西时调用。
 */
export function startDemoCleanup(onRemoved) {
  const report = (list) => {
    if (list.length && typeof onRemoved === 'function') onRemoved(list)
  }

  report(cleanupDemoData())

  let checkedAfterSync = false
  const unsubscribe = storage.subscribe(() => {
    if (checkedAfterSync || !storage.hydrated) return
    checkedAfterSync = true
    unsubscribe()
    report(cleanupDemoData())
  })
}
