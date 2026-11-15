// 记忆地点的重复治理——纯函数
//
// 两件事：事后合并（findDuplicateGroups / mergeDuplicates），
// 以及录入时就把离谱坐标拦下来（checkNewLocation）。
//
// 为什么会有重复：手点地图、AI 抽取、搜地名三条路都能落一条地点，
// 同一件事很容易被记两遍，其中一条还带着随手点歪的坐标。
// 合并原则：信息最全的那条当正本，其余只用来补空字段，任何字段都不丢内容。

import { distanceMeters } from './coord'

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

/* ---------------- 录入时就把错的拦下来 ----------------
 * 事后合并是补救，录入时校验才是止损：
 * 一条点歪的坐标会毁掉整张地图的视野，还会跟着进年轮和档案册子。
 */

const km = (m) => Math.round(m / 1000)

const dist = (a, b) =>
  distanceMeters(Number(a.latitude), Number(a.longitude), Number(b.latitude), Number(b.longitude))

/**
 * 保存前体检。
 * @returns {null | {level:'far-same'|'dupe'|'far-all', km:number, other?:object, message:string}}
 *  - far-same：同名地点已有坐标，这次点的位置离它远得离谱 —— 多半点歪了
 *  - dupe    ：同名同年已经记过，位置也对得上 —— 是同一件事记了两遍
 *  - far-all ：和家里其他地点完全不在一个地方，独自飘在几百公里外
 */
export function checkNewLocation(next, list = []) {
  if (!hasCoord(next)) return null
  const others = (Array.isArray(list) ? list : []).filter((p) => hasCoord(p) && String(p.id) !== String(next.id))
  if (!others.length) return null

  const nName = normName(next.name)
  const sameName = others.filter((p) => normName(p.name) === nName)
  const ranked = sameName
    .map((p) => ({ p, d: dist(next, p) }))
    .sort((a, b) => a.d - b.d)

  // 同名却不在同一个地方：先问位置，别忙着存
  if (ranked.length && ranked[0].d > 2000) {
    return {
      level: 'far-same',
      km: km(ranked[0].d),
      other: ranked[0].p,
      message: `你之前记过「${ranked[0].p.name}」，这次点的地方离它有 ${km(ranked[0].d)} 公里。是不是点歪了？`
    }
  }

  // 同名同年、位置也对得上：这就是同一件事被记了两遍
  const sameYear = ranked.find(({ p, d }) => yearKey(p) === yearKey(next) && d <= 2000)
  if (sameYear) {
    const y = yearKey(next)
    return {
      level: 'dupe',
      km: km(sameYear.d),
      other: sameYear.p,
      message: `${y ? `${y} 年的` : ''}「${next.name}」已经记过了，位置也基本一样。还要再记一条吗？`
    }
  }

  // 家里其他地点都在一个区域，新点却孤零零飘在几百公里外
  const far = others.filter((p) => dist(next, p) > 300000)
  if (far.length === others.length && others.length >= 2) {
    let maxBetween = 0
    for (let i = 0; i < others.length; i += 1) {
      for (let j = i + 1; j < others.length; j += 1) {
        maxBetween = Math.max(maxBetween, dist(others[i], others[j]))
      }
    }
    if (maxBetween < 300000) {
      const nearest = others
        .map((p) => dist(next, p))
        .sort((a, b) => a - b)[0]
      return {
        level: 'far-all',
        km: km(nearest),
        message: `这个位置离你其他记忆地点最近也有 ${km(nearest)} 公里，而它们彼此都在 ${km(maxBetween)} 公里内。确认不是拖错了？`
      }
    }
  }

  return null
}
