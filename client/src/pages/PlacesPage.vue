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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import EmptyState from '@/components/EmptyState.vue'

const router = useRouter()
const goHome = () => router.replace('/')
const goMap = () => router.push('/map')

const showDetail = ref(false)
const current = ref(null)
const places = ref(load())

function load() {
  const raw = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, [])
  const list = Array.isArray(raw) ? raw : []
  return [...list].sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0))
}

const validCoord = (p) =>
  Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude)) &&
  Math.abs(Number(p.latitude)) <= 90 && Math.abs(Number(p.longitude)) <= 180 &&
  Number(p.latitude) !== 0 && Number(p.longitude) !== 0

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
</style>
