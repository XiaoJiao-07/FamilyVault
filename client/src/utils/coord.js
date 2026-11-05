/**
 * 坐标系转换（GCJ-02 / WGS-84）
 *
 * 地图底图用的是高德瓦片，属于 GCJ-02（火星坐标系）；
 * 而 OpenStreetMap、GPS、手机定位、地理编码服务返回的都是 WGS-84。
 * 两者在国内相差 300~800 米——直接把 WGS-84 画在高德底图上，就会出现
 * "我明明写的是武汉大学，针却插在隔壁街区"的情况。
 *
 * 约定：应用内所有存储与展示的坐标一律是 GCJ-02，
 * 任何外部来源（地理编码 / 手机定位 / 大模型）在进图之前都要先转换。
 */

const PI = Math.PI
const A = 6378245.0 // 克拉索夫斯基椭球长半轴
const EE = 0.00669342162296594323 // 偏心率平方

/** 境外坐标不做偏移 */
export function outOfChina(lat, lng) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * PI) + 40.0 * Math.sin((y / 3.0) * PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * PI) + 320 * Math.sin((y * PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * PI) + 40.0 * Math.sin((x / 3.0) * PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * PI) + 300.0 * Math.sin((x / 30.0) * PI)) * 2.0) / 3.0
  return ret
}

/** WGS-84 → GCJ-02 */
export function wgs84ToGcj02(lat, lng) {
  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (outOfChina(latitude, longitude)) return { latitude, longitude }

  let dLat = transformLat(longitude - 105.0, latitude - 35.0)
  let dLng = transformLng(longitude - 105.0, latitude - 35.0)
  const radLat = (latitude / 180.0) * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((A * (1 - EE)) / (magic * sqrtMagic)) * PI)
  dLng = (dLng * 180.0) / ((A / sqrtMagic) * Math.cos(radLat) * PI)
  return { latitude: latitude + dLat, longitude: longitude + dLng }
}

/** GCJ-02 → WGS-84（迭代逼近，精度 ~1 米） */
export function gcj02ToWgs84(lat, lng) {
  const gLat = Number(lat)
  const gLng = Number(lng)
  if (!Number.isFinite(gLat) || !Number.isFinite(gLng)) return null
  if (outOfChina(gLat, gLng)) return { latitude: gLat, longitude: gLng }

  let wLat = gLat
  let wLng = gLng
  for (let i = 0; i < 4; i += 1) {
    const g = wgs84ToGcj02(wLat, wLng)
    wLat += gLat - g.latitude
    wLng += gLng - g.longitude
  }
  return { latitude: wLat, longitude: wLng }
}

/** 两点的球面距离（米），用于判断"这个结果是不是离得太远" */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const toRad = (d) => (d * PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** 校验坐标是否可用 */
export function isValidCoord(lat, lng) {
  const la = Number(lat)
  const ln = Number(lng)
  return (
    Number.isFinite(la) &&
    Number.isFinite(ln) &&
    Math.abs(la) <= 90 &&
    Math.abs(ln) <= 180 &&
    !(la === 0 && ln === 0)
  )
}
