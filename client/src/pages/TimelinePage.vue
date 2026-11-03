<template>
  <div class="timeline-page">
    <van-nav-bar title="家族年轮" left-arrow @click-left="$router.back()" />

    <!-- 顶部说明 -->
    <div class="timeline-intro">
      <div class="intro-icon"><van-icon name="underway-o" size="20" /></div>
      <div class="intro-text">
        <div class="intro-title">一条时间线，读懂一个家族</div>
        <div class="intro-desc">把成员的岁月、踏过的土地、传下的物件，按年份串成家族的来路</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-row">
      <div
        v-for="f in filters"
        :key="f.key"
        class="filter-chip"
        :class="{ active: activeFilter === f.key }"
        @click="activeFilter = f.key"
      >
        {{ f.label }}
      </div>
    </div>

    <!-- 时间轴 -->
    <div v-if="groups.length" class="timeline">
      <div v-for="group in groups" :key="group.year" class="year-group">
        <div class="year-marker">
          <span class="year-badge">{{ group.year }}</span>
          <span class="year-count">{{ group.items.length }} 件</span>
        </div>
        <div class="timeline-items">
          <div
            v-for="item in group.items"
            :key="item.key"
            class="tl-item"
            :class="`type-${item.type}`"
          >
            <div class="tl-dot"></div>
            <div class="tl-card">
              <div class="tl-head">
                <span class="tl-tag" :class="`tag-${item.type}`">{{ typeLabel(item.type) }}</span>
                <span class="tl-title">{{ item.title }}</span>
              </div>
              <div v-if="item.desc" class="tl-desc">{{ item.desc }}</div>
              <div v-if="item.person" class="tl-person">
                <van-icon name="contact-o" size="12" /> {{ item.person }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon"><van-icon name="underway-o" size="40" color="#b3a28d" /></div>
      <p class="empty-title">家族年轮还是一片空白</p>
      <p class="empty-desc">去「家族图谱」记录成员的重要年份，或在地图、传家宝里留下印记，这里就会自动长出一条家族历史线</p>
      <van-button class="empty-btn" type="primary" round @click="$router.push('/graph')">
        去记录第一位成员
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import storage, { STORAGE_KEYS } from '@/utils/storage'

const filters = [
  { key: 'all', label: '全部' },
  { key: 'event', label: '人生大事' },
  { key: 'location', label: '记忆地点' },
  { key: 'heirloom', label: '传家宝' },
  { key: 'capsule', label: '时光胶囊' }
]
const activeFilter = ref('all')

const typeLabel = (t) => ({
  event: '人生大事',
  location: '记忆地点',
  heirloom: '传家宝',
  capsule: '时光胶囊'
}[t] || t)

// 汇总各模块为统一时间轴条目
const buildItems = () => {
  const items = []

  // 1. 成员人生大事记
  const members = storage.get(STORAGE_KEYS.FAMILY_MEMBERS, [])
  members.forEach(m => {
    ;(m.events || []).forEach(e => {
      const y = parseInt(String(e.year || '').trim(), 10)
      if (!y || isNaN(y)) return
      items.push({
        type: 'event',
        year: y,
        title: e.text || '人生大事',
        person: m.name,
        key: `event-${m.id}-${y}-${e.text || ''}`
      })
    })
    // 出生年份也作为一条大事
    if (m.birthYear) {
      const by = parseInt(String(m.birthYear).trim(), 10)
      if (by && !isNaN(by)) {
        items.push({
          type: 'event',
          year: by,
          title: `${m.name}出生${m.hometown ? '于' + m.hometown : ''}`,
          person: m.name,
          key: `birth-${m.id}-${by}`
        })
      }
    }
  })

  // 2. 记忆地点
  const locations = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, [])
  locations.forEach(loc => {
    const y = parseInt(String(loc.year || '').trim(), 10)
    if (!y || isNaN(y)) return
    items.push({
      type: 'location',
      year: y,
      title: loc.name,
      desc: loc.description || '',
      key: `loc-${loc.id || loc.name}-${y}`
    })
  })

  // 3. 传家宝
  const heirlooms = storage.get(STORAGE_KEYS.HEIRLOOMS, [])
  heirlooms.forEach(h => {
    let y = null
    if (h.year) {
      y = parseInt(String(h.year).trim(), 10)
    } else if (h.created_at) {
      const d = new Date(h.created_at)
      if (!isNaN(d.getTime())) y = d.getFullYear()
    }
    if (!y || isNaN(y)) return
    items.push({
      type: 'heirloom',
      year: y,
      title: h.title,
      desc: h.author_name ? `由 ${h.author_name} 记录` : '',
      key: `heirloom-${h.id || h.title}-${y}`
    })
  })

  // 4. 时光胶囊（以「寄出」意图作为时间锚点，取解锁日期作为未来时间线）
  const capsules = storage.get(STORAGE_KEYS.TIME_CAPSULES, [])
  capsules.forEach(c => {
    const dateStr = c.unlock_date || c.created_at || ''
    const y = parseInt(String(dateStr).slice(0, 4), 10)
    if (!y || isNaN(y)) return
    items.push({
      type: 'capsule',
      year: y,
      title: c.title,
      desc: c.from_person ? `${c.from_person} 写给 ${c.to_person || '未来'}` : '',
      key: `capsule-${c.id || c.title}-${y}`
    })
  })

  return items
}

