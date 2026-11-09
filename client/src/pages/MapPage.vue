<template>
  <div class="map-page">
    <van-nav-bar title="记忆地图" left-arrow @click-left="goHome" />

    <div ref="mapWrap" class="map-wrap">
      <!-- 地图铺满整个区域，抽屉浮在上面 -->
      <div ref="mapContainer" class="map-canvas"></div>

      <!-- 瓦片还在路上：给个提示，避免看起来像"地图只画了一半" -->
      <div v-if="!tilesReady" class="map-loading">
        <van-loading size="16" color="var(--fv-primary)" />
        <span>地图加载中</span>
      </div>

      <!-- 选点时提示，露出的那块地图还能点 -->
      <div v-if="showAddLocation" class="pick-tip">
        <van-icon name="aim" size="14" />
        <span>点地图或拖动大头针，选准位置</span>
      </div>

      <!-- 底部抽屉：可以上下拖，收起时地图完整可见 -->
      <div
        class="sheet"
        :class="{ 'is-dragging': dragging }"
        :style="{ height: sheetHeight + 'px' }"
      >
        <div class="sheet-grip" @pointerdown="onDragStart" @click="toggleSheet">
          <span class="sheet-grip__bar"></span>
        </div>
        <div class="sheet-head" @pointerdown="onDragStart" @click="onHeadClick">
          <div class="head-left">
            <van-icon name="location-o" size="16" color="var(--fv-primary)" />
            <span class="list-title">记忆地点</span>
            <span class="head-count">{{ locations.length }}</span>
          </div>
          <button class="list-add" type="button" @pointerdown.stop @click.stop="startAdd">
            <van-icon name="plus" size="14" /> 添加
          </button>
        </div>

        <div class="sheet-body" :class="{ 'is-collapsed': isCollapsed }">
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
            v-for="loc in sortedLocations"
            :key="loc.id"
            class="location-item"
            @click="openLocationDetail(loc)"
          >
            <div class="loc-icon">
              <van-icon name="location-o" size="20" color="var(--fv-primary)" />
            </div>
            <div class="loc-info">
              <div class="loc-name">{{ loc.name }}</div>
              <div class="loc-desc">
                <span v-if="loc.year">{{ loc.year }}年</span>
                <span v-if="loc.year && loc.description"> · </span>{{ loc.description }}
              </div>
            </div>
            <van-icon
              class="loc-delete"
              name="delete-o"
              size="18"
              color="var(--fv-ink-4)"
              @click.stop="deleteLocation(loc)"
            />
          </div>
          <div v-if="locations.length" class="sheet-foot">共 {{ locations.length }} 个地点，点一条在地图上看看</div>
        </div>
      </div>
    </div>

    <!-- 地点详情弹窗 -->
    <van-popup v-model:show="showLocationDetail" position="bottom" round>
      <div v-if="selectedLocation" class="loc-detail">
        <div class="loc-detail__head">
          <h3>{{ selectedLocation.name }}</h3>
          <p>{{ selectedLocation.year }}年 · {{ selectedLocation.description || '没有写描述' }}</p>
          <p v-if="selectedLocation.address" class="loc-detail__addr">
            <van-icon name="aim" size="13" /> {{ selectedLocation.address }}
          </p>
        </div>
        <div class="loc-detail__actions">
          <van-button round block @click="flyToSelected">
            <van-icon name="aim" size="16" style="margin-right: 6px" />在地图上看
          </van-button>
          <van-button round block type="primary" @click="editSelected">
            <van-icon name="edit" size="16" style="margin-right: 6px" />改名字或位置
          </van-button>
          <van-button round block plain @click="relocateSelected">
            <van-icon name="aim" size="16" style="margin-right: 6px" />位置不准？按地名重新定位
          </van-button>
          <van-button round block plain class="loc-detail__danger" @click="deleteSelected">
            <van-icon name="delete-o" size="16" style="margin-right: 6px" />删掉这个地点
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 添加地点：不加遮罩，上面露出的地图可以直接点 -->
    <van-popup
      v-model:show="showAddLocation"
      class="add-popup"
      position="bottom"
      round
      :overlay="false"
      :style="{ height: '62%' }"
      @opened="onFormOpened"
      @closed="onFormClosed"
    >
      <div class="add-location-form">
        <div class="form-head">
          <h3>{{ editingId ? '修改记忆地点' : '添加记忆地点' }}</h3>
          <van-icon name="cross" size="18" color="var(--fv-ink-3)" @click="showAddLocation = false" />
        </div>

        <!-- 一句话智能识别 -->
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
          <p class="ai-panel__hint">说一句话，自动补齐地点和年份，并在真实地名库里定位</p>
        </div>

        <!-- 定位状态 + 手动搜地名 -->
        <div class="locate-panel">
          <div class="locate-status">
            <van-icon
              :name="pickedCoord ? 'success' : 'aim'"
              size="16"
              :color="pickedCoord ? 'var(--fv-success)' : 'var(--fv-ink-4)'"
            />
            <div class="locate-status__text">
              <template v-if="pickedCoord">
                <div class="locate-status__addr">{{ pickedAddress || '已选定位置' }}</div>
                <div class="locate-status__meta">
                  <span v-if="pickedSource">{{ pickedSource }}</span>
                  <button type="button" class="locate-clear" @click="clearPicked">重新选</button>
                </div>
              </template>
              <span v-else class="locate-status__empty">还没定位 · 点上面的地图，或搜一下地名</span>
            </div>
          </div>

          <div class="locate-search">
            <van-field
              v-model="placeQuery"
              class="locate-input"
              placeholder="搜地名精确定位，如 武汉大学"
              :border="false"
              @keyup.enter="onSearchPlace"
            />
            <van-button
              class="locate-search__btn"
              size="small"
              round
              :loading="searching"
              loading-text="搜"
              @click="onSearchPlace"
            >
              搜
            </van-button>
          </div>

          <div v-if="searchResults.length" class="search-results">
            <div
              v-for="(p, i) in searchResults"
              :key="i"
              class="search-item"
              @click="pickSearchResult(p)"
            >
              <div class="search-item__name">{{ p.name }}</div>
              <div class="search-item__addr">{{ p.address || '—' }}</div>
            </div>
          </div>
          <p v-else-if="searchMissed" class="search-missed">
            没搜到「{{ lastQuery }}」，换个叫法试试，或者直接点地图选
          </p>
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

          <div class="form-submit">
            <van-button round block type="primary" native-type="submit">保存地点</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { ref, computed, onMounted, onUnmounted, onActivated, nextTick, watch } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import EmptyState from '@/components/EmptyState.vue'
