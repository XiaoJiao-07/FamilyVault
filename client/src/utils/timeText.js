// 把机器时间写成人话：2026/11/15 12:03:00 → 2026年11月15日 中午
//
// 为什么单独抽出来：这些日期会印在家族档案册子里，
// 「2026/11/15 12:03:00」在纸上是明显的程序痕迹。

const pad2 = (n) => String(n).padStart(2, '0')

/** 解析后端/本地存下来的各种时间写法，失败返回 null */
export function parseWhen(input) {
  if (input == null || input === '') return null
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input
  if (typeof input === 'number') {
    const d = new Date(input)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const s = String(input).trim()
  if (!s) return null

  // "2026/11/15 12:03:00"：Safari 对斜杠格式才好解析，转成 - 反而在部分机型上失败
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
  if (m) {
    const d = new Date(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      Number(m[4] || 0),
      Number(m[5] || 0),
      Number(m[6] || 0)
    )
    return Number.isNaN(d.getTime()) ? null : d
  }

  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const periodOf = (h) => {
  if (h < 5) return '凌晨'
  if (h < 11) return '上午'
  if (h < 13) return '中午'
  if (h < 18) return '下午'
  return '晚上'
}

/** 2026年11月15日 */
export function cnDate(input) {
  const d = parseWhen(input)
  if (!d) return String(input || '').trim()
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** 2026年11月15日 中午（有具体时刻才带时段） */
export function cnDateTime(input) {
  const d = parseWhen(input)
  if (!d) return String(input || '').trim()
  const s = String(input)
  const hasTime = /[ T]\d{1,2}:\d{2}/.test(s) || typeof input === 'number' || input instanceof Date
  const base = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
  return hasTime ? `${base} ${periodOf(d.getHours())}` : base
}

/** 2026.11.15 —— 版式里需要紧凑时用 */
export function cnDateDot(input) {
  const d = parseWhen(input)
  if (!d) return String(input || '').trim()
  return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`
}
