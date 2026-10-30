<template>
  <div class="search-page">
    <van-nav-bar title="搜索" left-arrow @click-left="$router.back()">
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
          <p>未找到相关结果</p>
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

const router = useRouter()
const searchQuery = ref('')
const isSearching = ref(false)
const isLoading = ref(false)
const searchResults = ref([])
const searchHistory = ref([])

const hotTags = ['爷爷', '奶奶', '老家', '红烧肉', '结婚', '童年', '迁徙', '家训']

// 模拟搜索数据
const mockData = [
  {
    id: 1,
    type: 'interview',
    title: '爷爷的童年故事',
    description: 'AI 采访 · 12 条对话',
    icon: '👴',
    color: 'linear-gradient(135deg, #667eea, #764ba2)',
    category: '采访',
    tagType: 'primary',
    time: '昨天',
    keywords: ['爷爷', '童年', '故事']
  },
  {
    id: 2,
    type: 'heirloom',
    title: '奶奶的红烧肉',
    description: '传家宝 · 菜谱',
    icon: '👵',
    color: 'linear-gradient(135deg, #f093fb, #f5576c)',
    category: '传家宝',
    tagType: 'danger',
    time: '3天前',
    keywords: ['奶奶', '红烧肉', '菜谱']
  },
  {
    id: 3,
    type: 'location',
    title: '爷爷的老家',
    description: '记忆地图 · 湖北武汉',
    icon: '📍',
    color: 'linear-gradient(135deg, #4facfe, #00f2fe)',
    category: '地图',
    tagType: 'success',
    time: '1周前',
    keywords: ['爷爷', '老家', '湖北', '武汉']
  },
  {
    id: 4,
    type: 'member',
    title: '爸爸',
    description: '家族图谱 · 1978年生',
    icon: '👨',
    color: 'linear-gradient(135deg, #43e97b, #38f9d7)',
    category: '成员',
    tagType: 'primary',
    time: '2周前',
    keywords: ['爸爸', '父亲']
  },
  {
    id: 5,
    type: 'capsule',
    title: '给 2035 年的你',
    description: '时光胶囊 · 未解锁',
    icon: '💊',
    color: 'linear-gradient(135deg, #fa709a, #fee140)',
    category: '胶囊',
    tagType: 'warning',
    time: '1个月前',
    keywords: ['未来', '胶囊']
  }
]

const onSearch = () => {
  if (!searchQuery.value.trim()) return

  // 保存到历史
  saveToHistory(searchQuery.value)

  performSearch(searchQuery.value)
}

const onInput = (value) => {
  if (value.trim()) {
    performSearch(value)
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
  isLoading.value = true
  isSearching.value = true

  // 模拟搜索延迟
  setTimeout(() => {
    const lowerQuery = query.toLowerCase()
    searchResults.value = mockData.filter(item =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    )
    isLoading.value = false
  }, 300)
}

const searchTag = (tag) => {
  searchQuery.value = tag
  saveToHistory(tag)
  performSearch(tag)
}

const saveToHistory = (query) => {
  const index = searchHistory.value.indexOf(query)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
  }
  searchHistory.value.unshift(query)
  if (searchHistory.value.length > 10) {
    searchHistory.value = searchHistory.value.slice(0, 10)
  }
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory.value))
}

const clearHistory = () => {
  searchHistory.value = []
  localStorage.removeItem('searchHistory')
}

const goToResult = (result) => {
  const routes = {
    interview: '/interview',
    heirloom: '/heirloom',
    location: '/map',
    member: '/graph',
    capsule: '/capsule'
  }
  router.push(routes[result.type] || '/')
}

onMounted(() => {
  const saved = localStorage.getItem('searchHistory')
  if (saved) {
    searchHistory.value = JSON.parse(saved)
  }
})
</script>

<style scoped>
.search-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.search-bar {
  background: white;
}

.hot-search, .search-history {
  padding: 16px;
}

.section-title {
  font-size: 14px;
  font-weight: 500;
  color: #666;
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
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  font-size: 14px;
  color: #333;
}

.history-item:last-child {
  border-bottom: none;
}

.history-item:active {
  background: #f7f8fa;
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
  color: #999;
}

.empty-state p {
  margin: 16px 0 0;
  font-size: 14px;
}

.results-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.result-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  transition: background 0.2s;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:active {
  background: #f7f8fa;
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
  color: #333;
  margin-bottom: 4px;
}

.result-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 6px;
}

.result-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.result-time {
  font-size: 12px;
  color: #bbb;
}
</style>
