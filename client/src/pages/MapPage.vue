<template>
  <div class="map-page">
    <van-nav-bar title="记忆地图" left-arrow @click-left="goHome" />

    <!-- 地图容器 -->
    <div class="map-container">
      <div ref="mapContainer" class="map-canvas"></div>

      <!-- 地点列表 -->
      <div class="location-list">
        <div class="list-header">
          <span class="list-title">记忆地点 ({{ locations.length }})</span>
          <button class="list-add" type="button" @click="startAdd">
            <van-icon name="plus" size="14" /> 添加
          </button>
        </div>
        <div class="location-items">
          <EmptyState
            v-if="!locations.length"
            compact
            icon="location-o"
            title="还没有记忆地点"
            desc="说一句「我爸 1980 年在武汉大学读书」，地图会把它钉在家人的足迹上。"
            action-text="添加第一个地点"
            @action="startAdd"
          />
          <div
            v-for="loc in locations"
            :key="loc.id"
            class="location-item"
            @click="openLocationDetail(loc)"
          >
            <div class="loc-icon">
            <van-icon name="location-o" size="20" color="var(--fv-primary)" />
          </div>
            <div class="loc-info">
              <div class="loc-name">{{ loc.name }}</div>
              <div class="loc-desc">{{ loc.year }}年 · {{ loc.description }}</div>
            </div>
            <van-icon
              class="loc-delete"
              name="delete-o"
              size="18"
              color="var(--fv-ink-4)"
              @click.stop="deleteLocation(loc)"
            />
          </div>
        </div>
      </div>

    </div>

    <!-- 地点详情弹窗 -->
    <van-popup v-model:show="showLocationDetail" position="bottom" round>
      <div v-if="selectedLocation" class="loc-detail">
        <div class="loc-detail__head">
          <h3>{{ selectedLocation.name }}</h3>
          <p>{{ selectedLocation.year }}年 · {{ selectedLocation.description || '没有写描述' }}</p>
        </div>
        <div class="loc-detail__actions">
          <van-button round block @click="flyToSelected">
            <van-icon name="aim" size="16" style="margin-right: 6px" />在地图上看
          </van-button>
          <van-button round block type="primary" @click="editSelected">
            <van-icon name="edit" size="16" style="margin-right: 6px" />改名字或位置
          </van-button>
          <van-button round block plain class="loc-detail__danger" @click="deleteSelected">
            <van-icon name="delete-o" size="16" style="margin-right: 6px" />删掉这个地点
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 添加地点弹窗：不加遮罩，上面露出的地图可以直接点左右调整位置 -->
    <van-popup
      v-model:show="showAddLocation"
      position="bottom"
      round
      :overlay="false"
      :style="{ height: '58%' }"
      @closed="onFormClosed"
    >
      <div class="add-location-form">
        <div class="form-head">
          <h3>{{ editingId ? '修改记忆地点' : '添加记忆地点' }}</h3>
          <van-icon name="cross" size="18" color="var(--fv-ink-3)" @click="showAddLocation = false" />
        </div>

        <!-- AI 智能识别 -->
        <div class="ai-panel">
          <div class="ai-panel__row">
            <van-field
              v-model="aiInput"
              class="ai-input"
              placeholder="例如：我爸 1980 年在武汉大学读书"
              :border="false"
              @keyup.enter="onAiResolve"
            />
            <van-button
              class="ai-btn"
              size="small"
              round
              type="primary"
              :loading="aiBusy"
              loading-text="识别中"
              @click="onAiResolve"
            >
              智能识别
            </van-button>
          </div>
          <p class="ai-panel__hint">一句话描述，AI 帮你补全地点和年份；位置请在下面点地图确认</p>
        </div>

        <!-- 位置确认：直接在地图上点 -->
        <div class="pick-bar">
          <div class="pick-bar__text">
            <van-icon name="aim" size="16" color="var(--fv-primary)" />
            <span v-if="aiCoords">
              已定位，位置不准就点上方的地图，或拖动大头针
            </span>
            <span v-else>还没定位，请点上方地图选择位置</span>
          </div>
        </div>

        <van-form @submit="onAddLocation">
          <van-cell-group inset>
            <van-field
              v-model="newLocation.name"
              name="name"
              label="地点名称"
              placeholder="例如：老家、祖屋"
              required
            />
            <van-field
              v-model="newLocation.year"
              name="year"
              label="年份"
              type="number"
              placeholder="例如：1960"
            />
            <van-field
              v-model="newLocation.description"
              name="description"
              label="描述"
              type="textarea"
              placeholder="这里发生了什么故事..."
              rows="3"
            />
          </van-cell-group>

          <div style="margin: 16px">
            <van-button round block type="primary" native-type="submit">
              保存地点
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import EmptyState from '@/components/EmptyState.vue'
import { cloudChat, getCloudSession } from '@/services/cloud'