import { cloudChat, getCloudSession } from '@/services/cloud'
import { geoApi } from '@/services/api'
import { wgs84ToGcj02, gcj02ToWgs84, isValidCoord } from '@/utils/coord'

const router = useRouter()
// 统一回首页：不逐页后退，回到首页后安卓返回键可直接退出
const goHome = () => router.replace('/')

const mapContainer = ref(null)
const mapWrap = ref(null)
const showAddLocation = ref(false)
const showLocationDetail = ref(false)
const selectedLocation = ref(null)
const editingId = ref(null)

// ---- 抽屉（可上下拖动） ----
const SHEET_COLLAPSED = 64 // 抓手 + 标题栏
const sheetHeight = ref(SHEET_COLLAPSED)
const dragging = ref(false)
const isCollapsed = computed(() => sheetHeight.value <= SHEET_COLLAPSED + 10)
let dragStartY = 0
let dragStartH = 0
let dragMoved = false

const wrapH = () => mapWrap.value?.clientHeight || window.innerHeight - 100
const snapPoints = () => {
  const h = wrapH()
  return [SHEET_COLLAPSED, Math.round(h * 0.42), Math.round(h * 0.88)]
}

const onDragStart = (e) => {
  if (e.pointerType === 'mouse' && e.button !== 0) return
  dragging.value = true
  dragMoved = false
  dragStartY = e.clientY
  dragStartH = sheetHeight.value
  try {
    e.currentTarget.setPointerCapture?.(e.pointerId)
  } catch { /* 某些安卓 WebView 不支持，忽略 */ }
  window.addEventListener('pointermove', onDragMove, { passive: false })
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}

const onDragMove = (e) => {
  if (!dragging.value) return
  const dy = dragStartY - e.clientY
  if (Math.abs(dy) > 4) dragMoved = true
  const pts = snapPoints()
  const min = pts[0]
  const max = Math.round(wrapH() * 0.94)
  let next = dragStartH + dy
  // 越界阻尼，拖到头有"拉不动"的手感
  if (next < min) next = min - (min - next) * 0.28
  if (next > max) next = max + (next - max) * 0.18
  sheetHeight.value = Math.round(next)
  if (e.cancelable) e.preventDefault()
}

const onDragEnd = () => {
  dragging.value = false
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
  const pts = snapPoints()
  const cur = sheetHeight.value
  const moved = cur - dragStartH // 向上拖（抽屉变高）为正
  // 就近吸附，但按拖动方向轻微加权：正好卡在中间时，顺着手的意图走
  let best = pts[0]
  let bestD = Infinity
  pts.forEach((v) => {
    let d = Math.abs(v - cur)
    if (moved > 0 && v > cur) d -= 26
    if (moved < 0 && v < cur) d -= 26
    if (d < bestD) {
      bestD = d
      best = v
    }
  })
  sheetHeight.value = best
}

