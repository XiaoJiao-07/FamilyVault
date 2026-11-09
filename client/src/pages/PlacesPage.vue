<template>
  <div class="places-page">
    <van-nav-bar title="记忆地点" left-arrow @click-left="goHome">
      <template #right>
        <span class="nav-add" @click="goMap">＋ 添加</span>
      </template>
    </van-nav-bar>

    <EmptyState
      v-if="!places.length"
      icon="location-o"
      title="还没有记忆地点"
      desc="说一句「我爸 1980 年在武汉大学读书」，地图会把它钉在家人的足迹上。"
      action-text="去地图上标一个"
      @action="goMap"
    />

    <template v-else>
      <div class="places-summary">
        共 <b>{{ places.length }}</b> 个地方
        <span v-if="spanText" class="places-span">· {{ spanText }}</span>
      </div>

      <!-- 同名同年的重复地点：不自动删，先说清楚，人点了才动手 -->
      <div v-if="dupeGroups.length" class="dupe-bar" @click="showDupes = true">
        <van-icon name="info-o" size="16" class="dupe-icon" />
        <div class="dupe-copy">
          发现 <b>{{ dupeGroups.length }}</b> 组重复地点
          <span>同一处被记了不止一次，可以并成一条</span>
        </div>
        <span class="dupe-action">处理</span>
      </div>

      <div class="places-list">
        <div v-for="p in places" :key="p.id" class="place-card" @click="openPlace(p)">
          <div class="place-year">{{ p.year || '—' }}</div>
          <div class="place-main">
            <div class="place-name">{{ p.name }}</div>
            <p v-if="p.description" class="place-desc">{{ p.description }}</p>
            <p v-if="p.address" class="place-addr">
              <van-icon name="aim" size="11" /> {{ p.address }}
            </p>
            <p v-else-if="!validCoord(p)" class="place-warn">还没定位，点进去标一下位置</p>
          </div>
          <van-icon name="arrow" size="14" color="var(--fv-ink-4)" />
        </div>
      </div>

      <div class="places-foot">点一条，在地图上看看这个地方</div>
    </template>

    <!-- 地点详情 -->
    <van-popup v-model:show="showDetail" position="bottom" round>
      <div v-if="current" class="place-detail">
        <div class="pd-head">
          <h3>{{ current.name }}</h3>
          <p class="pd-meta">
            <span v-if="current.year">{{ current.year }}年</span>
            <span v-if="current.year && current.description"> · </span>
            <span>{{ current.description || '没有写描述' }}</span>
          </p>
          <p v-if="current.address" class="pd-addr">
            <van-icon name="aim" size="12" /> {{ current.address }}
          </p>
        </div>
        <div class="pd-actions">
          <van-button round block type="primary" @click="viewOnMap">
            <van-icon name="location-o" size="16" style="margin-right: 6px" />在地图上看
          </van-button>
          <van-button round block plain class="pd-danger" @click="confirmDelete">
            <van-icon name="delete-o" size="16" style="margin-right: 6px" />删掉这个地点
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 重复地点处理 -->
    <van-popup v-model:show="showDupes" position="bottom" round :style="{ maxHeight: '82%' }">
      <div class="dupe-sheet">
        <div class="ds-head">
          <h3>重复地点</h3>
          <p>合并后只留信息最全的一条：描述、地址、坐标都会保留下来，不会丢内容。</p>
        </div>
        <div class="ds-body">
          <div v-for="g in dupeGroups" :key="g.key" class="ds-group">
            <div class="ds-group-head">
              <span class="ds-name">{{ g.name }}</span>
              <span v-if="g.year" class="ds-year">{{ g.year }}年</span>
              <span class="ds-count">{{ g.items.length }} 条</span>
            </div>
            <div v-for="it in g.items" :key="it.id" class="ds-item">
              <span class="ds-item-state" :class="{ ok: hasCoord(it) }">
                {{ hasCoord(it) ? '已定位' : '未定位' }}
              </span>
              <span class="ds-item-desc">{{ shortDesc(it) }}</span>
              <span v-if="keeperId(g) === String(it.id)" class="ds-keep">保留</span>
            </div>
          </div>
        </div>
        <div class="ds-foot">
          <van-button round block type="primary" @click="applyMerge">
            合并，并掉 {{ dupeRemovable }} 条
          </van-button>
          <van-button round block plain @click="showDupes = false">先不动</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import EmptyState from '@/components/EmptyState.vue'