const items = buildItems()

const groups = computed(() => {
  let list = items
  if (activeFilter.value !== 'all') {
    list = items.filter(i => i.type === activeFilter.value)
  }
  list = list.slice().sort((a, b) => a.year - b.year)
  const map = {}
  list.forEach(i => {
    ;(map[i.year] = map[i.year] || []).push(i)
  })
  return Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .map(year => ({ year, items: map[year] }))
})
</script>

<style scoped>
.timeline-page {
  min-height: 100vh;
  padding-bottom: 40px;
}

.timeline-intro {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin: 16px 16px 0;
  padding: 16px;
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
  border-radius: var(--fv-radius);
  box-shadow: var(--fv-shadow-sm);
}

.intro-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--fv-primary-soft);
  color: var(--fv-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.intro-title {
  font-family: var(--fv-font-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
  margin-bottom: 3px;
}

.intro-desc {
  font-size: 12px;
  color: var(--fv-ink-3);
  line-height: 1.6;
}

.filter-row {
  display: flex;
  gap: 8px;
  padding: 14px 16px 4px;
  overflow-x: auto;
  scrollbar-width: none;
}

.filter-row::-webkit-scrollbar {
  display: none;
}

.filter-chip {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 13px;
  color: var(--fv-ink-3);
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-chip.active {
  color: #fff;
  background: var(--fv-primary);
  border-color: var(--fv-primary);
}

.timeline {
  padding: 12px 16px 0;
}

.year-group {
  margin-bottom: 8px;
}

.year-marker {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 0 10px;
}

.year-badge {
  font-family: var(--fv-font-serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--fv-primary);
  letter-spacing: 0.04em;
}

.year-count {
  font-size: 12px;
  color: var(--fv-ink-4);
  background: var(--fv-surface);
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid var(--fv-border-soft);
}

.timeline-items {
  position: relative;
  padding-left: 20px;
}

.timeline-items::before {
  content: '';
  position: absolute;
  left: 5px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: var(--fv-border);
}

.tl-item {
  position: relative;
  margin-bottom: 12px;
}

.tl-dot {
  position: absolute;
  left: -20px;
  top: 14px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--fv-primary);
  border: 2px solid var(--fv-paper);
  box-shadow: 0 0 0 2px var(--fv-primary-soft);
}

.type-location .tl-dot { background: #4a6b7c; box-shadow: 0 0 0 2px #e9eef1; }
.type-heirloom .tl-dot { background: #c99a5b; box-shadow: 0 0 0 2px #f6ead6; }
.type-capsule .tl-dot { background: #9c5b6b; box-shadow: 0 0 0 2px #f6e9ec; }

.tl-card {
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
  border-radius: var(--fv-radius);
  padding: 12px 14px;
  box-shadow: var(--fv-shadow-sm);
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.tl-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
  flex-shrink: 0;
}

.tag-event { background: var(--fv-primary-soft); color: var(--fv-primary); }
.tag-location { background: #e9eef1; color: #4a6b7c; }
.tag-heirloom { background: #f6ead6; color: #b8834a; }
.tag-capsule { background: #f6e9ec; color: #9c5b6b; }

.tl-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fv-ink);
}

.tl-desc {
  font-size: 12px;
  color: var(--fv-ink-3);
  margin-top: 5px;
  line-height: 1.5;
}

.tl-person {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--fv-ink-4);
  margin-top: 6px;
}

.empty-state {
  text-align: center;
  padding: 60px 32px;
}

.empty-icon {
  margin-bottom: 16px;
}

.empty-title {
  font-family: var(--fv-font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--fv-ink-2);
  margin: 0 0 8px;
}

.empty-desc {
  font-size: 13px;
  color: var(--fv-ink-3);
  line-height: 1.7;
  margin: 0 0 24px;
}

.empty-btn {
  height: 44px;
  padding: 0 32px;
}
</style>
