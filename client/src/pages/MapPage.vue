<template>
  <div class="map-page">
    <van-nav-bar title="记忆地图" left-arrow @click-left="$router.back()" />

    <!-- 空状态 -->
    <div v-if="!hasLocations" class="empty-state">
      <van-icon name="map-o" size="64" color="#ddd" />
      <p class="empty-title">记忆地图</p>
      <p class="empty-desc">在地图上标注家族故事发生地，可视化迁徙路线</p>
      <van-button type="primary" plain @click="$router.push('/interview')">
        去采访
      </van-button>
    </div>

    <!-- 地图容器 -->
    <div v-else class="map-container">
      <div ref="mapContainer" class="map-canvas"></div>

      <!-- 地点列表 -->
      <div class="location-list">
        <van-cell-group inset>
          <van-cell
            v-for="loc in locations"
            :key="loc.id"
            :title="loc.name"
            :label="`${loc.year || '未知'}年 · ${loc.description || ''}`"
            icon="location-o"
            @click="flyToLocation(loc)"
          />
        </van-cell-group>
      </div>

      <!-- 添加地点按钮 -->
      <van-button
        class="add-location-btn"
        type="primary"
        icon="plus"
        round
        @click="showAddLocation = true"
      >
        添加地点
      </van-button>
    </div>

    <!-- 添加地点弹窗 -->
    <van-popup
      v-model:show="showAddLocation"
      position="bottom"
      round
      :style="{ height: '60%' }"
    >
      <div class="add-location-form">
        <h3>添加记忆地点</h3>

        <!-- 地图选点 -->
        <div class="picker-map">
          <div ref="pickerMapContainer" class="picker-map-canvas"></div>
          <div class="picker-tip">点击地图选择位置</div>
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

          <div v-if="selectedPoint" class="selected-point">
            <van-tag type="success">
              已选择：{{ selectedPoint.lat.toFixed(6) }}, {{ selectedPoint.lng.toFixed(6) }}
            </van-tag>
          </div>

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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast } from 'vant'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const mapContainer = ref(null)
const pickerMapContainer = ref(null)
const showAddLocation = ref(false)
const locations = ref([])
const selectedPoint = ref(null)

let map = null
let pickerMap = null
let pickerMarker = null

const newLocation = ref({
  name: '',
  year: '',
  description: '',
  latitude: null,
  longitude: null
})

const hasLocations = computed(() => locations.value.length > 0)

// 初始化主地图
const initMap = () => {
  if (!mapContainer.value) return

  // 默认中心点（中国中心）
  const defaultCenter = [35.8617, 104.1954]

  map = L.map(mapContainer.value).setView(defaultCenter, 4)

  // 使用高德地图瓦片
  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: '1234',
    attribution: '© 高德地图'
  }).addTo(map)

  // 添加地点标记
  locations.value.forEach(loc => {
    addMarker(loc)
  })
}

// 添加标记
const addMarker = (loc) => {
  if (!map) return

  const marker = L.marker([loc.latitude, loc.longitude])
    .addTo(map)
    .bindPopup(`
      <div style="min-width: 150px;">
        <h4 style="margin: 0 0 8px 0;">${loc.name}</h4>
        <p style="margin: 0; font-size: 12px; color: #666;">
          ${loc.year ? loc.year + '年' : ''}
          ${loc.description ? '<br>' + loc.description : ''}
        </p>
      </div>
    `)

  marker.locationData = loc
}

// 飞到指定位置
const flyToLocation = (loc) => {
  if (map) {
    map.flyTo([loc.latitude, loc.longitude], 12, {
      duration: 1.5
    })
  }
}

// 初始化选点地图
const initPickerMap = () => {
  if (!pickerMapContainer.value) return

  const defaultCenter = [35.8617, 104.1954]

  pickerMap = L.map(pickerMapContainer.value).setView(defaultCenter, 4)

  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: '1234',
    attribution: '© 高德地图'
  }).addTo(pickerMap)

  // 点击选点
  pickerMap.on('click', (e) => {
    const { lat, lng } = e.latlng

    if (pickerMarker) {
      pickerMap.removeLayer(pickerMarker)
    }

    pickerMarker = L.marker([lat, lng]).addTo(pickerMap)

    selectedPoint.value = { lat, lng }
    newLocation.value.latitude = lat
    newLocation.value.longitude = lng
  })
}

// 添加地点
const onAddLocation = async () => {
  if (!selectedPoint.value) {
    showToast('请先在地图上选择位置')
    return
  }

  // TODO: 调用 API 保存地点
  locations.value.push({
    id: Date.now(),
    name: newLocation.value.name,
    year: parseInt(newLocation.value.year) || null,
    description: newLocation.value.description,
    latitude: selectedPoint.value.lat,
    longitude: selectedPoint.value.lng
  })

  addMarker(locations.value[locations.value.length - 1])

  showToast('添加成功')
  showAddLocation.value = false

  // 重置表单
  newLocation.value = {
    name: '',
    year: '',
    description: '',
    latitude: null,
    longitude: null
  }
  selectedPoint.value = null

  // 清理选点地图
  if (pickerMap) {
    pickerMap.remove()
    pickerMap = null
    pickerMarker = null
  }
}

// 模拟数据（演示用）
const loadMockData = () => {
  locations.value = [
    {
      id: 1,
      name: '爷爷的老家',
      year: 1930,
      description: '爷爷出生和长大的地方',
      latitude: 30.5928,
      longitude: 114.3055
    },
    {
      id: 2,
      name: '奶奶的娘家',
      year: 1935,
      description: '奶奶小时候住的地方',
      latitude: 30.6598,
      longitude: 104.0633
    },
    {
      id: 3,
      name: '爸妈结婚的地方',
      year: 1975,
      description: '武汉市江汉区',
      latitude: 30.5833,
      longitude: 114.2667
    }
  ]
}

onMounted(async () => {
  // 加载数据（先用模拟数据）
  loadMockData()

  await nextTick()
  initMap()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
  if (pickerMap) {
    pickerMap.remove()
    pickerMap = null
  }
})
</script>

<style scoped>
.map-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  flex: 1;
}

.empty-title {
  margin: 12px 0;
  font-size: 16px;
  color: #666;
}

.empty-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 24px;
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
  max-height: 200px;
  overflow-y: auto;
  background: white;
}

.add-location-btn {
  position: absolute;
  bottom: 20px;
  right: 20px;
  z-index: 1000;
}

.add-location-form {
  padding: 16px;
}

.add-location-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
}

.picker-map {
  height: 200px;
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.picker-map-canvas {
  width: 100%;
  height: 100%;
}

.picker-tip {
  text-align: center;
  font-size: 12px;
  color: #999;
  margin-top: 8px;
}

.selected-point {
  text-align: center;
  margin: 8px 0;
}
</style>