const onHeadClick = () => {
  if (dragMoved) {
    dragMoved = false
    return
  }
  toggleSheet()
}

const toggleSheet = () => {
  if (dragMoved) {
    dragMoved = false
    return
  }
  const pts = snapPoints()
  if (sheetHeight.value <= pts[0] + 10) sheetHeight.value = pts[1]
  else if (sheetHeight.value < pts[2] - 10) sheetHeight.value = pts[2]
  else sheetHeight.value = pts[0]
}

const clampSheet = () => {
  const pts = snapPoints()
  const cur = sheetHeight.value
  if (cur < pts[0]) sheetHeight.value = pts[0]
  if (cur > pts[2]) sheetHeight.value = pts[2]
}

// ---- 地点数据 ----
const savedLocations = storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, null)
const locations = ref(Array.isArray(savedLocations) ? savedLocations : [])
const sortedLocations = computed(() =>
  [...locations.value].sort((a, b) => (Number(a.year) || 0) - (Number(b.year) || 0))
)

const saveLocations = () => {
  storage.set(STORAGE_KEYS.MEMORY_LOCATIONS, locations.value)
}

const newLocation = ref({ name: '', year: '', description: '' })

// ---- 选中的坐标（内部统一 GCJ-02）----
const pickedCoord = ref(null)
const pickedAddress = ref('')
const pickedSource = ref('')

// ---- 地名搜索 ----
const placeQuery = ref('')
const searching = ref(false)
const searchResults = ref([])
const searchMissed = ref(false)
const lastQuery = ref('')

// ---- AI 识别 ----
const aiInput = ref('')
const aiBusy = ref(false)

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/**
 * 一句话识别：只让大模型做"把话读成字段"这件事，
 * 经纬度一律交给真实地名库（模型给的坐标经常整个城区都偏）。
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
      showToast('智能识别需要先连接云账号（关于页可连接）')
      return
    }
    const system = [
      '你是 FamilyVault 记忆地图的地点解析助手，帮助中国家庭记录长辈的人生地点。',
      '把用户的一句话解析成结构化字段，只输出 JSON，不要解释、不要代码块标记。',
      'JSON 字段：name(地点名，简短具体，如"武汉大学"、"成都老南门大桥")、year(年份数字，没提到就 null)、description(一句不超过 20 字的描述)、province(省，如"湖北省")、city(地级市，如"武汉市")。',
      '不要输出经纬度。name 必须是真实存在、能被地图搜到的地名。',
      '如果这句话里根本没有地点，name 填空字符串。',
      '示例："我爸1980年在武汉大学读书" → {"name":"武汉大学","year":1980,"description":"爸爸在此读书","province":"湖北省","city":"武汉市"}'
    ].join('\n')

    const text = await cloudChat(
      [
        { role: 'system', content: system },
        { role: 'user', content: raw }
      ],
      { temperature: 0.1 }
    )
    const json = parseAiJson(text)
    if (!json || !String(json.name || '').trim()) {
      showToast('没读出地点，请手动填写或搜一下')
      return
    }

    newLocation.value.name = String(json.name).trim()
    newLocation.value.year = json.year ? String(json.year) : ''
    if (json.description && !newLocation.value.description) {
      newLocation.value.description = String(json.description)
    }

    const found = await locatePlace(json.name, json)
    if (found) {
      applyPlace(found.place, { source: found.level === 'city' ? '只到城市' : '智能识别' })
      if (found.level === 'city') {
        showToast('只找到所在城市，请拖动大头针微调')
      } else {
        showToast('已定位，不准就在地图上微调')
      }
    } else {
      showToast('没查到准确位置，请在图上点一下')
    }
  } catch (err) {
    console.warn('AI 地点识别失败', err)
    showToast('识别失败，请手动填写')
  } finally {
    aiBusy.value = false
  }
}

function parseAiJson(text) {
  if (!text) return null
  const s = String(text).trim()
  try {
    return JSON.parse(s)
  } catch { /* 继续 */ }
  const m = s.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

/** 请求地名库，失败时返回空数组（不抛错，界面不卡） */
async function fetchPlaces(q) {
  const query = String(q || '').trim()
  if (!query) return []
  try {
    const c = map ? map.getCenter() : null
    const res = await geoApi.searchPlaces(query, c ? { lat: c.lat, lng: c.lng } : {})
    if (!res || res.success === false) return []
    return Array.isArray(res.data) ? res.data : []
  } catch (err) {
    console.warn('地名搜索失败', err)
    return []
  }
}