import { findDuplicateGroups, mergeDuplicates, hasCoord, pickKeeper } from '@/utils/placeDupes'

const router = useRouter()
const goHome = () => router.replace('/')
const goMap = () => router.push('/map')

const showDetail = ref(false)
const current = ref(null)
// 用函数声明而不是 const：places 初始化时就要用到它
function sortByYear(list) {
  return [...list].sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0))
}

const showDupes = ref(false)
const places = ref(load())

function load() {
  const raw = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, [])
  const list = Array.isArray(raw) ? raw : []
  return sortByYear(list)
}

const validCoord = (p) =>
  Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) &&
  Math.abs(Number(p.latitude)) <= 90 && Math.abs(Number(p.longitude)) <= 180 &&
  Number(p.latitude) !== 0 && Number(p.longitude) !== 0

const dupeGroups = computed(() => findDuplicateGroups(places.value))
const dupeRemovable = computed(() =>
  dupeGroups.value.reduce((n, g) => n + g.items.length - 1, 0)
)

const shortDesc = (p) => {
  const text = String(p.description || '').trim() || String(p.address || '').trim()
  if (text) return text.slice(0, 34)
  // 描述和地址都空：把坐标摆出来，好认出哪条是点歪的那个
  if (hasCoord(p)) return `坐标 ${Number(p.latitude).toFixed(4)}, ${Number(p.longitude).toFixed(4)}`
  return '没有描述'
}

const keeperId = (g) => {
  const k = pickKeeper(g.items)
  return k ? String(k.id) : ''
}

const applyMerge = async () => {
  const groups = dupeGroups.value.length
  if (!groups) return
  try {
    await showConfirmDialog({
      title: '合并重复地点',
      message: `将把 ${groups} 组共 ${dupeRemovable.value} 条重复记录并掉，只留每条里信息最全的那一份。此操作不能撤销。`,
      confirmButtonText: '合并',
      confirmButtonColor: '#B4442E'
    })
  } catch {
    return
  }
  const { next, removed } = mergeDuplicates(places.value)
  const sorted = sortByYear(next)
  storage.set(STORAGE_KEYS.MEMORY_LOCATIONS, sorted)
  places.value = sorted
  showDupes.value = false
  showToast(removed ? `已并掉 ${removed} 条` : '没有需要合并的')
}

const spanText = computed(() => {
  const years = places.value.map((p) => Number(p.year)).filter((y) => y > 0)
  if (years.length < 2) return ''
  const min = Math.min(...years)
  const max = Math.max(...years)
  return min === max ? `${min}年` : `${min} — ${max} 年`
})

const openPlace = (p) => {
  current.value = p
  showDetail.value = true
}

const viewOnMap = () => {
  const p = current.value
  if (!p) return
  showDetail.value = false
  router.push(`/map?focus=${encodeURIComponent(p.id)}`)
}

const confirmDelete = () => {
  const p = current.value
  if (!p) return
  showConfirmDialog({
    title: '删除地点',
    message: `确定删除「${p.name}」吗？删掉后不能恢复。`,
    confirmButtonText: '删除',
    confirmButtonColor: '#B4442E'
  })
    .then(() => {
      const next = places.value.filter((x) => String(x.id) !== String(p.id))
      storage.set(STORAGE_KEYS.MEMORY_LOCATIONS, next)
      places.value = next
      current.value = null
      showDetail.value = false
      showToast('已删除')
    })
    .catch(() => {})
}
</script>

<style scoped>
.places-page {
  min-height: calc(100vh - 54px);
  background: var(--fv-paper);
}

