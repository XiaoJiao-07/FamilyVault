<template>
  <div class="search-page">
    <van-nav-bar title="搜索" left-arrow @click-left="goHome">
      <template #right>
        <van-icon name="search" size="18" />
      </template>
    </van-nav-bar>

    <!-- 搜索框 -->
    <div class="search-bar">
      <van-search
        v-model="searchQuery"
        placeholder="搜索家族故事、成员、地点..."
        shape="round"
        autofocus
        @search="onSearch"
        @clear="onClear"
        @update:model-value="onInput"
      />
    </div>

    <!-- 热门搜索 -->
    <div v-if="!searchQuery && !isSearching" class="hot-search">
      <h3 class="section-title">热门搜索</h3>
      <div class="tag-cloud">
        <van-tag
          v-for="tag in hotTags"
          :key="tag"
          plain
          type="primary"
          size="medium"
          class="hot-tag"
          @click="searchTag(tag)"
        >
          {{ tag }}
        </van-tag>
      </div>
    </div>

    <!-- 搜索历史 -->
    <div v-if="!searchQuery && !isSearching && searchHistory.length > 0" class="search-history">
      <div class="section-header">
        <h3 class="section-title">搜索历史</h3>
        <van-icon name="delete-o" @click="clearHistory" />
      </div>
      <div class="history-list">
        <div
          v-for="(item, index) in searchHistory"
          :key="index"
          class="history-item"
          @click="searchTag(item)"
        >
          <van-icon name="clock-o" />
          <span>{{ item }}</span>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div v-if="isSearching" class="search-results">
      <van-loading v-if="isLoading" class="loading" />

      <template v-else>
        <div v-if="searchResults.length === 0" class="empty-state">
          <van-icon name="search" size="48" color="#ddd" />
          <p>未找到「{{ searchQuery }}」相关的内容</p>
          <p class="empty-tip">试试其他关键词，或先去家族图谱、记忆地图、传家宝里记录一些故事</p>
        </div>

        <div v-else class="results-list">
          <div
            v-for="result in searchResults"
            :key="result.id"
            class="result-item"
            @click="goToResult(result)"
          >
            <div class="result-icon" :style="{ background: result.color }">
              {{ result.icon }}
            </div>
            <div class="result-content">
              <div class="result-title">{{ result.title }}</div>
              <div class="result-desc">{{ result.description }}</div>
              <div class="result-meta">
                <van-tag size="small" :type="result.tagType">{{ result.category }}</van-tag>
                <span class="result-time">{{ result.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import storage, { STORAGE_KEYS } from '@/utils/storage'

const router = useRouter()
// 统一回首页：不逐页后退
const goHome = () => router.replace('/')
const searchQuery = ref('')
const isSearching = ref(false)
const isLoading = ref(false)
const searchResults = ref([])
const searchHistory = ref([])

const hotTags = ['爷爷', '奶奶', '老家', '红烧肉', '结婚', '童年', '迁徙', '家训']

// 结果配色与图标（沿用各模块既有主题色）
const TYPE_META = {
  member: { icon: '👤', color: 'linear-gradient(135deg, #b7cfa4, #8fc9b4)', category: '成员', tagType: 'primary' },
  interview: { icon: '🎙️', color: 'linear-gradient(135deg, var(--fv-primary), var(--fv-primary-deep))', category: '采访', tagType: 'primary' },
  location: { icon: '📍', color: 'linear-gradient(135deg, #a9c6d6, #7fb3c4)', category: '地图', tagType: 'success' },
  heirloom: { icon: '🏺', color: 'linear-gradient(135deg, #e6c9a3, #c99a5b)', category: '传家宝', tagType: 'warning' },
  capsule: { icon: '⏳', color: 'linear-gradient(135deg, #b9a8d8, #9c5b6b)', category: '胶囊', tagType: 'danger' }
}

// 相对时间（用于结果时间展示）
const formatRelativeTime = (iso) => {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  const day = 86400000
  if (diff < day) return '今天'
  if (diff < 2 * day) return '昨天'
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`
  if (diff < 30 * day) return `${Math.floor(diff / (7 * day))}周前`
  return `${Math.floor(diff / (30 * day))}个月前`
}

// 构建可搜索的真实数据索引
const buildSearchIndex = () => {
  const index = []
  const members = storage.get(STORAGE_KEYS.FAMILY_MEMBERS, []) || []
  const locations = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, []) || []
  const capsules = storage.get(STORAGE_KEYS.TIME_CAPSULES, []) || []
  const heirlooms = storage.get(STORAGE_KEYS.HEIRLOOMS, []) || []
  const sessions = storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, []) || []

  // 成员（含人生大事）
  members.forEach(m => {
    if (!m) return
    const events = Array.isArray(m.events) ? m.events : []
    const haystack = [
      m.name, m.hometown, m.occupation, m.bio,
      m.birthYear != null ? String(m.birthYear) : '',
      ...events.map(e => `${e.year || ''} ${e.text || ''}`)
    ].filter(Boolean).join(' ')
    index.push({
      id: `member-${m.id}`,
      type: 'member',
      title: m.name,
      description: [m.gender, m.birthYear ? `${m.birthYear}年生` : '', m.hometown].filter(Boolean).join(' · ') || '家族成员',
      haystack,
      time: m.updated_at || m.created_at || '',
      raw: m
    })
  })

  // 记忆地点
  locations.forEach(l => {
    if (!l) return
    index.push({
      id: `location-${l.id || l.name}`,
      type: 'location',
      title: l.name,
      description: [l.year ? `${l.year}年` : '', l.description].filter(Boolean).join(' · ') || '记忆地点',
      haystack: [l.name, l.year, l.description].filter(Boolean).join(' '),
      time: l.created_at || '',
      raw: l
    })
  })

  // 传家宝
  heirlooms.forEach(h => {
    if (!h) return
    index.push({
      id: `heirloom-${h.id || h.title}`,
      type: 'heirloom',
      title: h.title,
      description: [h.type, h.author_name || '匿名'].filter(Boolean).join(' · ') || '传家宝',
      haystack: [h.title, h.type, h.author_name, h.description, h.story].filter(Boolean).join(' '),
      time: h.created_at || '',
      raw: h
    })
  })

  // 时光胶囊
  capsules.forEach(c => {
    if (!c) return
    index.push({
      id: `capsule-${c.id || c.title}`,
      type: 'capsule',
      title: c.title,
      description: [c.to_person ? `给 ${c.to_person}` : '', c.unlock_date ? `${c.unlock_date} 解锁` : ''].filter(Boolean).join(' · ') || '时光胶囊',
      haystack: [c.title, c.content, c.from_person, c.to_person].filter(Boolean).join(' '),
      time: c.created_at || '',
      raw: c
    })
  })

  // 采访会话
  sessions.forEach(s => {
    if (!s) return
    const name = s.interviewee?.name || ''
    const msgs = Array.isArray(s.messages) ? s.messages : []
    const transcript = msgs.map(m => m.text || '').join(' ')
    index.push({
      id: `interview-${s.id}`,
      type: 'interview',
      title: name ? `与${name}的采访` : '采访记录',
      description: `${msgs.length} 条对话`,
      haystack: [name, transcript].filter(Boolean).join(' '),
      time: s.date || s.created_at || '',
      raw: s
    })
  })

  return index
}

const onSearch = () => {
  if (!searchQuery.value.trim()) return
  saveToHistory(searchQuery.value.trim())
  performSearch(searchQuery.value.trim())
}

const onInput = (value) => {
  if (value.trim()) {
    performSearch(value.trim())
  } else {
    isSearching.value = false
    searchResults.value = []
  }
}

const onClear = () => {
  isSearching.value = false
  searchResults.value = []
}

const performSearch = (query) => {
  const q = query.trim().toLowerCase()
  if (!q) {
    isSearching.value = false
    searchResults.value = []
    return
  }
  isLoading.value = true
  isSearching.value = true

  // 真实数据即时搜索（无需假延迟）
  const all = buildSearchIndex()
  searchResults.value = all
    .filter(item => item.haystack.toLowerCase().includes(q))
    .map(item => {
      const meta = TYPE_META[item.type] || TYPE_META.member
      return {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        icon: meta.icon,
        color: meta.color,
        category: meta.category,
        tagType: meta.tagType,
        time: formatRelativeTime(item.time),
        raw: item.raw
      }
    })
  isLoading.value = false
}

const searchTag = (tag) => {
  searchQuery.value = tag
  saveToHistory(tag)
  performSearch(tag)
}

const saveToHistory = (query) => {
  const q = query.trim()
  if (!q) return
  const index = searchHistory.value.indexOf(q)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
  searchHistory.value.unshift(q)
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

// 跳转到对应模块，并尽量带上定位信息
const goToResult = (result) => {
  const routes = {
    interview: '/interview',
    heirloom: '/heirloom',
    location: '/map',
    member: '/graph',
    capsule: '/capsule'
  }
  const path = routes[result.type] || '/'
  // 尝试传递待高亮/选中的 id，供目标页定位
  if (result.raw?.id != null) {
    router.push({ path, query: { focus: String(result.raw.id) } })
  } else {
    router.push(path)
  }
}

onMounted(() => {
  const saved = localStorage.getItem('searchHistory')
  if (saved) {
    try {
      searchHistory.value = JSON.parse(saved)
    } catch (e) {
      searchHistory.value = []
    }
  }
})
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: var(--fv-surface-soft);
}

.search-bar {
  background: var(--fv-surface);
}

.hot-search, .search-history {
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--fv-ink-2);
  margin: 0 0 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.hot-tag {
  cursor: pointer;
}

.history-list {
  background: var(--fv-surface);
  border-radius: 8px;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--fv-border-soft);
  cursor: pointer;
  font-size: 14px;
  color: var(--fv-ink);
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:active {
  background: var(--fv-surface-soft);
}

.search-results {
  padding: 16px;
}

.loading {
  display: flex;
  justify-content: center;
  padding: 40px;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--fv-ink-3);
}

.empty-state p {
  margin: 16px 0 0;
  font-size: 14px;
}

.empty-tip {
  color: var(--fv-ink-4);
  font-size: 13px;
  line-height: 1.6;
  padding: 0 24px;
}

.results-list {
  background: var(--fv-surface);
  border-radius: 12px;
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid var(--fv-border-soft);
  cursor: pointer;
  transition: background 0.2s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:active {
  background: var(--fv-surface-soft);
}

.result-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.result-content {
  flex: 1;
  margin-left: 12px;
  min-width: 0;
}

.result-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--fv-ink);
  margin-bottom: 4px;
}

.result-desc {
  font-size: 13px;
  color: var(--fv-ink-3);
  margin-bottom: 6px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-time {
  font-size: 12px;
  color: var(--fv-ink-4);
}
</style>