/** 在候选里挑最像的那条：优先国内、优先省市对得上、优先同名 */
function pickBest(list, ctx = {}) {
  if (!list.length) return { place: null, score: -1 }
  const city = String(ctx.city || '').replace(/市$/, '')
  const province = String(ctx.province || '').replace(/省$/, '')
  const rawName = String(ctx.name || '').trim()
  const norm = (s) => String(s || '').replace(/\s/g, '')

  let best = null
  let bestScore = -1
  list.forEach((p) => {
    let score = 0
    const addr = `${p.address || ''}${p.province || ''}${p.city || ''}`
    if (city && addr.includes(city)) score += 3
    if (province && addr.includes(province)) score += 2
    if (rawName && norm(p.name).includes(norm(rawName))) score += 3
    if (rawName && norm(p.name) === norm(rawName)) score += 2
    if (!p.country || p.country === '中国') score += 1
    if (bestScore < 0 || score > bestScore) {
      bestScore = score
      best = p
    }
  })
  return { place: best, score: bestScore }
}

/**
 * 多层兜底：城市+地名 → 地名 → 城市中心。
 * 取所有问法里得分最高的那条，避免"名字对上了但在别的城市"。
 * @returns {Promise<{place:object, level:'exact'|'city'}|null>}
 */
async function locatePlace(name, ctx = {}) {
  const city = String(ctx.city || '').trim()
  const province = String(ctx.province || '').trim()
  const cn = String(name || '').trim()

  const queries = []
  if (cn) {
    if (city) queries.push(`${city}${cn}`)
    queries.push(cn)
  }

  let best = { place: null, score: -1 }
  for (const q of queries) {
    const list = await fetchPlaces(q)
    // 同一批结果里，把"城市对得上"的往上顶
    const got = pickBest(list, { ...ctx, name: cn })
    if (got.place && got.score > best.score) best = got
    if (best.score >= 5) break
  }
  if (best.place && best.score >= 2) return { place: best.place, level: 'exact' }

  // 实在定位不到具体地点，退到城市中心，并明确告诉用户"只到城市"
  const cityQuery = [province, city].filter(Boolean).join('')
  if (cityQuery) {
    const list = await fetchPlaces(cityQuery)
    if (list.length) {
      const got = pickBest(list, { ...ctx, name: city })
      if (got.place) return { place: got.place, level: 'city' }
    }
  }
  return null
}

// ---- 选点 ----
const setPicked = (lat, lng, { source = '', address = '' } = {}) => {
  if (!isValidCoord(lat, lng)) return
  pickedCoord.value = { latitude: Number(lat), longitude: Number(lng) }
  if (source) pickedSource.value = source
  if (address) pickedAddress.value = address
  movePickedMarker(pickedCoord.value.latitude, pickedCoord.value.longitude)
  // 地址文字异步补全，失败也不影响定位
  if (!address) refreshAddress()
}

/** 把地名库/搜索的结果落成图上的 GCJ-02 位置 */
const applyPlace = (place, { source = '搜索结果', fly = true } = {}) => {
  // 高德直出就是 GCJ-02，OSM 系是 WGS-84，必须转换后再上图，否则偏几百米
  const g = place.coordSys === 'gcj02'
    ? { latitude: Number(place.latitude), longitude: Number(place.longitude) }
    : wgs84ToGcj02(place.latitude, place.longitude)
  if (!g || !isValidCoord(g.latitude, g.longitude)) return
  pickedCoord.value = g
  pickedSource.value = source
  pickedAddress.value = place.address || place.name || ''
  movePickedMarker(g.latitude, g.longitude)
  if (newLocation.value.name.trim() === '' && place.name) {
    newLocation.value.name = place.name
  }
  if (fly) flyToVisible(g.latitude, g.longitude, 16)
}

const clearPicked = () => {
  pickedCoord.value = null
  pickedAddress.value = ''
  pickedSource.value = ''
  if (pickedMarker && map) map.removeLayer(pickedMarker)
  pickedMarker = null
}

const onSearchPlace = async () => {
  const q = placeQuery.value.trim()
  if (!q) {
    showToast('输入一个地名，比如 武汉大学')
    return
  }
  if (searching.value) return
  searching.value = true
  searchResults.value = []
  searchMissed.value = false
  lastQuery.value = q
  try {
    const list = await fetchPlaces(q)
    const cn = list.filter((p) => !p.country || p.country === '中国')
    searchResults.value = (cn.length ? cn : list).slice(0, 5)
    searchMissed.value = searchResults.value.length === 0
  } finally {
    searching.value = false
  }
}

