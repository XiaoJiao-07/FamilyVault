import axios from 'axios'

/**
 * 地名地理编码（把"武汉大学"变成经纬度）
 *
 * 为什么需要它：大模型给的经纬度是"印象里的数字"，经常整个城区甚至整个省份都偏；
 * 而地图底图是高德的 GCJ-02 瓦片，模型即便给对了 WGS-84 坐标，直接画在图上也会偏几百米。
 * 所以定位一律走真实地理库（Photon / OpenStreetMap），再由前端统一转成 GCJ-02。
 *
 * 服务选择：Photon 免密钥、支持中文地名，国内网络可直连；返回的是 WGS-84。
 * 可用 GEOCODE_API_URL 换成自建实例或其它兼容 Photon 协议的服务。
 */

const BASE = (process.env.GEOCODE_API_URL || 'https://photon.komoot.io').replace(/\/+$/, '')
const TIMEOUT = Number(process.env.GEOCODE_TIMEOUT || 7000)
const UA = 'FamilyVault/1.0 (family memory map; +https://familyvault.app.workbuddy.host)'

// 可选：填了高德 Web 服务 key 就优先用高德。
// 中文地名、乡镇村落的覆盖比 OSM 好得多，而且返回的就是 GCJ-02（底图坐标系），不用再转换。
const AMAP_KEY = process.env.AMAP_KEY || ''

// 进程内缓存：同一个地名反复搜（AI 识别 + 用户搜索）不必重复出去
const CACHE_MAX = 400
const CACHE_TTL = 24 * 60 * 60 * 1000
const cache = new Map()

function cacheGet(key) {
  const hit = cache.get(key)
  if (!hit) return null
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key)
    return null
  }
  return hit.value
}

function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    // 简单淘汰：删掉最早插入的一条（Map 保持插入顺序）
    const first = cache.keys().next().value
    if (first !== undefined) cache.delete(first)
  }
  cache.set(key, { at: Date.now(), value })
}

const clean = (v) => (typeof v === 'string' ? v.trim() : '')

