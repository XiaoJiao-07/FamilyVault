<template>
  <div class="stories-page">
    <van-nav-bar title="故事记录" left-arrow @click-left="goHome" />

    <!-- 一段记录都没有：直接引导去采访 -->
    <EmptyState
      v-if="!stories.length"
      icon="chat-o"
      title="还没有故事记录"
      desc="每完成一次采访，这里就会多一段记录。趁长辈还记得，先聊一段吧。"
      action-text="去采访一位家人"
      @action="goInterview"
    />

    <template v-else>
      <div class="stories-summary">
        共 <b>{{ stories.length }}</b> 段记录 · {{ totalTurns }} 条对话
      </div>

      <div class="stories-list">
        <div
          v-for="s in stories"
          :key="s.id"
          class="story-card"
          @click="openStory(s)"
        >
          <div class="story-avatar" :style="{ background: s.color }">
            {{ s.initial }}
          </div>
          <div class="story-main">
            <div class="story-row">
              <span class="story-name">{{ s.name }}</span>
              <span v-if="s.storyYear" class="story-year">{{ s.storyYear }}</span>
              <span class="story-date">{{ s.date }}</span>
            </div>
            <p v-if="s.preview" class="story-preview">{{ s.preview }}</p>
            <div class="story-meta">
              {{ s.turns }} 条对话 · {{ s.durationText }}
            </div>
          </div>
          <van-icon name="arrow" size="14" color="var(--fv-ink-4)" />
        </div>
      </div>
    </template>

    <!-- 一段记录的完整内容 -->
    <van-popup v-model:show="showDetail" position="bottom" round :style="{ height: '88%' }">
      <div v-if="current" class="rec-detail">
        <div class="rec-head">
          <van-icon name="arrow-left" size="18" @click="showDetail = false" />
          <span class="rec-title">与{{ current.name }}的记录</span>
          <van-icon name="down" size="18" @click="exportStory" />
        </div>

        <div class="rec-meta">
          <span>{{ current.date }}</span>
          <span>{{ current.durationText }}</span>
          <span>{{ current.turns }} 条对话</span>
          <span class="rec-year" :class="{ empty: !current.storyYear }" @click="openYearAsk">
            {{ current.storyYear ? `${current.storyYear} 年的事` : '标个年份' }}
          </span>
        </div>

        <div class="rec-body">
          <div
            v-for="(msg, idx) in current.messages"
            :key="idx"
            class="rec-msg"
            :class="msg.role === 'ai' ? 'is-ai' : 'is-me'"
          >
            <div class="rec-msg__who">{{ msg.role === 'ai' ? '采访助手' : current.name }}</div>
            <div class="rec-msg__bubble">{{ msg.text }}</div>
            <div v-if="msg.time" class="rec-msg__time">{{ msg.time }}</div>
          </div>
        </div>
      </div>
    </van-popup>

    <!-- 标注这段故事发生的年份 -->
    <van-popup v-model:show="showYearAsk" position="bottom" round>
      <div class="year-ask">
        <div class="ya-head">
          <h3>这段故事，是哪一年的事？</h3>
          <p>标上年份，它就能进「家族年轮」，和家人的出生、搬迁排在同一条线上。</p>
        </div>
        <div v-if="yearSuggestions.length" class="ya-chips">
          <span class="ya-chip-label">原话里提到过</span>
          <span
            v-for="y in yearSuggestions"
            :key="y"
            class="ya-chip"
            :class="{ active: String(yearDraft) === String(y) }"
            @click="yearDraft = String(y)"
          >{{ y }}</span>
        </div>
        <div class="ya-input">
          <input
            v-model="yearDraft"
            type="tel"
            inputmode="numeric"
            maxlength="4"
            placeholder="比如 1980"
          />
          <span>年</span>
        </div>
        <div class="ya-foot">
          <van-button round block type="primary" @click="saveYear">就记这一年</van-button>
          <van-button v-if="current && current.storyYear" round block plain @click="clearYear">
            清掉年份
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import EmptyState from '@/components/EmptyState.vue'
import { guessStoryYear, suggestStoryYears, normalizeStoryYear } from '@/utils/storyYear'

const router = useRouter()
const goHome = () => router.replace('/')
const goInterview = () => router.push('/interview')