const router = useRouter()
// 统一回首页：不逐页后退，回到首页后安卓返回键可直接退出
const goHome = () => router.replace('/')

const mapContainer = ref(null)
const showAddLocation = ref(false)
const showLocationDetail = ref(false)
const selectedLocation = ref(null)
const editingId = ref(null)

// ---- AI 智能识别 ----
const aiInput = ref('')
const aiBusy = ref(false)
// 当前选中的坐标（AI 给的，或用户在地图上点的）
const aiCoords = ref(null)

// 地点数据（不预置示例，全部来自用户录入）

// 从 localStorage 加载地点，没有就是空的
const savedLocations = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, null)
const locations = ref(Array.isArray(savedLocations) ? savedLocations : [])

// 保存地点到 localStorage
const saveLocations = () => {
  storage.set(STORAGE_KEYS.MEMORY_LOCATIONS, locations.value)
}

const newLocation = ref({
  name: '',
  year: '',
  description: ''
})

/**
 * AI 智能识别：把一句话解析成结构化地点。
 * 复用云端大模型（免密钥）；未连接云账号或调用失败时给出明确提示。
 */
const onAiResolve = async () => {
  const raw = aiInput.value.trim()
  if (!raw) {
    showToast('先说一句地点描述')
    return
  }
  if (aiBusy.value) return
  aiBusy.value = true
  try {
    const session = await getCloudSession()
    if (!session) {
      showToast('AI 识别需要先连接云账号（登录页或关于页）')
      return
    }
    const system = [
      '你是 FamilyVault 记忆地图的地点解析助手，帮助中国家庭记录长辈的人生地点。',
      '把用户的一句话描述解析成一个记忆地点，只输出 JSON，不要任何解释或代码块标记。',
      'JSON 字段：name(地点名，简短，如"武汉大学")、year(年份数字，没提到就 null)、description(一句话描述)、province(省)、city(地级市)、latitude(纬度数字)、longitude(经度数字)。',
      '重要：坐标必须与地名严格对应。先确定地点属于哪个省哪个市，再给出该地点的经纬度，保留 4 位小数。',
      '严禁凭印象编造坐标：如果不确定具体位置，就给出该地点所属区县的行政中心坐标；连区县都不确定时，给出所属地级市的中心坐标。',
      '校验一遍：这个经纬度是否落在 province/city 范围内？如果不在，请修正后再输出。',
      '如果描述里没有明确地点，latitude/longitude 填 null。',
      '示例输入"我爸1980年在武汉大学读书"应输出：{"name":"武汉大学","year":1980,"description":"爸爸在此读书","province":"湖北省","city":"武汉市","latitude":30.5380,"longitude":114.3620}'
    ].join('\n')
    const text = await cloudChat([
      { role: 'system', content: system },
      { role: 'user', content: raw }
    ], { temperature: 0.2 })
    const json = parseAiJson(text)
    if (!json) {
      showToast('没能识别出地点，请手动填写')
      return
    }
    newLocation.value.name = json.name || ''
    newLocation.value.year = json.year ? String(json.year) : ''
    newLocation.value.description = json.description || ''
    const lat = Number(json.latitude)
    const lng = Number(json.longitude)
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat > -90 && lat < 90 && lng > -180 && lng < 180) {
      aiCoords.value = { latitude: lat, longitude: lng }
      // 立刻在大头针上体现出来，用户能直接看出准不准
      moveTempMarker(lat, lng, true)
    } else {
      aiCoords.value = null
    }
    showToast(aiCoords.value ? '已识别，位置不对就点地图调整' : '已识别地点，请在图上点一下位置')
  } catch (err) {
    console.warn('AI 地点识别失败', err)
    showToast('识别失败，请手动填写')
  } finally {
    aiBusy.value = false
  }
}