/** 把 Photon 的 feature 压成前端好用的结构（坐标为 WGS-84） */
function toPlace(feature) {
  const p = feature?.properties || {}
  const c = feature?.geometry?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const lng = Number(c[0])
  const lat = Number(c[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const province = clean(p.state) || clean(p.province)
  const city = clean(p.city) || clean(p.county)
  const district = clean(p.district) || clean(p.locality) || clean(p.suburb)
  const street = [clean(p.street), clean(p.housenumber)].filter(Boolean).join(' ')
  const name = clean(p.name) || clean(p.street) || city || province

  const address = [province, city, district, street]
    .filter(Boolean)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(' ')

  return {
    name,
    address: address || clean(p.country),
    province,
    city,
    district,
    country: clean(p.country),
    // WGS-84，前端负责转 GCJ-02
    latitude: lat,
    longitude: lng,
    kind: [clean(p.osm_key), clean(p.osm_value)].filter(Boolean).join('/')
  }
}

/**
 * 地名搜索
 * @param {string} query 地名，如"武汉大学"
 * @param {{limit?:number, lat?:number, lng?:number}} opts lat/lng 用于结果加权（优先附近）
 * @returns {Promise<Array>} 结果列表（可能为空）。每项都带 coordSys：
 *   'gcj02'（高德直出，可直接上图）或 'wgs84'（OSM 系，前端需转换）
 */
export async function searchPlaces(query, opts = {}) {
  const q = clean(query).slice(0, 80)
  if (!q) return []

  const limit = Math.min(Math.max(Number(opts.limit) || 5, 1), 10)
  const key = `s:${q}|${limit}|${AMAP_KEY ? 'amap' : 'photon'}`

  const cached = cacheGet(key)
  if (cached) return cached

  let places = []
  if (AMAP_KEY) {
    try {
      places = await searchByAmap(q, limit, opts)
    } catch (err) {
      console.warn('高德地名检索失败，回退 OSM：', err.message)
    }
  }
  if (!places.length) {
    places = await searchByPhoton(q, limit, opts)
  }

  cacheSet(key, places)
  return places
}

/** 高德 POI 检索（返回 GCJ-02） */
async function searchByAmap(q, limit, opts) {
  const base = { key: AMAP_KEY, keywords: q, offset: limit, page: 1, extensions: 'base' }
  if (Number.isFinite(Number(opts.lat)) && Number.isFinite(Number(opts.lng))) {
    base.location = `${Number(opts.lng)},${Number(opts.lat)}`
  }
  const res = await axios.get('https://restapi.amap.com/v3/place/text', {
    params: base,
    timeout: TIMEOUT,
    validateStatus: () => true
  })
  if (res.data?.status !== '1') return []
  const pois = Array.isArray(res.data.pois) ? res.data.pois : []
  return pois
    .map((p) => {
      const [lng, lat] = String(p.location || '').split(',').map(Number)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
      const province = clean(p.pname)
      const city = clean(p.cityname)
      const district = clean(p.adname)
      const address = [province, city, district, clean(p.address)]
        .filter(Boolean)
        .filter((v, i, arr) => arr.indexOf(v) === i)
        .join(' ')
      return {
        name: clean(p.name) || q,
        address,
        province,
        city,
        district,
        country: '中国',
        latitude: lat,
        longitude: lng,
        kind: `amap/${clean(p.typecode)}`,
        coordSys: 'gcj02'
      }
    })
    .filter(Boolean)
}

/** Photon（OpenStreetMap，免密钥，返回 WGS-84） */
async function searchByPhoton(q, limit, opts) {
  const biasLat = Number(opts.lat)
  const biasLng = Number(opts.lng)
  const hasBias = Number.isFinite(biasLat) && Number.isFinite(biasLng)

  const params = { q, limit: Math.max(limit, 6) }
  // lat/lon 只做"就近加权"，不是必填；带错参数会被服务端 400 拒掉，所以下面有降级重试
  if (hasBias) {
    params.lat = biasLat
    params.lon = biasLng
  }

  const fetchOnce = (p) =>
    axios.get(`${BASE}/api`, {
      params: p,
      timeout: TIMEOUT,
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      validateStatus: (s) => s >= 200 && s < 500
    })

  let res = await fetchOnce(params)
  if (res.status === 400 && hasBias) {
    // 偏置参数被拒时退回纯地名查询，宁可少一点相关性，也不能没有结果
    const { lat, lon, ...rest } = params
    res = await fetchOnce(rest)
  }

  if (res.status >= 400) throw new Error(`geocode ${res.status}`)
  const features = Array.isArray(res.data?.features) ? res.data.features : []
  return features
    .map(toPlace)
    .filter(Boolean)
    .slice(0, limit)
    .map((p) => ({ ...p, coordSys: 'wgs84' }))
}

/**
 * 逆地理编码：坐标 → 地址文字。用于用户拖完大头针后确认"是不是这里"。
 * @returns {Promise<object|null>}
 */
export async function reverseGeocode(lat, lng) {
  const la = Number(lat)
  const ln = Number(lng)
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return null
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null

  const key = `r:${la.toFixed(4)},${ln.toFixed(4)}`
  const cached = cacheGet(key)
  if (cached !== null) return cached

  const res = await axios.get(`${BASE}/reverse`, {
    params: { lat: la, lon: ln, limit: 1 },
    timeout: TIMEOUT,
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    validateStatus: (s) => s >= 200 && s < 500
  })

  if (res.status >= 400) throw new Error(`geocode ${res.status}`)
  const features = Array.isArray(res.data?.features) ? res.data.features : []
  const place = features.length ? toPlace(features[0]) : null
  cacheSet(key, place)
  return place ? { ...place, coordSys: 'wgs84' } : null
}

/** 供 /api/health 之类展示，判断服务是否可用 */
export function geoProvider() {
  return { provider: 'photon', base: BASE, timeout: TIMEOUT }
}
