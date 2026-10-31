// 媒体链接助手
// 服务端的文件链接是带过期时间的签名链接，过期后需要重新换取。

import { mediaAPI } from './api'

const cache = new Map() // filename -> { url, expiresAt }

function isUsable(entry) {
  return entry && entry.expiresAt - Date.now() > 60 * 1000
}

/**
 * 取可用链接：命中缓存直接返回，否则批量向后端换取
 * @param {string} filename
 * @returns {Promise<string|null>}
 */
export async function resolveMediaUrl(filename) {
  if (!filename) return null
  const cached = cache.get(filename)
  if (isUsable(cached)) return cached.url

  const result = await mediaAPI.sign([filename])
  if (!result.success || !result.urls[filename]) return null

  cache.set(filename, {
    url: result.urls[filename],
    expiresAt: Date.now() + (result.expiresIn || 3600) * 1000
  })
  return result.urls[filename]
}

/** 批量预热（列表页渲染前调用） */
export async function preloadMediaUrls(filenames = []) {
  const missing = filenames.filter(name => name && !isUsable(cache.get(name)))
  if (missing.length === 0) return {}
  const result = await mediaAPI.sign(missing.slice(0, 50))
  if (!result.success) return {}

  const expiresAt = Date.now() + (result.expiresIn || 3600) * 1000
  Object.entries(result.urls).forEach(([name, url]) => cache.set(name, { url, expiresAt }))

  const out = {}
  filenames.forEach(name => {
    const entry = cache.get(name)
    if (entry) out[name] = entry.url
  })
  return out
}

export function clearMediaCache() {
  cache.clear()
}

export default { resolveMediaUrl, preloadMediaUrls, clearMediaCache }
