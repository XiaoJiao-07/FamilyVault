// 媒体链接助手
// 服务端的文件链接是带过期时间的签名链接，过期后需要重新换取。

import { mediaAPI } from './api'
import { uploadToCloud, signCloudUrl, isCloudPath, getCloudSession } from '@/services/cloud'

const cache = new Map() // filename -> { url, expiresAt }

function isUsable(entry) {
  return entry && entry.expiresAt - Date.now() > 60 * 1000
}

/**
 * 上传媒体：已连接云账号时走云存储（返回 users/<uid>/... 路径），否则回落自建服务端。
 * kind: 'image' | 'audio'
 * @returns {Promise<{success:boolean, filename?:string, cloud?:boolean, message?:string}>}
 */
export async function uploadMedia(file, kind = 'image') {
  try {
    if (await getCloudSession()) {
      const path = await uploadToCloud(file, kind === 'audio' ? 'audio' : 'photos')
      if (path) return { success: true, filename: path, cloud: true }
    }
  } catch (err) {
    console.warn('[cloud] 云存储上传失败，回落本地服务', err)
  }

  const result = kind === 'audio'
    ? await mediaAPI.uploadAudio(file)
    : await mediaAPI.uploadImage(file)
  if (!result.success) return { success: false, message: result.message || '上传失败' }
  const filename = result.data?.filename || result.data?.url
  if (!filename) return { success: false, message: '上传返回异常' }
  return { success: true, filename, cloud: false }
}

/**
 * 取可用链接：命中缓存直接返回；云对象换签名链接，服务端文件走批量签名接口
 * @param {string} filename
 * @returns {Promise<string|null>}
 */
export async function resolveMediaUrl(filename) {
  if (!filename) return null
  const cached = cache.get(filename)
  if (isUsable(cached)) return cached.url

  if (isCloudPath(filename)) {
    const url = await signCloudUrl(filename)
    if (url) cache.set(filename, { url, expiresAt: Date.now() + 3300 * 1000 })
    return url
  }

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

  const cloudNames = missing.filter(isCloudPath)
  const localNames = missing.filter(name => !isCloudPath(name))

  await Promise.all(
    cloudNames.map(async name => {
      const url = await signCloudUrl(name)
      if (url) cache.set(name, { url, expiresAt: Date.now() + 3300 * 1000 })
    })
  )

  if (localNames.length) {
    const result = await mediaAPI.sign(localNames.slice(0, 50))
    if (result.success) {
      const expiresAt = Date.now() + (result.expiresIn || 3600) * 1000
      Object.entries(result.urls).forEach(([name, url]) => cache.set(name, { url, expiresAt }))
    }
  }

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

export default { uploadMedia, resolveMediaUrl, preloadMediaUrls, clearMediaCache }