.nav-add {
  font-size: 13px;
  color: var(--fv-primary);
  font-weight: 500;
}

.places-summary {
  padding: 16px 16px 8px;
  font-size: 12px;
  color: var(--fv-ink-3);
}

.places-summary b {
  color: var(--fv-primary);
  font-family: var(--fv-font-serif);
  font-size: 14px;
}

.places-span {
  color: var(--fv-ink-4);
}

.places-list {
  padding: 6px 16px 8px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.place-card {
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

.place-card:active {
  transform: scale(0.985);
}

.place-year {
  min-width: 54px;
  padding: 5px 8px;
  border-radius: 10px;
  background: var(--fv-primary-soft);
  border: 1px solid var(--fv-border-warm);
  color: var(--fv-primary);
  font-family: var(--fv-font-serif);
  font-size: 13px;
  text-align: center;
  flex-shrink: 0;
}

.place-main {
  flex: 1;
  min-width: 0;
}

.place-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
}

.place-desc {
  margin: 4px 0 0;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--fv-ink-2);
}

.place-addr {
  margin: 5px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--fv-ink-4);
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.place-warn {
  margin: 5px 0 0;
  font-size: 11px;
  color: var(--fv-primary);
}

.places-foot {
  text-align: center;
  font-size: 11px;
  color: var(--fv-ink-4);
  padding: 8px 16px 28px;
}

/* ---------- 详情 ---------- */
.place-detail {
  padding: 20px 16px 24px;
}

.pd-head h3 {
  margin: 0 0 6px;
  font-family: var(--fv-font-serif);
  font-size: 18px;
  color: var(--fv-ink-2);
}

.pd-meta {
  margin: 0 0 8px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--fv-ink-3);
}

.pd-addr {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--fv-ink-4);
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.pd-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.pd-danger {
  color: #b4442e;
  border-color: rgba(180, 68, 46, 0.35);
}

/* ---------- 重复地点 ---------- */
.dupe-bar {
  display: flex;
  align-items: center;
  gap: 9px;
  margin: 4px 16px 6px;
  padding: 11px 13px;
  background: var(--fv-surface-cream);
  border: 1px solid var(--fv-border-cream);
  border-radius: 14px;
  cursor: pointer;
}

.dupe-icon {
  color: var(--fv-primary);
  flex-shrink: 0;
}

.dupe-copy {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--fv-ink-2);
  line-height: 1.4;
}

.dupe-copy b {
  color: var(--fv-primary);
  font-family: var(--fv-font-serif);
}

.dupe-copy span {
  display: block;
  font-size: 11px;
  color: var(--fv-ink-4);
  margin-top: 2px;
}

.dupe-action {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--fv-primary);
}

.dupe-sheet {
  padding: 20px 16px 24px;
  display: flex;
  flex-direction: column;
  max-height: 82vh;
}

.ds-head h3 {
  margin: 0 0 6px;
  font-family: var(--fv-font-serif);
  font-size: 17px;
  color: var(--fv-ink);
}

.ds-head p {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--fv-ink-3);
}

.ds-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.ds-group {
  padding: 12px 13px;
  border: 1px solid var(--fv-border);
  border-radius: 14px;
  background: var(--fv-surface);
  margin-bottom: 10px;
}

.ds-group-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.ds-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--fv-ink);
}

.ds-year {
  font-size: 12px;
  color: var(--fv-primary);
  font-family: var(--fv-font-serif);
}

.ds-count {
  margin-left: auto;
  font-size: 11px;
  color: var(--fv-ink-4);
}

.ds-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 0;
}

.ds-item-state {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  color: var(--fv-ink-4);
  background: var(--fv-paper);
  border: 1px solid var(--fv-border-soft);
}

.ds-item-state.ok {
  color: var(--fv-map);
  background: var(--fv-map-soft);
  border-color: transparent;
}

.ds-item-desc {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--fv-ink-3);
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ds-keep {
  flex-shrink: 0;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 6px;
  color: #fff;
  background: var(--fv-primary);
}

.ds-foot {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
}
</style>