const showDetail = ref(false)
const showYearAsk = ref(false)
const yearDraft = ref('')
const yearSuggestions = ref([])
const current = ref(null)
// storage 不是响应式的，改完年份用它把列表推一下
const version = ref(0)

const formatDuration = (seconds) => {
  const s = Number(seconds) || 0
  if (!s) return '时长未记'
  const mins = Math.floor(s / 60)
  if (mins < 1) return `${s}秒`
  return `${mins}分钟`
}

const stories = computed(() => {
  version.value // 依赖它，改完年份才重新算
  const raw = storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, [])
  const list = Array.isArray(raw) ? raw : []
  return list
    .filter((s) => s && Array.isArray(s.messages) && s.messages.length)
    .map((s) => {
      const person = s.interviewee || {}
      const name = person.name || '未署名'
      const messages = s.messages.filter((m) => m && m.text)
      // 预览优先用长辈自己说的话，那才是"故事"
      const firstSaid = messages.find((m) => m.role !== 'ai')
      const preview = String((firstSaid || messages[0])?.text || '').replace(/\s+/g, ' ').slice(0, 46)
      return {
        id: s.id || `${name}-${s.date || ''}`,
        rawId: s.id,
        storyYear: Number(s.storyYear) || null,
        name,
        initial: name.charAt(0),
        color: person.color || '#9C5B6B',
        date: s.date || '',
        durationText: formatDuration(s.duration),
        turns: messages.length,
        preview,
        messages
      }
    })
})

const totalTurns = computed(() => stories.value.reduce((n, s) => n + s.turns, 0))

const openStory = (s) => {
  current.value = s
  showDetail.value = true
}

/* ---------- 故事年份 ---------- */

const findRaw = () => {
  if (!current.value) return null
  const raw = storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, [])
  if (!Array.isArray(raw)) return null
  return raw.find((s) => s && String(s.id) === String(current.value.rawId)) || null
}

const openYearAsk = () => {
  if (!current.value) return
  const session = findRaw()
  const guess = current.value.storyYear || guessStoryYear(session)
  yearDraft.value = guess ? String(guess) : ''
  yearSuggestions.value = suggestStoryYears(session).filter((y) => y !== guess)
  showYearAsk.value = true
}

const writeYear = (year) => {
  const raw = storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, [])
  if (!Array.isArray(raw)) return false
  const idx = raw.findIndex((s) => s && String(s.id) === String(current.value?.rawId))
  if (idx < 0) return false
  const next = raw.slice()
  next[idx] = { ...next[idx] }
  if (year) next[idx].storyYear = year
  else delete next[idx].storyYear
  storage.set(STORAGE_KEYS.INTERVIEW_SESSIONS, next)
  current.value = { ...current.value, storyYear: year || null }
  version.value += 1
  return true
}

const saveYear = () => {
  const y = normalizeStoryYear(yearDraft.value)
  if (!y) {
    showToast('填一个四位数年份，比如 1980')
    return
  }
  if (!writeYear(y)) {
    showToast('没找到这条记录')
    return
  }
  showYearAsk.value = false
  showToast(`已记为 ${y} 年的事`)
}

const clearYear = () => {
  if (!writeYear(null)) return
  showYearAsk.value = false
  showToast('年份已清掉')
}

const exportStory = () => {
  const s = current.value
  if (!s) return
  let text = `故事记录：${s.name}\n时间：${s.date}\n${s.durationText} · ${s.turns} 条对话\n\n`
  s.messages.forEach((m) => {
    text += `【${m.role === 'ai' ? '采访助手' : s.name}】${m.time || ''}\n${m.text}\n\n`
  })
  try {
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `故事记录_${s.name}.txt`
    a.click()
    URL.revokeObjectURL(url)
    showToast('已导出')
  } catch {
    showToast('导出失败，请稍后再试')
  }
}
</script>

<style scoped>
.stories-page {
  min-height: calc(100vh - 54px);
  background: var(--fv-paper);
}

.stories-summary {
  padding: 16px 16px 8px;
  font-size: 12px;
  color: var(--fv-ink-3);
  letter-spacing: 0.02em;
}

.stories-summary b {
  color: var(--fv-primary);
  font-family: var(--fv-font-serif);
  font-size: 14px;
}

.stories-list {
  padding: 6px 16px 28px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.story-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
  border-radius: 16px;
  box-shadow: var(--fv-shadow-sm);
  cursor: pointer;
  transition: transform 0.16s;
}

