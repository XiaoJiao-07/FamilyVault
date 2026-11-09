// 记忆地点的重复治理——纯函数
//
// 为什么会有重复：手点地图、AI 抽取、搜地名三条路都能落一条地点，
// 同一件事很容易被记两遍，其中一条还带着随手点歪的坐标。
// 合并原则：信息最全的那条当正本，其余只用来补空字段，任何字段都不丢内容。

const normName = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[\s·•・.,，。、()（）\[\]【】\-—_/\\]/g, '')

const yearKey = (p) => {
  const n = Number(String(p?.year ?? '').trim())
  return Number.isFinite(n) && n > 0 ? String(Math.trunc(n)) : ''
}

export const hasCoord = (p) =>
  Number.isFinite(Number(p?.latitude)) &&
  Number.isFinite(Number(p?.longitude)) &&
  Math.abs(Number(p.latitude)) <= 90 &&
  Math.abs(Number(p.longitude)) <= 180 &&
  Number(p.latitude) !== 0 &&
  Number(p.longitude) !== 0

/** 信息完整度打分：有坐标 > 有地址 > 描述长。用来决定留哪一条 */
function score(p) {
  let s = 0
  if (hasCoord(p)) s += 10
  if (String(p?.address || '').trim()) s += 5
  s += Math.min(String(p?.description || '').length / 40, 3)
  return s
}

/**
 * 找重复：同名 + 同年（都没写年份也算同年）。
 * 同名但年份不同，是「两个不同时间的同一处」，不算重复，不碰。
 * @returns {Array<{key:string,name:string,year:string,items:Array}>}
 */
export function findDuplicateGroups(list = []) {
  const buckets = new Map()
  const arr = Array.isArray(list) ? list : []

  arr.forEach((p) => {
    const n = normName(p?.name)
    if (!n) return
    const key = `${n}|${yearKey(p)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(p)
  })

  return [...buckets.entries()]
    .filter(([, items]) => items.length > 1)
    .map(([key, items]) => ({
      key,
      name: String(items[0].name || ''),
      year: yearKey(items[0]),
      items
    }))
}

/** 一组里该留哪条：信息最全的那条 */
export function pickKeeper(items = []) {
  return [...items].sort((a, b) => score(b) - score(a))[0]
}

/** 合并一组：返回保留的那条（字段齐全）与合并掉几条 */
function mergeItems(items) {
  const keeper = pickKeeper(items)
  const rest = items.filter((p) => String(p.id) !== String(keeper.id))

  const longestDesc = [...items]
    .map((p) => String(p?.description || '').trim())
    .sort((a, b) => b.length - a.length)[0]

  const address = String(keeper.address || '').trim() || rest.map((p) => String(p?.address || '').trim()).find(Boolean) || ''

  const coordFrom = hasCoord(keeper) ? keeper : rest.find(hasCoord)

  return {
    ...keeper,
    name: String(keeper.name || items[0].name || '').trim(),
    year: String(keeper.year ?? '').trim() || String(items.find((p) => String(p?.year ?? '').trim())?.year ?? ''),
    description: longestDesc || String(keeper.description || ''),
    address,
    latitude: coordFrom ? Number(coordFrom.latitude) : keeper.latitude,
    longitude: coordFrom ? Number(coordFrom.longitude) : keeper.longitude,
    mergedCount: items.length - 1
  }
}

/**
 * 一次性把所有重复组合并掉。
 * @returns {{next:Array, groups:number, removed:number}}
 */
export function mergeDuplicates(list = []) {
  const arr = Array.isArray(list) ? list : []
  const groups = findDuplicateGroups(arr)
  if (!groups.length) return { next: arr, groups: 0, removed: 0 }

  const mergedIds = new Set() // 被合并掉的 id
  const replacements = new Map() // 原 keeper id -> 合并后的对象
  let removed = 0

  groups.forEach((g) => {
    const merged = mergeItems(g.items)
    const keeperId = String(merged.id)
    mergedIds.add(keeperId)
    replacements.set(keeperId, merged)
    g.items.forEach((p) => {
      const id = String(p.id)
      if (id !== keeperId) {
        mergedIds.add(id)
        removed += 1
      }
    })
  })

  const next = []
  const emitted = new Set()
  arr.forEach((p) => {
    const id = String(p.id)
    if (replacements.has(id)) {
      if (!emitted.has(id)) {
        next.push(replacements.get(id))
        emitted.add(id)
      }
      return
    }
    if (mergedIds.has(id)) return // 已经被并走的
    next.push(p)
  })

  return { next, groups: groups.length, removed }
}

export function describeGroup(group) {
  const years = group.items.map((p) => String(p?.year ?? '').trim()).filter(Boolean)
  const year = years[0] || ''
  return `${group.name}${year ? ` · ${year}年` : ''}（${group.items.length} 条）`
}