const pickSearchResult = (p) => {
  searchResults.value = []
  applyPlace(p, { source: '搜索定位' })
  showToast('已定位，位置不对再拖动大头针')
}

// ---- 地图 ----
let map = null
let markers = []
const markerById = new Map()
let routeLine = null
let pickedMarker = null
let onMapPick = null
let addressTimer = null
// 瓦片还没铺满时给个加载提示，否则手机上看着像"地图只画了一半"
const tilesReady = ref(false)

// 点地图空白处 / 拖动地图 = 正在用地图，抽屉自动滑下去让位
const collapseOnMapUse = () => {
  if (showAddLocation.value) return // 选点模式下点地图是在选位置，不能收
  if (!isCollapsed.value) sheetHeight.value = snapPoints()[0]
}

const initMap = () => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    zoomControl: false,
    attributionControl: true
  }).setView([34.2, 108.9], 4)

  L.control.zoom({ position: 'topright' }).addTo(map)

  // 高德瓦片是 GCJ-02 坐标系，应用内坐标一律按 GCJ-02 存
  const tiles = L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: '1234',
    attribution: '© 高德地图',
    // 手机上网络慢时瓦片是陆续到的，先给个占位色，别一片死白
    keepBuffer: 4
  }).addTo(map)

  // 只在"第一次铺满"时提示；后面拖动/缩放时瓦片会反复 load，
  // 一直弹提示反而晃眼
  tilesReady.value = false
  let firstLoadDone = false
  tiles.on('load', () => {
    firstLoadDone = true
    tilesReady.value = true
  })
  tiles.on('loading', () => {
    if (!firstLoadDone) tilesReady.value = false
  })
  // 兜底：网络一直不通也别让"加载中"转圈转到天荒地老
  setTimeout(() => { tilesReady.value = true }, 8000)

  map.on('click', collapseOnMapUse)
  map.on('dragstart', collapseOnMapUse)

  locations.value.forEach((loc) => addMarker(loc))
  drawMigrationRoute()
  fitToLocations()

  // 页面刚插入时容器高度可能还没定下来（安卓地址栏、keep-alive 恢复），
  // Leaflet 只按自己量到的尺寸裁瓦片，不重新量就会只画一半。
  resyncMapSize()
}

/** 等布局稳定后让 Leaflet 重新量一次容器尺寸 */
const resyncMapSize = () => {
  if (!map) return
  requestAnimationFrame(() => map && map.invalidateSize())
  setTimeout(() => map && map.invalidateSize(), 320)
}

/** 打开就有内容：有地点就框住它们，没有就给全国视野 */
const fitToLocations = () => {
  if (!map) return
  const pts = locations.value
    .filter((l) => isValidCoord(l.latitude, l.longitude))
    .map((l) => [Number(l.latitude), Number(l.longitude)])
  if (!pts.length) {
    map.setView([34.2, 108.9], 4)
    return
  }
  if (pts.length === 1) {
    map.setView(pts[0], 13)
    return
  }
  map.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 12 })
}

const addMarker = (loc) => {
  if (!map || !isValidCoord(loc.latitude, loc.longitude)) return

  const initial = esc((loc.name || '·').charAt(0))
  const icon = L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:32px;height:32px;background:var(--fv-primary);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:#fff;font-size:14px;font-weight:600">${initial}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -28]
  })

  const marker = L.marker([Number(loc.latitude), Number(loc.longitude)], { icon })
    .addTo(map)
    .bindPopup(
      `<div style="min-width:140px;padding:4px">
        <h4 style="margin:0 0 6px;font-size:14px">${esc(loc.name)}</h4>
        <p style="margin:0;font-size:12px;color:#8e7c69">${loc.year ? esc(loc.year) + '年' : ''}<br>${esc(loc.description || '')}</p>
      </div>`
    )

  markerById.set(loc.id, marker)
  markers.push(marker)
}

