import express from 'express'
import { searchPlaces, reverseGeocode } from '../services/geoService.js'

/**
 * 地名检索
 *
 * 公开接口（记忆地图在未登录时也能用），因此加了一个很轻的按 IP 限流，
 * 避免被当成免费的地理编码代理刷。
 */
const router = express.Router()

const WINDOW = 60 * 1000
const MAX_PER_WINDOW = 40
const hits = new Map()

function rateLimited(ip) {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now - rec.start > WINDOW) {
    hits.set(ip, { start: now, count: 1 })
    if (hits.size > 2000) hits.clear()
    return false
  }
  rec.count += 1
  return rec.count > MAX_PER_WINDOW
}

// GET /api/geo/search?q=武汉大学&lat=&lng=
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) {
    return res.status(400).json({ success: false, message: '缺少地名' })
  }
  if (rateLimited(req.ip)) {
    return res.status(429).json({ success: false, message: '搜索太频繁，稍等一下' })
  }

  try {
    const places = await searchPlaces(q, {
      limit: req.query.limit,
      lat: req.query.lat,
      lng: req.query.lng
    })
    res.json({ success: true, data: places })
  } catch (err) {
    console.warn('地名搜索失败：', err.message)
    // 明确告诉前端"没查到"，由前端引导用户手动点地图，不编造坐标
    res.status(200).json({ success: false, message: '地名服务暂时不可用', data: [] })
  }
})

// GET /api/geo/reverse?lat=&lng=
router.get('/reverse', async (req, res) => {
  if (rateLimited(req.ip)) {
    return res.status(429).json({ success: false, message: '请求太频繁，稍等一下' })
  }
  try {
    const place = await reverseGeocode(req.query.lat, req.query.lng)
    res.json({ success: true, data: place })
  } catch (err) {
    console.warn('逆地理编码失败：', err.message)
    res.json({ success: false, data: null })
  }
})

export default router