.story-card:active {
  transform: scale(0.985);
}

.story-avatar {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  flex-shrink: 0;
}

.story-main {
  flex: 1;
  min-width: 0;
}

.story-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.story-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
}

.story-date {
  font-size: 11px;
  color: var(--fv-ink-4);
  flex-shrink: 0;
}

.story-year {
  flex-shrink: 0;
  font-family: var(--fv-font-serif);
  font-size: 12px;
  font-weight: 600;
  color: var(--fv-primary);
  background: var(--fv-primary-soft);
  border: 1px solid var(--fv-border-warm);
  border-radius: 8px;
  padding: 1px 7px;
}

.story-year + .story-date {
  margin-left: auto;
}

.story-preview {
  margin: 5px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--fv-ink-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-meta {
  margin-top: 6px;
  font-size: 11px;
  color: var(--fv-ink-4);
}

/* ---------- 详情 ---------- */
.rec-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.rec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--fv-border-soft);
}

.rec-title {
  font-family: var(--fv-font-serif);
  font-size: 16px;
  color: var(--fv-ink);
}

.rec-meta {
  display: flex;
  gap: 14px;
  padding: 10px 16px;
  font-size: 11px;
  color: var(--fv-ink-4);
}

.rec-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 4px 16px 32px;
}

.rec-msg {
  margin-bottom: 16px;
}

.rec-msg__who {
  font-size: 11px;
  color: var(--fv-ink-4);
  margin-bottom: 4px;
}

.rec-msg__bubble {
  display: inline-block;
  max-width: 100%;
  padding: 10px 13px;
  border-radius: 14px;
  font-size: 14px;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
}

.rec-msg.is-ai .rec-msg__bubble {
  background: var(--fv-surface-cream);
  border: 1px solid var(--fv-border-cream);
  color: var(--fv-ink-2);
  border-top-left-radius: 4px;
}

.rec-msg.is-me .rec-msg__bubble {
  background: var(--fv-primary-soft);
  border: 1px solid var(--fv-border-warm);
  color: var(--fv-ink);
  border-top-left-radius: 14px;
  border-top-right-radius: 4px;
}

.rec-msg.is-me {
  text-align: right;
}

.rec-msg.is-me .rec-msg__who {
  text-align: right;
}

.rec-msg__time {
  font-size: 10px;
  color: var(--fv-ink-4);
  margin-top: 4px;
}

/* ---------- 故事年份 ---------- */
.rec-year {
  margin-left: auto;
  color: var(--fv-primary);
  font-family: var(--fv-font-serif);
  padding: 1px 8px;
  border-radius: 8px;
  background: var(--fv-primary-soft);
  border: 1px solid var(--fv-border-warm);
  cursor: pointer;
}

.rec-year.empty {
  color: var(--fv-ink-3);
  background: transparent;
  border-color: var(--fv-border);
}

.year-ask {
  padding: 22px 20px 24px;
}

.ya-head h3 {
  margin: 0 0 8px;
  font-family: var(--fv-font-serif);
  font-size: 18px;
  color: var(--fv-ink);
}

.ya-head p {
  margin: 0 0 16px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--fv-ink-3);
}

.ya-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.ya-chip-label {
  font-size: 11px;
  color: var(--fv-ink-4);
}

.ya-chip {
  padding: 5px 12px;
  border-radius: 14px;
  font-size: 13px;
  color: var(--fv-ink-2);
  background: var(--fv-surface-cream);
  border: 1px solid var(--fv-border-cream);
  font-family: var(--fv-font-serif);
  cursor: pointer;
}

.ya-chip.active {
  color: #fff;
  background: var(--fv-primary);
  border-color: var(--fv-primary);
}

.ya-input {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 0 14px;
  height: 52px;
  border-radius: 14px;
  background: var(--fv-paper);
  border: 1px solid var(--fv-border);
}

.ya-input input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 20px;
  letter-spacing: 0.08em;
  color: var(--fv-ink);
  font-family: var(--fv-font-serif);
}

.ya-input input::placeholder {
  font-size: 15px;
  letter-spacing: 0;
  color: var(--fv-ink-4);
}

.ya-input span {
  font-size: 14px;
  color: var(--fv-ink-3);
}

.ya-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
</style>