const refreshMarkers = () => {
  markers.forEach((m) => map && map.removeLayer(m))
  markers = []
  markerById.clear()
  locations.value.forEach((loc) => addMarker(loc))
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

const drawMigrationRoute = () => {
  if (!map || locations.value.length < 2) return
  const valid = sortedLocations.value.filter((l) => isValidCoord(l.latitude, l.longitude))
  if (valid.length < 2) return
  const latlngs = valid.map((loc) => [Number(loc.latitude), Number(loc.longitude)])
  routeLine = L.polyline(latlngs, {
    color: '#b4442e',
    weight: 3,
    opacity: 0.55,
    dashArray: '8, 8'
  }).addTo(map)
}

/**
 * 被抽屉/表单挡住的高度。
 * 飞过去的时候要把这一段"让"出来，否则大头针正正好藏在面板后面。
 */
const occludedBottom = () => {
  const wrap = mapWrap.value
  if (!wrap) return 0
  const rect = wrap.getBoundingClientRect()
  let covered = 0

  if (showAddLocation.value) {
    // 组件 ref 拿不到 $el（Vant 用的是 expose 代理），直接量 DOM
    const r = document.querySelector('.map-page .add-popup')?.getBoundingClientRect()
    if (r && r.height > 40) covered = rect.bottom - r.top
  }
  if (covered <= 0) covered = sheetHeight.value
  return Math.max(0, Math.min(covered, rect.height * 0.85))
}

/** 飞到目标点，并让它落在可见区域中间（不是被面板挡住的中间） */
const flyToVisible = (lat, lng, zoom = 14, opts = {}) => {
  if (!map) return
  const offset = Math.round(occludedBottom() / 2)
  const point = map.project([lat, lng], zoom)
  const target = map.unproject(point.add([0, offset]), zoom)
  if (opts.instant) {
    map.setView(target, zoom)
  } else {
    map.flyTo(target, zoom, { duration: 0.9 })
  }
}

const flyToLocation = (loc) => {
  if (!map || !isValidCoord(loc.latitude, loc.longitude)) return
  flyToVisible(Number(loc.latitude), Number(loc.longitude), 15)
  const marker = markerById.get(loc.id)
  if (marker) setTimeout(() => marker.openPopup(), 1000)
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
  pickedCoord.value = { latitude: Number(loc.latitude), longitude: Number(loc.longitude) }
  pickedAddress.value = loc.address || ''
  pickedSource.value = loc.address ? '已保存的位置' : ''
  showLocationDetail.value = false
  showAddLocation.value = true
}

/**
 * 老数据救急：以前存的坐标可能是系统没校准过的，
 * 一键按地名重新查一遍，用户点一下结果就校准了。
 */
const relocateSelected = () => {
  const loc = selectedLocation.value
  if (!loc) return
  editSelected()
  nextTick(() => {
    placeQuery.value = loc.name || ''
    onSearchPlace()
  })
}

const removeLocation = (loc) => {
  locations.value = locations.value.filter((l) => l.id !== loc.id)
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

// ---- 图上的大头针（拖动 / 点地图移动）----
const pickedIcon = () =>
  L.divIcon({
    className: 'temp-pin',
    html: `<div style="width:46px;height:56px;display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 6px rgba(0,0,0,.32))">
      <div style="width:46px;height:46px;border-radius:50%;background:rgba(180,68,46,.2);display:flex;align-items:center;justify-content:center">
        <div style="width:24px;height:24px;border-radius:50%;background:#b4442e;border:3px solid #fff;box-sizing:border-box"></div>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:9px solid #b4442e;margin-top:-4px"></div>
    </div>`,
    iconSize: [46, 56],
    iconAnchor: [23, 51]
  })

const movePickedMarker = (lat, lng) => {
  if (!map) return
  if (!pickedMarker) {
    pickedMarker = L.marker([lat, lng], { icon: pickedIcon(), draggable: true, zIndexOffset: 1000 }).addTo(map)
    pickedMarker.on('dragend', () => {
      const p = pickedMarker.getLatLng()
      pickedCoord.value = { latitude: p.lat, longitude: p.lng }
      pickedSource.value = '手动拖动'
      refreshAddress()
    })
  } else {
    pickedMarker.setLatLng([lat, lng])
  }
  pickedMarker.bindTooltip('拖我微调位置', { direction: 'top', offset: [0, -46] })
}

/** 用户点地图 / 拖大头针后，反查一次地址，让他确认"是不是这儿" */
const refreshAddress = () => {
  if (addressTimer) clearTimeout(addressTimer)
  addressTimer = setTimeout(async () => {
    const c = pickedCoord.value
    if (!c) return
    const w = gcj02ToWgs84(c.latitude, c.longitude)
    if (!w) return
    try {
      const res = await geoApi.reverse(w.latitude, w.longitude)
      if (res?.success && res.data && pickedCoord.value === c) {
        pickedAddress.value = res.data.address || res.data.name || ''
      }
    } catch { /* 查不到地址就保持安静 */ }
  }, 500)
}

watch(showAddLocation, (open) => {
  if (open) {
    nextTick(() => {
      if (!map) return
      onMapPick = (e) => {
        setPicked(e.latlng.lat, e.latlng.lng, { source: '地图点选' })
        pickedAddress.value = ''
        refreshAddress()
      }
      map.on('click', onMapPick)
      map.getContainer().classList.add('is-picking')
      // 有坐标就先飞过去，让用户看清是不是那个位置
      if (pickedCoord.value) {
        setTimeout(() => flyToVisible(pickedCoord.value.latitude, pickedCoord.value.longitude, 15, { instant: true }), 260)
      }
    })
  } else {
    if (map && onMapPick) {
      map.off('click', onMapPick)
      map.getContainer().classList.remove('is-picking')
    }
    onMapPick = null
  }
})

const onFormOpened = () => {
  if (pickedCoord.value) {
    flyToVisible(pickedCoord.value.latitude, pickedCoord.value.longitude, 15, { instant: true })
  }
}

const onFormClosed = () => {
  editingId.value = null
  resetAddForm()
  if (pickedMarker && map) map.removeLayer(pickedMarker)
  pickedMarker = null
  pickedCoord.value = null
  pickedAddress.value = ''
  pickedSource.value = ''
  searchResults.value = []
  searchMissed.value = false
  placeQuery.value = ''
  if (addressTimer) {
    clearTimeout(addressTimer)
    addressTimer = null
  }
}

// ---- 保存 ----
const onAddLocation = () => {
  if (!newLocation.value.name.trim()) {
    showToast('请输入地点名称')
    return
  }
  // 没有坐标绝不猜：宁可让用户点一下，也不悄悄记住一个错的位置
  if (!pickedCoord.value) {
    showToast('先在地图上点一下这个地点在哪')
    return
  }

  const payload = {
    name: newLocation.value.name.trim(),
    year: parseInt(newLocation.value.year, 10) || new Date().getFullYear(),
    description: newLocation.value.description || '',
    latitude: Number(pickedCoord.value.latitude.toFixed(6)),
    longitude: Number(pickedCoord.value.longitude.toFixed(6)),
    address: pickedAddress.value || '',
    coordSys: 'gcj02'
  }

  let target = null
  if (editingId.value) {
    const idx = locations.value.findIndex((l) => l.id === editingId.value)
    if (idx >= 0) {
      locations.value[idx] = { ...locations.value[idx], ...payload }
      target = locations.value[idx]
    }
    showToast('已保存修改')
  } else {
    target = { id: Date.now(), ...payload }
    locations.value.push(target)
    showToast('已添加')
  }

  saveLocations()
  refreshMarkers()
  showAddLocation.value = false
  // 等弹窗收完再飞，否则偏移按弹窗高度算，落点会歪
  if (target) setTimeout(() => flyToLocation(target), 340)
}

const resetAddForm = () => {
  newLocation.value = { name: '', year: '', description: '' }
  aiInput.value = ''
}

const startAdd = () => {
  editingId.value = null
  resetAddForm()
  pickedCoord.value = null
  pickedAddress.value = ''
  pickedSource.value = ''
  searchResults.value = []
  searchMissed.value = false
  placeQuery.value = ''
  showAddLocation.value = true
}

const onResize = () => {
  clampSheet()
  if (map) map.invalidateSize()
}
onMounted(async () => {
  await nextTick()
  initMap()
  // 默认收起：进页面就是一张完整的地图，要看地点列表点一下标题栏就行
  sheetHeight.value = snapPoints()[0]
  window.addEventListener('resize', onResize)
  window.addEventListener('orientationchange', onResize)
})

// keep-alive 缓存后再次进来：DOM 是重新挂回页面的，Leaflet 还记着上一次的尺寸
onActivated(() => {
  nextTick(() => {
    clampSheet()
    resyncMapSize()
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  window.removeEventListener('orientationchange', onResize)
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  window.removeEventListener('pointercancel', onDragEnd)
  if (addressTimer) clearTimeout(addressTimer)
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<style scoped>
.map-page {
  /* 减去底部标签栏的 50px */
  height: calc(100vh - 54px);
  height: calc(100dvh - 54px);
  background: var(--fv-paper-deep);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 地图铺满导航栏以下的全部空间 */
.map-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.map-canvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: #e9e6df;
}

.map-canvas.is-picking {
  cursor: crosshair;
}

/* 瓦片加载提示：浮在地图上方，不挡点击 */
.map-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 450;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 253, 248, 0.94);
  box-shadow: 0 2px 12px rgba(43, 33, 25, 0.14);
  font-size: 12px;
  color: var(--fv-ink-3);
  pointer-events: none;
}

/* 选点浮动提示 */
.pick-tip {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 500;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 253, 248, 0.95);
  box-shadow: 0 2px 10px rgba(43, 33, 25, 0.16);
  font-size: 12px;
  color: var(--fv-ink-2);
  white-space: nowrap;
  pointer-events: none;
}

/* ---------- 底部抽屉 ---------- */
.sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 600;
  display: flex;
  flex-direction: column;
  background: var(--fv-surface);
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -2px 16px rgba(43, 33, 25, 0.12);
  overflow: hidden;
  will-change: height;
  transition: height 0.28s cubic-bezier(0.22, 0.8, 0.24, 1);
}

.sheet.is-dragging {
  transition: none;
  user-select: none;
}

.sheet-grip {
  flex-shrink: 0;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
  cursor: grab;
}

.sheet-grip__bar {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #ddd2c2;
}

.sheet-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 10px;
  touch-action: none;
  border-bottom: 1px solid var(--fv-border-soft);
}

.head-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--fv-ink);
}

