<template>
  <div class="map-page">
    <van-nav-bar title="记忆地图" left-arrow @click-left="$router.back()" />

    <!-- 地图容器 -->
    <div class="map-container">
      <div ref="mapContainer" class="map-canvas"></div>

      <!-- 地点列表 -->
      <div class="location-list">
        <div class="list-header">
          <span class="list-title">记忆地点 ({{ locations.length }})</span>
        </div>
        <div class="location-items">
          <div
            v-for="loc in locations"
            :key="loc.id"
            class="location-item"
            @click="flyToLocation(loc)"
          >
            <div class="loc-icon">
            <van-icon name="location-o" size="20" color="#007aff" />
          </div>
            <div class="loc-info">
              <div class="loc-name">{{ loc.name }}</div>
              <div class="loc-desc">{{ loc.year }}年 · {{ loc.description }}</div>
            </div>
            <van-icon name="arrow" color="#ccc" size="16" />
          </div>
        </div>
      </div>

      <!-- 添加地点按钮 -->
      <div class="fab" @click="showAddLocation = true">
        <van-icon name="plus" size="24" color="white" />
      </div>
    </div>

    <!-- 添加地点弹窗 -->
    <van-popup
      v-model:show="showAddLocation"
      position="bottom"
      round
      :style="{ height: '55%' }"
    >
      <div class="add-location-form">
        <h3>添加记忆地点</h3>

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
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast } from 'vant'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import storage, { STORAGE_KEYS } from '@/utils/storage'

const mapContainer = ref(null)
const showAddLocation = ref(false)

// 默认地点数据
const defaultLocations = [
  {
    id: 1,
    name: '爷爷的老家',
    year: 1930,
    description: '爷爷出生和长大的地方',
    latitude: 30.5928,
    longitude: 114.3055,
  },
  {
    id: 2,
    name: '奶奶的娘家',
    year: 1935,
    description: '奶奶小时候住的地方',
    latitude: 30.6598,
    longitude: 104.0633,
  },
  {
    id: 3,
    name: '爸妈结婚的地方',
    year: 1975,
    description: '武汉市江汉区',
    latitude: 30.5833,
    longitude: 114.2667,
  },
  {
    id: 4,
    name: '爸爸上大学',
    year: 1996,
    description: '武汉大学',
    latitude: 30.5433,
    longitude: 114.3567,
  },
  {
    id: 5,
    name: '我的出生地',
    year: 2005,
    description: '武汉市协和医院',
    latitude: 30.5800,
    longitude: 114.2800,
  }
]

// 从 localStorage 加载地点
const locations = ref(storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, null) || defaultLocations)

// 保存地点到 localStorage
const saveLocations = () => {
  storage.set(STORAGE_KEYS.MEMORY_LOCATIONS, locations.value)
}

const newLocation = ref({
  name: '',
  year: '',
  description: ''
})

let map = null
let markers = []
let routeLine = null

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
    html: `<div style="width: 32px; height: 32px; background: #007aff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="transform: rotate(45deg); color: white; font-size: 14px; font-weight: 600;">${loc.name.charAt(0)}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })

  const marker = L.marker([loc.latitude, loc.longitude], { icon })
    .addTo(map)
    .bindPopup(`
      <div style="min-width: 140px; padding: 4px;">
        <h4 style="margin: 0 0 6px 0; font-size: 14px;">${loc.name}</h4>
        <p style="margin: 0; font-size: 12px; color: #666;">
          ${loc.year}年<br>${loc.description}
        </p>
      </div>
    `)

  markers.push(marker)
}

// 绘制迁徙路线
const drawMigrationRoute = () => {
  if (!map || locations.value.length < 2) return

  const sortedLocations = [...locations.value].sort((a, b) => a.year - b.year)
  const latlngs = sortedLocations.map(loc => [loc.latitude, loc.longitude])

  routeLine = L.polyline(latlngs, {
    color: '#007aff',
    weight: 3,
    opacity: 0.7,
    dashArray: '8, 8'
  }).addTo(map)
}

// 飞到指定位置
const flyToLocation = (loc) => {
  if (map) {
    map.flyTo([loc.latitude, loc.longitude], 14, { duration: 1.5 })

    // 打开对应的 popup
    const marker = markers.find(m => {
      const latlng = m.getLatLng()
      return Math.abs(latlng.lat - loc.latitude) < 0.001 &&
             Math.abs(latlng.lng - loc.longitude) < 0.001
    })
    if (marker) {
      setTimeout(() => marker.openPopup(), 1500)
    }
  }
}

// 添加地点
const onAddLocation = () => {
  if (!newLocation.value.name) {
    showToast('请输入地点名称')
    return
  }

  const newLoc = {
    id: Date.now(),
    name: newLocation.value.name,
    year: parseInt(newLocation.value.year) || new Date().getFullYear(),
    description: newLocation.value.description,
    latitude: 30.5928 + (Math.random() - 0.5) * 0.1,
    longitude: 114.3055 + (Math.random() - 0.5) * 0.1
  }

  locations.value.push(newLoc)
  saveLocations()
  addMarker(newLoc)
  drawMigrationRoute()

  showToast('添加成功')
  showAddLocation.value = false
  newLocation.value = { name: '', year: '', description: '' }
}

onMounted(async () => {
  await nextTick()
  initMap()
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
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
  background: white;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.06);
  max-height: 45vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 14px 16px 10px;
  border-bottom: 1px solid #f5f5f5;
}

.list-title {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.location-items {
  overflow-y: auto;
  flex: 1;
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
  background: #f8f9ff;
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

.loc-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 2px;
}

.loc-desc {
  font-size: 12px;
  color: #999;
}

.fab {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #007aff;
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
}

.add-location-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
  font-weight: 600;
}

/* 自定义标记样式 */
:global(.custom-marker) {
  background: transparent;
  border: none;
}
</style>