/** 从 LLM 输出中稳健地提取 JSON 对象 */
function parseAiJson(text) {
  if (!text) return null
  const s = String(text).trim()
  try {
    return JSON.parse(s)
  } catch { /* 继续尝试提取 */ }
  const m = s.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

let map = null
let markers = []
const markerById = new Map()
let routeLine = null
let tempMarker = null
let onMapPick = null

// 初始化地图
const initMap = () => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    zoomControl: false
  }).setView([30.5928, 114.3055], 10)

  L.control.zoom({ position: 'topright' }).addTo(map)

  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: '1234',
    attribution: '© 高德地图'
  }).addTo(map)

  // 添加标记
  locations.value.forEach(loc => {
    addMarker(loc)
  })

  // 绘制迁徙路线
  drawMigrationRoute()
}

// 添加标记
const addMarker = (loc) => {
  if (!map) return

  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width: 32px; height: 32px; background: var(--fv-primary); border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: 600;">${loc.name.charAt(0)}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })

  const marker = L.marker([loc.latitude, loc.longitude], { icon })
    .addTo(map)
    .bindPopup(`
      <div style="min-width: 140px; padding: 4px;">
        <h4 style="margin: 0 0 6px 0; font-size: 14px;">${loc.name}</h4>
        <p style="margin: 0; font-size: 12px; color: var(--fv-ink-2);">
          ${loc.year}年<br>${loc.description}
        </p>
      </div>
    `)

  markerById.set(loc.id, marker)
  markers.push(marker)
}

// 重建所有标记（编辑/删除后调用）
const refreshMarkers = () => {
  markers.forEach(m => map && map.removeLayer(m))
  markers = []
  markerById.clear()
  locations.value.forEach(loc => addMarker(loc))
  refreshRoute()
}

const refreshRoute = () => {
  if (!map) return
  if (routeLine) {
    map.removeLayer(routeLine)
    routeLine = null
  }
  drawMigrationRoute()
}

// 绘制迁徙路线
const drawMigrationRoute = () => {
  if (!map || locations.value.length < 2) return

  const sortedLocations = [...locations.value].sort((a, b) => a.year - b.year)
  const latlngs = sortedLocations.map(loc => [loc.latitude, loc.longitude])

  routeLine = L.polyline(latlngs, {
    color: 'var(--fv-primary)',
    weight: 3,
    opacity: 0.7,
    dashArray: '8, 8'
  }).addTo(map)
}

// 飞到指定位置
const flyToLocation = (loc) => {
  if (!map) return
  map.flyTo([loc.latitude, loc.longitude], 14, { duration: 1.2 })
  const marker = markerById.get(loc.id)
  if (marker) setTimeout(() => marker.openPopup(), 1300)
}

// ---- 地点详情 / 编辑 / 删除 ----
const openLocationDetail = (loc) => {
  selectedLocation.value = loc
  showLocationDetail.value = true
  flyToLocation(loc)
}

const flyToSelected = () => {
  if (selectedLocation.value) flyToLocation(selectedLocation.value)
  showLocationDetail.value = false
}

const editSelected = () => {
  const loc = selectedLocation.value
  if (!loc) return
  editingId.value = loc.id
  newLocation.value = {
    name: loc.name || '',
    year: loc.year ? String(loc.year) : '',
    description: loc.description || ''
  }
  aiCoords.value = { latitude: loc.latitude, longitude: loc.longitude }
  showLocationDetail.value = false
  showAddLocation.value = true
}

const removeLocation = (loc) => {
  locations.value = locations.value.filter(l => l.id !== loc.id)
  saveLocations()
  refreshMarkers()
}