.head-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--fv-primary-soft);
  color: var(--fv-primary);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
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
  padding: 6px 2px 6px 10px;
}

.sheet-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  transition: opacity 0.18s ease;
}

.sheet-body.is-collapsed {
  opacity: 0;
  pointer-events: none;
}

.location-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #f8f5ef;
  cursor: pointer;
}

.location-item:active {
  background: var(--fv-primary-soft);
}

.location-item:last-of-type {
  border-bottom: none;
}

.sheet-foot {
  padding: 14px 16px 20px;
  text-align: center;
  font-size: 11px;
  color: var(--fv-ink-4);
}

.loc-icon {
  font-size: 20px;
  margin-right: 12px;
}

.loc-info {
  flex: 1;
  min-width: 0;
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.loc-delete {
  padding: 8px;
  margin: -8px -4px -8px 4px;
  flex-shrink: 0;
}

/* ---------- 地点详情 ---------- */
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
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--fv-ink-3);
  line-height: 1.6;
}

.loc-detail__addr {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  font-size: 12px !important;
  color: var(--fv-ink-4) !important;
}

.loc-detail__actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.loc-detail__danger {
  color: #b4442e;
  border-color: rgba(180, 68, 46, 0.35);
}

/* ---------- 添加/编辑表单 ---------- */
.add-location-form {
  padding: 14px 0 28px;
  height: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  margin-bottom: 10px;
}

