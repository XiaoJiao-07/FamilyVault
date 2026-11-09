// 家族档案生成器
//
// 做的事：把散在六个模块里的记录，排成一份「给人看的」文档。
// 为什么不复用 AboutPage 的 JSON 导出：JSON 是给机器看的，家族档案是给人和纸看的。
//
// 输出是一份自包含的 HTML（样式内联、无外链、无脚本），
// 可以离线打开、可以打印成 A4、可以直接发给家人。

/* ---------------- 基础工具 ---------------- */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** 把可能含换行的用户文本转成段落 */
const paragraphs = (text, cls = '') =>
  String(text ?? '')
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p class="${cls}">${esc(line)}</p>`)
    .join('')

const pad = (n) => String(n).padStart(2, '0')

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']
const cnIndex = (i) => (i <= 10 ? CN_NUM[i] : String(i))

const validYear = (y) => {
  const n = Number(y)
  return Number.isFinite(n) && n > 1000 && n < 2200 ? n : null
}

/** 只有确定的公网/data 图片才内嵌，避免档案体积失控或出现断图 */
const usablePhoto = (src) => {
  const s = String(src || '')
  if (!s) return ''
  if (s.startsWith('data:image/')) return s.length < 300 * 1024 ? s : ''
  if (/^https?:\/\//.test(s)) return s
  return ''
}

/* ---------------- 家族名号 ---------------- */

/**
 * 从成员姓名里取最常见的姓，作为档案名号。
 * 九个姓王的家人 → 「王氏家族」，取不到就退回「家族」。
 */
export function familySurname(members = []) {
  const tally = new Map()
  members.forEach((m) => {
    const name = String(m?.name || '').trim()
    if (!name) return
    const ch = name[0]
    if (!/[\u4e00-\u9fa5]/.test(ch)) return
    tally.set(ch, (tally.get(ch) || 0) + 1)
  })
  if (!tally.size) return ''
  const [surname, count] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]
  // 姓只出现一次且成员多于三人时，说明这家不全是同姓，不必冠姓
  if (count < 2 && members.length > 2) return ''
  return surname
}

/* ---------------- 统计与完整性 ---------------- */

export function archiveStats(data = {}) {
  const members = data.members || []
  const sessions = data.sessions || []
  const locations = data.locations || []
  const heirlooms = data.heirlooms || []
  const capsules = data.capsules || []

  const years = []
  members.forEach((m) => {
    const y = validYear(m.birthYear)
    if (y) years.push(y)
    ;(m.events || []).forEach((e) => {
      const ey = validYear(e?.year)
      if (ey) years.push(ey)
    })
  })
  locations.forEach((l) => {
    const y = validYear(l.year)
    if (y) years.push(y)
  })
  sessions.forEach((s) => {
    const y = validYear(s.storyYear)
    if (y) years.push(y)
  })

  const utterances = sessions.reduce(
    (acc, s) => acc + (s.messages || []).filter((m) => m.role === 'user').length,
    0
  )

  return {
    members: members.length,
    stories: sessions.length,
    utterances,
    locations: locations.length,
    heirlooms: heirlooms.length,
    capsules: capsules.length,
    from: years.length ? Math.min(...years) : null,
    to: years.length ? Math.max(...years) : null
  }
}

/** 还缺什么：只报确定缺失的项，不臆测 */
export function archiveGaps(data = {}) {
  const gaps = []
  const members = data.members || []
  const locations = data.locations || []
  const sessions = data.sessions || []

  if (!members.length) gaps.push({ text: '还没有添加家人', path: '/graph' })

  const noYear = members.filter((m) => !validYear(m.birthYear))
  if (noYear.length) {
    gaps.push({ text: `${noYear.length} 位家人还缺出生年份`, path: '/graph' })
  }
  const noBio = members.filter((m) => !String(m.bio || '').trim())
  if (noBio.length) {
    gaps.push({ text: `${noBio.length} 位家人还没有小传`, path: '/graph' })
  }
  const noPos = locations.filter((l) => !Number.isFinite(Number(l.latitude)) || !Number.isFinite(Number(l.longitude)))
  if (noPos.length) {
    gaps.push({ text: `${noPos.length} 个地点还没定位`, path: '/places' })
  }
  if (!sessions.length) {
    gaps.push({ text: '还没有一段口述记录', path: '/interview' })
  }
  const noStoryYear = sessions.filter((s) => !validYear(s.storyYear))
  if (sessions.length && noStoryYear.length) {
    gaps.push({ text: `${noStoryYear.length} 段口述还没标年份`, path: '/stories?filter=noyear' })
  }
  return gaps
}

/* ---------------- 各章节 ---------------- */

function renderMemberCard(member, relOf) {
  const facts = []
  if (validYear(member.birthYear)) facts.push(`${member.birthYear} 年生`)
  if (member.gender) facts.push(member.gender)
  if (member.hometown) facts.push(member.hometown)
  if (member.occupation) facts.push(member.occupation)

  const photo = usablePhoto((member.photos || [])[0])
  const rels = relOf(member.id)
  const events = (member.events || []).filter((e) => e && (e.text || e.year))

  return `
    <article class="member">
      <div class="member-head">
        ${photo ? `<img class="member-photo" src="${esc(photo)}" alt="">` : ''}
        <div class="member-id">
          <h3 class="member-name">${esc(member.name || '未具名')}</h3>
          <p class="member-facts">${esc(facts.join(' · '))}</p>
          ${rels.length ? `<p class="member-rels">${rels.map((r) => esc(r)).join('　')}</p>` : ''}
        </div>
      </div>
      ${member.bio ? `<blockquote class="member-bio">${paragraphs(member.bio)}</blockquote>` : ''}
      ${
        events.length
          ? `<ul class="member-events">${events
              .sort((a, b) => (validYear(a.year) || 0) - (validYear(b.year) || 0))
              .map((e) => `<li><span class="ev-year">${esc(e.year || '')}</span><span class="ev-text">${esc(e.text || '')}</span></li>`)
              .join('')}</ul>`
          : ''
      }
    </article>`
}

function renderSession(session) {
  const msgs = (session.messages || []).filter((m) => String(m.text || '').trim())
  if (!msgs.length && !session.notes) return ''
  const who = session.interviewee?.name || '未具名的长辈'
  const when = String(session.date || '').trim()
  const storyYear = validYear(session.storyYear)
  const minutes = Number(session.duration) > 0 ? `${Math.round(Number(session.duration) / 60)} 分钟` : ''

  const body = msgs
    .map((m) => {
      const text = String(m.text).trim()
      if (m.role === 'ai') {
        return `<p class="ask">问：${esc(text)}</p>`
      }
      // 长辈原话：可能有多段，按空行/换行拆开，各自缩进
      return paragraphs(text, 'say')
    })
    .join('')

  return `
    <section class="session">
      <header class="session-head">
        <h3 class="session-who">${esc(who)}</h3>
        <p class="session-meta">${esc([storyYear ? `讲的是 ${storyYear} 年` : '', when, minutes].filter(Boolean).join(' · '))}</p>
      </header>
      ${session.title ? `<p class="session-title">${esc(session.title)}</p>` : ''}
      <div class="session-body">${body}</div>
    </section>`
}

function renderLocation(loc) {
  const y = validYear(loc.year)
  return `
    <li class="place">
      <span class="place-year">${y ? esc(y) : '—'}</span>
      <div class="place-main">
        <h3 class="place-name">${esc(loc.name || '未命名地点')}</h3>
        ${loc.description ? `<p class="place-desc">${esc(loc.description)}</p>` : ''}
        ${loc.address ? `<p class="place-addr">${esc(loc.address)}</p>` : ''}
      </div>
    </li>`
}

function renderHeirloom(item) {
  const map = { recipe: '菜谱', craft: '手艺', motto: '家训' }
  return `
    <article class="heirloom">
      <div class="heirloom-head">
        <span class="heirloom-tag">${esc(map[item.category] || '其他')}</span>
        <h3 class="heirloom-title">${esc(item.title || '未命名')}</h3>
      </div>
      <div class="heirloom-body">${paragraphs(item.content)}</div>
      ${item.author_name ? `<p class="heirloom-by">—— 记自 ${esc(item.author_name)}</p>` : ''}
    </article>`
}

function renderCapsule(c) {
  const locked = !c.is_unlocked
  return `
    <li class="capsule${locked ? ' is-locked' : ''}">
      <div class="capsule-line">
        <span class="capsule-title">${esc(c.title || '未命名')}</span>
        <span class="capsule-date">${esc(c.unlock_date || '')}${locked ? ' 启封' : ''}</span>
      </div>
      <p class="capsule-meta">${esc(
        [c.from_person ? `由 ${c.from_person}` : '', c.to_person ? `写给 ${c.to_person}` : '']
          .filter(Boolean)
          .join('，')
      )}</p>
      ${
        locked
          ? '<p class="capsule-sealed">封存中 · 启封之日再读</p>'
          : `<div class="capsule-text">${paragraphs(c.content)}</div>`
      }
    </li>`
}

/* ---------------- 组装 ---------------- */

/**
 * 生成完整的档案 HTML
 * @param {object} data {members, relationships, sessions, locations, heirlooms, capsules}
 * @returns {string} 自包含 HTML 文档
 */
export function buildArchiveHtml(data = {}) {
  const members = Array.isArray(data.members) ? data.members : []
  const relationships = Array.isArray(data.relationships) ? data.relationships : []
  const sessions = Array.isArray(data.sessions) ? data.sessions : []
  const locations = Array.isArray(data.locations) ? data.locations : []
  const heirlooms = Array.isArray(data.heirlooms) ? data.heirlooms : []
  const capsules = Array.isArray(data.capsules) ? data.capsules : []

  const stats = archiveStats(data)
  const surname = familySurname(members)
  const familyName = surname ? `${surname}氏家族` : '家族'

  // 关系：把 id 换成名字，并按称谓归并（父子：王建国、王建华）
  const nameOf = new Map(members.map((m) => [m.id, m.name || '未具名']))
  const relOf = (id) => {
    const grouped = new Map()
    relationships
      .filter((r) => r.source === id || r.target === id)
      .forEach((r) => {
        const otherId = r.source === id ? r.target : r.source
        const other = nameOf.get(otherId)
        if (!other) return
        const label = r.label || '亲属'
        if (!grouped.has(label)) grouped.set(label, [])
        grouped.get(label).push(other)
      })
    return [...grouped.entries()].map(([label, names]) => `${label}：${names.join('、')}`)
  }

  const orderedMembers = [...members].sort((a, b) => {
    const ay = validYear(a.birthYear) || 9999
    const by = validYear(b.birthYear) || 9999
    return ay - by
  })

  const orderedLocations = [...locations].sort(
    (a, b) => (validYear(a.year) || 9999) - (validYear(b.year) || 9999)
  )
  // 口述：标了年份的按年份排（读起来像一部家史），没标的按采访时间倒序跟在后面
  const orderedSessions = [...sessions].sort((a, b) => {
    const ay = validYear(a.storyYear)
    const by = validYear(b.storyYear)
    if (ay && by) return ay - by
    if (ay) return -1
    if (by) return 1
    return String(b.date || '').localeCompare(String(a.date || ''))
  })

  const span = stats.from && stats.to ? `${stats.from} — ${stats.to}` : ''

  // 卷首语：只用真实数字说话
  const prefaceBits = []
  if (stats.members) prefaceBits.push(`${stats.members} 位家人`)
  if (stats.stories) prefaceBits.push(`${stats.stories} 段口述`)
  if (stats.locations) prefaceBits.push(`${stats.locations} 处记忆地点`)
  if (stats.heirlooms) prefaceBits.push(`${stats.heirlooms} 件传家之物`)
  const preface = prefaceBits.length
    ? `这份档案收录了${familyName}的${prefaceBits.join('、')}${span ? `，时间自 ${stats.from} 年至 ${stats.to} 年` : ''}。`
    : `这份档案还没有内容。回到 FamilyVault，先记下一位家人、一个老地方，或者一段长辈的话。`

  const sections = []

  if (orderedMembers.length) {
    sections.push(`
      <section class="chapter">
        <h2 class="chapter-title"><span class="chapter-no">一</span>家人名录</h2>
        <p class="chapter-note">按出生年份排列，共 ${orderedMembers.length} 位。</p>
        ${orderedMembers.map((m) => renderMemberCard(m, relOf)).join('')}
      </section>`)
  }

  const sessionBlocks = orderedSessions.map(renderSession).filter(Boolean)
  if (sessionBlocks.length) {
    const total = orderedSessions.reduce(
      (acc, s) => acc + (s.messages || []).filter((m) => m.role === 'user').length,
      0
    )
    sections.push(`
      <section class="chapter">
        <h2 class="chapter-title"><span class="chapter-no">${cnIndex(sections.length + 1)}</span>口述实录</h2>
        <p class="chapter-note">长辈原话照录，共 ${sessionBlocks.length} 次采访、${total} 段答话。问句为当时的引导语。</p>
        ${sessionBlocks.join('')}
      </section>`)
  }

  if (orderedLocations.length) {
    sections.push(`
      <section class="chapter">
        <h2 class="chapter-title"><span class="chapter-no">${cnIndex(sections.length + 1)}</span>记忆地点</h2>
        <p class="chapter-note">按年代先后排列，共 ${orderedLocations.length} 处。</p>
        <ul class="places">${orderedLocations.map(renderLocation).join('')}</ul>
      </section>`)
  }

  if (heirlooms.length) {
    sections.push(`
      <section class="chapter">
        <h2 class="chapter-title"><span class="chapter-no">${cnIndex(sections.length + 1)}</span>传家之物</h2>
        <p class="chapter-note">一道菜、一门手艺、一句话，都是能传下去的东西。</p>
        ${heirlooms.map(renderHeirloom).join('')}
      </section>`)
  }

  if (capsules.length) {
    const lockedCount = capsules.filter((c) => !c.is_unlocked).length
    sections.push(`
      <section class="chapter">
        <h2 class="chapter-title"><span class="chapter-no">${cnIndex(sections.length + 1)}</span>时光胶囊</h2>
        <p class="chapter-note">共 ${capsules.length} 颗${lockedCount ? `，其中 ${lockedCount} 颗尚未到启封之日，内容不予收录` : ''}。</p>
        <ul class="capsules">${[...capsules]
          .sort((a, b) => String(a.unlock_date || '').localeCompare(String(b.unlock_date || '')))
          .map(renderCapsule)
          .join('')}</ul>
      </section>`)
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(familyName)}档案 · ${esc(today())}</title>
<style>
  :root{
    --paper:#f7f1e6; --ink:#2b2119; --ink2:#5c4b3b; --ink3:#8e7c69;
    --line:#e2d5c1; --seal:#b4442e; --brass:#c99a5b;
  }
  *{box-sizing:border-box}
  html,body{margin:0;padding:0;background:#e8e0d2;color:var(--ink)}
  body{
    font-family:"Songti SC","Source Han Serif SC","Noto Serif CJK SC",Georgia,"SimSun",serif;
    line-height:1.85; -webkit-text-size-adjust:100%;
  }
  .sheet{
    max-width:760px;margin:0 auto;background:var(--paper);
    padding:64px 56px 72px;box-shadow:0 10px 36px rgba(60,40,20,.16);
  }

  /* 封面 */
  .cover{padding-bottom:44px;border-bottom:2px solid var(--ink);margin-bottom:42px;position:relative}
  .cover-kicker{
    font-family:-apple-system,"PingFang SC",sans-serif;
    font-size:11px;letter-spacing:.34em;color:var(--ink3);text-transform:uppercase;margin:0 0 26px;
  }
  .cover-title{font-size:44px;line-height:1.2;margin:0 0 16px;letter-spacing:.06em;font-weight:600}
  .cover-sub{font-size:14px;color:var(--ink2);margin:0 0 30px;letter-spacing:.08em}
  .cover-meta{
    font-family:-apple-system,"PingFang SC",sans-serif;
    font-size:12px;color:var(--ink3);margin:0;letter-spacing:.04em;
  }
  .seal{
    position:absolute;right:0;top:6px;width:74px;height:74px;border:3px solid var(--seal);
    border-radius:6px;color:var(--seal);display:flex;align-items:center;justify-content:center;
    font-size:15px;line-height:1.15;text-align:center;letter-spacing:.06em;
    transform:rotate(-4deg);opacity:.86;font-weight:600;padding:6px;
  }
  .preface{
    font-size:15.5px;color:var(--ink2);margin:0 0 46px;padding-left:16px;
    border-left:3px solid var(--brass);line-height:2;
  }

  /* 章节 */
  .chapter{margin:0 0 52px}
  .chapter-title{
    font-size:21px;margin:0 0 6px;font-weight:600;letter-spacing:.06em;
    display:flex;align-items:baseline;gap:12px;padding-bottom:10px;border-bottom:1px solid var(--line);
  }
  .chapter-no{
    font-size:13px;color:var(--seal);border:1px solid rgba(180,68,46,.35);
    border-radius:3px;padding:1px 7px;letter-spacing:0;
  }
  .chapter-note{font-size:12.5px;color:var(--ink3);margin:10px 0 24px;font-family:-apple-system,"PingFang SC",sans-serif}

  /* 家人 */
  .member{margin:0 0 30px;padding-bottom:24px;border-bottom:1px dashed var(--line)}
  .member:last-child{border-bottom:0}
  .member-head{display:flex;gap:16px;align-items:flex-start}
  .member-photo{width:66px;height:66px;object-fit:cover;border-radius:4px;filter:sepia(.12)}
  .member-id{flex:1;min-width:0}
  .member-name{font-size:18px;margin:0 0 4px;letter-spacing:.05em}
  .member-facts{font-size:12.5px;color:var(--ink3);margin:0;font-family:-apple-system,"PingFang SC",sans-serif}
  .member-rels{font-size:12.5px;color:var(--ink2);margin:4px 0 0;font-family:-apple-system,"PingFang SC",sans-serif}
  .member-bio{margin:12px 0 0;padding:0 0 0 14px;border-left:2px solid var(--line);font-size:14.5px;color:var(--ink2)}
  .member-bio p{margin:0 0 6px}
  .member-events{list-style:none;padding:0;margin:14px 0 0;font-size:13.5px}
  .member-events li{display:flex;gap:14px;padding:4px 0;border-bottom:1px dotted var(--line)}
  .ev-year{color:var(--seal);min-width:52px;font-family:-apple-system,"PingFang SC",sans-serif;font-size:12.5px;letter-spacing:.02em}
  .ev-text{flex:1;color:var(--ink2)}

  /* 口述 */
  .session{margin:0 0 34px}
  .session-head{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  .session-who{font-size:16px;margin:0;letter-spacing:.05em}
  .session-meta{font-size:12px;color:var(--ink3);margin:0;font-family:-apple-system,"PingFang SC",sans-serif;white-space:nowrap}
  .session-title{font-size:13.5px;color:var(--ink2);margin:4px 0 0}
  .session-body{margin-top:10px}
  .ask{
    font-size:12.5px;color:var(--ink3);margin:0 0 6px;font-family:-apple-system,"PingFang SC",sans-serif;
    padding-left:14px;border-left:2px solid var(--line);
  }
  .say{font-size:15.5px;color:var(--ink);margin:0 0 14px;text-indent:2em;line-height:1.95}

  /* 地点 */
  .places{list-style:none;padding:0;margin:0}
  .place{display:flex;gap:16px;padding:12px 0;border-bottom:1px dotted var(--line)}
  .place:last-child{border-bottom:0}
  .place-year{
    min-width:52px;font-size:13px;color:var(--seal);letter-spacing:.02em;
    font-family:-apple-system,"PingFang SC",sans-serif;padding-top:3px;
  }
  .place-main{flex:1;min-width:0}
  .place-name{font-size:16px;margin:0 0 3px;letter-spacing:.04em;font-weight:600}
  .place-desc{font-size:13px;color:var(--ink3);margin:0;font-family:-apple-system,"PingFang SC",sans-serif;letter-spacing:.01em}
  .place-addr{font-size:11.5px;color:var(--ink3);margin:3px 0 0;font-family:-apple-system,"PingFang SC",sans-serif}

  /* 传家宝 */
  .heirloom{margin:0 0 26px;padding:16px 18px;background:#fbf6ec;border:1px solid var(--line);border-radius:4px}
  .heirloom-head{display:flex;align-items:baseline;gap:10px;margin-bottom:8px}
  .heirloom-tag{font-size:11px;color:var(--seal);border:1px solid rgba(180,68,46,.32);border-radius:2px;padding:1px 6px;font-family:-apple-system,"PingFang SC",sans-serif}
  .heirloom-title{font-size:16px;margin:0;letter-spacing:.04em}
  .heirloom-body{font-size:14.5px;color:var(--ink2)}
  .heirloom-body p{margin:0 0 6px}
  .heirloom-by{font-size:12px;color:var(--ink3);margin:8px 0 0;text-align:right;font-family:-apple-system,"PingFang SC",sans-serif}

  /* 胶囊 */
  .capsules{list-style:none;padding:0;margin:0}
  .capsule{padding:12px 0;border-bottom:1px dotted var(--line)}
  .capsule:last-child{border-bottom:0}
  .capsule-line{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  .capsule-title{font-size:15px;letter-spacing:.04em}
  .capsule-date{font-size:11.5px;color:var(--ink3);font-family:-apple-system,"PingFang SC",sans-serif;white-space:nowrap}
  .capsule-meta{font-size:11.5px;color:var(--ink3);margin:2px 0 0;font-family:-apple-system,"PingFang SC",sans-serif}
  .capsule-sealed{font-size:13px;color:var(--ink3);margin:6px 0 0;font-style:italic}
  .capsule-text{font-size:14px;color:var(--ink2);margin-top:6px}
  .capsule-text p{margin:0 0 6px}

  /* 尾页 */
  .colophon{margin-top:56px;padding-top:20px;border-top:1px solid var(--line);font-size:12px;color:var(--ink3);font-family:-apple-system,"PingFang SC",sans-serif;line-height:1.9}
  .colophon .mark{display:block;font-size:15px;color:var(--ink2);letter-spacing:.14em;margin-bottom:8px;font-family:inherit}

  /* 打印 */
  @page{size:A4;margin:16mm 14mm}
  @media print{
    html,body{background:#fff}
    .sheet{box-shadow:none;max-width:none;padding:0}
    .cover{page-break-after:always}
    .chapter{page-break-inside:auto}
    .member,.session,.heirloom,.place,.capsule{page-break-inside:avoid}
    .chapter-title{page-break-after:avoid}
  }
  @media (max-width:640px){
    .sheet{padding:36px 22px 48px;box-shadow:none}
    .cover-title{font-size:32px}
    .seal{width:58px;height:58px;font-size:12px;border-width:2px}
    .say{text-indent:0}
  }
</style>
</head>
<body>
<div class="sheet">

  <header class="cover">
    <div class="seal">家史<br>馆藏</div>
    <p class="cover-kicker">Family Vault · 家族档案</p>
    <h1 class="cover-title">${esc(familyName)}档案</h1>
    <p class="cover-sub">${esc(
      [stats.members ? `${stats.members} 位家人` : '', stats.stories ? `${stats.stories} 段口述` : '', span]
        .filter(Boolean)
        .join('　·　')
    )}</p>
    <p class="cover-meta">整理于 ${esc(today())}</p>
  </header>

  <p class="preface">${esc(preface)}</p>

  ${sections.join('\n')}

  <footer class="colophon">
    <span class="mark">家史馆</span>
    本档案由 FamilyVault 根据家人共同记录的内容自动汇编，原话照录，未作改写。<br>
    收录 ${stats.members} 位家人、${stats.stories} 段口述、${stats.locations} 处地点、${stats.heirlooms} 件传家之物、${stats.capsules} 颗时光胶囊。<br>
    生成时间 ${esc(today())} · 数据来自这个家庭自己的记录。
  </footer>

</div>
</body>
</html>`
}

export default { buildArchiveHtml, archiveStats, archiveGaps, familySurname }
