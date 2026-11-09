// 「这段口述讲的是哪一年」——纯函数，不依赖 Vue / DOM
//
// 为什么需要它：口述记录原本只有「哪一天录的」，没有「讲的是哪一年」。
// 没有故事年份，口述就只能待在故事记录里，进不了家族年轮。
// 这里从原话里找年份做建议，但最终一定是人来确认——猜错比不猜更糟。

const MIN_YEAR = 1900

/** 允许的未来年份上限：留一点余量给「明年搬新房」这种说法 */
const maxYear = () => new Date().getFullYear() + 5

// 取「整段连续数字」，只认刚好四位的——这样不会把年龄、电话、门牌号里的一截当年份
// （不用后行断言 (?<!\d) 是因为老 iOS Safari 会直接语法报错）
const YEAR_RE = /\d+/g

/**
 * 从一段文字里挑出年份，按「被提到次数」排序。
 * 只是建议，不保证语义正确（「1980 年我 20 岁」和「我 1980 年出生」都会命中 1980）。
 * @returns {Array<{year:number,count:number}>}
 */
export function detectYears(text) {
  const src = String(text || '')
  if (!src) return []
  const tally = new Map()
  const upper = maxYear()
  let m
  YEAR_RE.lastIndex = 0
  while ((m = YEAR_RE.exec(src)) !== null) {
    if (m[0].length !== 4) continue
    const y = Number(m[0])
    if (y < MIN_YEAR || y > upper) continue
    tally.set(y, (tally.get(y) || 0) + 1)
  }
  return [...tally.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.count - a.count || a.year - b.year)
}

/**
 * 给一次采访猜一个故事年份：
 * 只看长辈自己说的话（AI 的提问里常有「您说的 1978 年」这种复述，会带偏）。
 * 次数相同的，取更早的那年——家里讲故事，通常从早的讲起。
 */
export function guessStoryYear(session) {
  const msgs = Array.isArray(session?.messages) ? session.messages : []
  const said = msgs.filter((m) => m && m.role !== 'ai' && String(m.text || '').trim())
  if (!said.length) return null

  const tally = new Map()
  said.forEach((m) => {
    detectYears(m.text).forEach(({ year }) => {
      tally.set(year, (tally.get(year) || 0) + 1)
    })
  })
  if (!tally.size) return null

  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0][0]
}

/** 从一段采访里取若干个候选年份，供用户点选 */
export function suggestStoryYears(session, limit = 4) {
  const msgs = Array.isArray(session?.messages) ? session.messages : []
  const all = msgs
    .filter((m) => m && m.role !== 'ai')
    .map((m) => m.text)
    .join('\n')
  return detectYears(all)
    .slice(0, limit)
    .map((x) => x.year)
}

/** 校验用户手填的年份 */
export function normalizeStoryYear(input) {
  const n = Number(String(input ?? '').trim())
  if (!Number.isFinite(n)) return null
  const y = Math.trunc(n)
  if (y < MIN_YEAR || y > maxYear()) return null
  return y
}

export { MIN_YEAR }