const deleteLocation = (loc) => {
  showConfirmDialog({
    title: '删除地点',
    message: `确定删除「${loc.name}」吗？删掉后不能恢复。`,
    confirmButtonText: '删除',
    confirmButtonColor: '#B4442E'
  })
    .then(() => {
      removeLocation(loc)
      if (selectedLocation.value?.id === loc.id) {
        selectedLocation.value = null
        showLocationDetail.value = false
      }
      showToast('已删除')
    })
    .catch(() => {})
}

const deleteSelected = () => {
  if (selectedLocation.value) deleteLocation(selectedLocation.value)
}

// ---- 选点：弹窗打开时，地图上放一个大头针，点地图即可移动 ----
const tempIcon = () =>
  L.divIcon({
    className: 'temp-pin',
    html: `<div style="width:36px;height:36px;border-radius:50%;background:rgba(160,58,42,.18);display:flex;align-items:center;justify-content:center">
      <div style="width:16px;height:16px;border-radius:50%;background:var(--fv-primary);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  })

const ensureTempMarker = () => {
  if (!map) return
  if (!tempMarker) {
    const c = aiCoords.value
      ? [aiCoords.value.latitude, aiCoords.value.longitude]
      : [map.getCenter().lat, map.getCenter().lng]
    tempMarker = L.marker(c, { icon: tempIcon(), draggable: true, zIndexOffset: 1000 }).addTo(map)
    tempMarker.on('dragend', () => {
      const p = tempMarker.getLatLng()
      aiCoords.value = { latitude: p.lat, longitude: p.lng }
    })
  }
  onMapPick = (e) => {
    moveTempMarker(e.latlng.lat, e.latlng.lng, false)
  }
  map.on('click', onMapPick)
  map.getContainer().classList.add('is-picking')
}

const moveTempMarker = (lat, lng, fly) => {
  if (!map) return
  aiCoords.value = { latitude: lat, longitude: lng }
  if (!tempMarker) {
    tempMarker = L.marker([lat, lng], { icon: tempIcon(), draggable: true, zIndexOffset: 1000 }).addTo(map)
    tempMarker.on('dragend', () => {
      const p = tempMarker.getLatLng()
      aiCoords.value = { latitude: p.lat, longitude: p.lng }
    })
  } else {
    tempMarker.setLatLng([lat, lng])
  }
  if (fly) map.flyTo([lat, lng], 12, { duration: 0.8 })
}

const clearTempMarker = () => {
  if (map && onMapPick) {
    map.off('click', onMapPick)
    map.getContainer().classList.remove('is-picking')
  }
  onMapPick = null
  if (tempMarker && map) {
    map.removeLayer(tempMarker)
  }
  tempMarker = null
}

const onFormClosed = () => {
  clearTempMarker()
  editingId.value = null
  resetAddForm()
}

// 保存地点（新增或修改）
const onAddLocation = () => {
  if (!newLocation.value.name.trim()) {
    showToast('请输入地点名称')
    return
  }

  // 坐标优先级：用户在地图上点的 > 编辑时的原坐标 > 地图中心
  const center = map ? map.getCenter() : { lat: 30.5928, lng: 114.3055 }
  const lat = aiCoords.value?.latitude ?? center.lat
  const lng = aiCoords.value?.longitude ?? center.lng

  const payload = {
    name: newLocation.value.name.trim(),
    year: parseInt(newLocation.value.year) || new Date().getFullYear(),
    description: newLocation.value.description || '',
    latitude: lat,
    longitude: lng
  }

  if (editingId.value) {
    const idx = locations.value.findIndex(l => l.id === editingId.value)
    if (idx >= 0) locations.value[idx] = { ...locations.value[idx], ...payload }
    showToast('已保存修改')
  } else {
    locations.value.push({ id: Date.now(), ...payload })
    showToast('已添加')
  }

  saveLocations()
  refreshMarkers()
  if (map) map.flyTo([lat, lng], 12, { duration: 0.8 })

  showAddLocation.value = false
}

const resetAddForm = () => {
  newLocation.value = { name: '', year: '', description: '' }
  aiInput.value = ''
  aiCoords.value = null
}

const startAdd = () => {
  editingId.value = null
  resetAddForm()
  showAddLocation.value = true
}

// 弹窗打开时进入"选点"状态：地图上一个可拖动大头针，点地图也能移动
watch(showAddLocation, (open) => {
  if (open) {
    nextTick(() => ensureTempMarker())
  } else {
    clearTempMarker()
  }
})

onMounted(async () => {
  await nextTick()
  initMap()
})

onUnmounted(() => {
  clearTempMarker()
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-page {
  /* 减去底部标签栏的 50px，避免列表和按钮被标签栏压住 */
  height: calc(100vh - 50px);
  height: calc(100dvh - 50px);
  background: var(--fv-surface-soft);
  display: flex;
  flex-direction: column;
}

.map-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}

.map-canvas {
  flex: 1;
  min-height: 300px;
}

.location-list {
  background: var(--fv-surface);
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  max-height: 45vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--fv-border-soft);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.list-add {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: var(--fv-primary);
  font-size: 13px;
  font-weight: 500;
  padding: 4px 2px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fv-ink);
}

.location-items {
  overflow-y: auto;
  flex: 1;
  /* 底部导航是悬浮的，留出空间避免空状态按钮被遮住 */
  padding-bottom: 64px;
}

.location-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f8f8;
  cursor: pointer;
  transition: background 0.2s;
}

.location-item:active {
  background: var(--fv-primary-soft);
}

.location-item:last-child {
  border-bottom: none;
}

.loc-icon {
  font-size: 20px;
  margin-right: 12px;
}

.loc-info {
  flex: 1;
  min-width: 0;
}

.loc-delete {
  padding: 8px;
  margin: -8px -4px -8px 4px;
  flex-shrink: 0;
}

/* 地点详情 */
.loc-detail {
  padding: 20px 16px 24px;
}

.loc-detail__head h3 {
  margin: 0 0 6px;
  font-family: var(--fv-font-serif);
  font-size: 18px;
  color: var(--fv-ink-2);
}

.loc-detail__head p {
  margin: 0 0 18px;
  font-size: 13px;
  color: var(--fv-ink-3);
  line-height: 1.6;
}

.loc-detail__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.loc-detail__danger {
  color: #b4442e;
  border-color: rgba(180, 68, 46, 0.35);
}

/* 选点提示条 */
.pick-bar {
  margin: 4px 16px 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--fv-surface-cream, #fdf7ec);
  border: 1px solid var(--fv-border-cream);
}

.pick-bar__text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--fv-ink-3);
}

/* 选点状态：地图上提示可点击 */
.map-canvas.is-picking {
  cursor: crosshair;
}

.loc-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--fv-ink);
  margin-bottom: 2px;
}

.loc-desc {
  font-size: 12px;
  color: var(--fv-ink-3);
}

.fab {
  position: absolute;
  bottom: 72px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--fv-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
  cursor: pointer;
  z-index: 1000;
  transition: transform 0.2s;
}

.fab:active {
  transform: scale(0.9);
}

.add-location-form {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.form-head h3 {
  margin: 0;
}

.add-location-form h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

/* AI 智能识别面板 */
.ai-panel {
  margin: 0 16px 12px;
  padding: 6px 12px 10px;
  background: var(--fv-primary-soft, #fbf1ec);
  border: 1px solid var(--fv-border-soft, #f0e2d8);
  border-radius: 12px;
}

.ai-panel__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-input {
  flex: 1;
  background: transparent;
  padding: 0;
}

.ai-input :deep(.van-field__control) {
  font-size: 13px;
}

.ai-btn {
  flex-shrink: 0;
  background: var(--fv-primary);
  border-color: var(--fv-primary);
}

.ai-panel__hint {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--fv-ink-3, #9a8b7c);
  line-height: 1.4;
}

/* 自定义标记样式 */
:global(.custom-marker) {
  background: transparent;
  border: none;
}
</style>