.form-head h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--fv-ink);
}

.ai-panel {
  margin: 0 16px 10px;
  padding: 6px 12px 10px;
  background: var(--fv-primary-soft);
  border: 1px solid #f2ddd3;
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
  color: var(--fv-ink-3);
  line-height: 1.4;
}

/* 定位状态 + 搜索 */
.locate-panel {
  margin: 0 16px 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--fv-surface-cream);
  border: 1px solid var(--fv-border-cream);
}

.locate-status {
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.locate-status__text {
  flex: 1;
  min-width: 0;
}

.locate-status__addr {
  font-size: 12px;
  line-height: 1.5;
  color: var(--fv-ink-2);
}

.locate-status__meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--fv-ink-4);
}

.locate-clear {
  border: none;
  background: transparent;
  padding: 0;
  font-size: 11px;
  color: var(--fv-primary);
}

.locate-status__empty {
  font-size: 12px;
  line-height: 1.5;
  color: var(--fv-ink-3);
}

.locate-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 0 8px 0 2px;
  height: 34px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid var(--fv-border);
}

.locate-input {
  flex: 1;
  padding: 0 0 0 8px;
  background: transparent;
}

.locate-input :deep(.van-field__control) {
  font-size: 13px;
}

.locate-search__btn {
  flex-shrink: 0;
  min-width: 46px;
  height: 26px;
  font-size: 12px;
  background: var(--fv-primary);
  border-color: var(--fv-primary);
}

.search-results {
  margin-top: 8px;
  border-radius: 10px;
  background: #fff;
  border: 1px solid var(--fv-border-soft);
  overflow: hidden;
}

.search-item {
  padding: 8px 10px;
  border-bottom: 1px solid #f7f2ea;
  cursor: pointer;
}

.search-item:last-child {
  border-bottom: none;
}

.search-item:active {
  background: var(--fv-primary-soft);
}

.search-item__name {
  font-size: 13px;
  color: var(--fv-ink);
}

.search-item__addr {
  font-size: 11px;
  color: var(--fv-ink-4);
  margin-top: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-missed {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--fv-ink-3);
}

.form-submit {
  margin: 16px;
}

/* 自定义标记 */
:global(.custom-marker) {
  background: transparent;
  border: none;
}

:global(.temp-pin) {
  background: transparent;
  border: none;
}

:global(.leaflet-tooltip) {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 10px;
}
</style>
