// WorkBuddy 云服务接入
// publicConfig 来自云服务开通结果，四个值必须原样透传（endpoint 不可省略、不可硬编码其它域名）
import { createWorkBuddyCloud } from '@tencent-ai/workbuddy-cloud-sdk'

export const publicConfig = {
  resourceId: 'wbcs_tItVRFTg3X4i3T4uJdpYey',
  endpoint: 'https://familyvault.app.workbuddy.host',
  oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth',
  publishableKey: 'wbpk_akSTTl193OyPafx4VdJU2A_5niMJaSs59Bg8DG2E7Lw1RMdWafil4g1'
}

export const cloud = createWorkBuddyCloud({
  endpoint: publicConfig.endpoint,
  oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl,
  publishableKey: publicConfig.publishableKey
})

/* ---------------- 会话 ---------------- */

/** 给云请求加超时，避免网络异常时把界面卡死 */
function withTimeout(promise, ms = 8000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('云服务请求超时')), ms))
  ])
}

let sessionCache = null

export async function getCloudSession() {
  try {
    const { data, error } = await withTimeout(cloud.auth.getSession(), 6000)
    if (error || !data) {
      sessionCache = null
      return null
    }
    sessionCache = data
    return data
  } catch {
    sessionCache = null
    return null
  }
}

export function cachedSession() {
  return sessionCache
}

export async function signOutCloud() {
  try {
    await cloud.auth.signOut()
  } finally {
    sessionCache = null
  }
}

/**
 * 发起 WorkBuddy 账号登录。返回要跳转的 URL（同标签页跳转，不能用 window.open）。
 * 保留业务参数（sharecode），剔除回调参数。
 * @returns {Promise<{url?:string, error?:string}>}
 */
export async function startWorkBuddyLogin() {
  const back = new URL(location.href)
  back.pathname = '/'
  for (const key of ['code', 'state', 'provider', 'error']) back.searchParams.delete(key)
  // 标记本次是云账号授权，回调成功后自动回到「关于」页
  back.searchParams.set('cloudback', '1')
  try {
    const { data, error } = await withTimeout(
      cloud.auth.signInWithOAuth({
        provider: 'workbuddy',
        redirectTo: back.toString()
      }),
      10000
    )
    if (error) return { error: error.message || '登录发起失败' }
    if (!data?.url) return { error: '未取到登录地址' }
    return { url: data.url }
  } catch (e) {
    return { error: e?.message || '登录发起失败' }
  }
}

/**
 * 应用入口的回调分发器：只在真正的 OAuth 回调时调用对应 handler。
 * 必须在路由守卫之前执行，否则带 code 的落地页会被守卫打断。
 * @returns {Promise<{session?:object, error?:string, handled:boolean}>}
 */
export async function handleCloudCallback() {
  const url = new URL(location.href)
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) {
    return { handled: false }
  }
  const provider = url.searchParams.get('provider')
  if (provider !== 'workbuddy' && provider !== 'wechat') {
    return { handled: true, error: '授权回调缺少有效的登录方式，请重新登录。' }
  }
  const handler = provider === 'workbuddy'
    ? cloud.auth.handleWorkBuddyCallback
    : cloud.auth.handleWechatWebCallback
  if (typeof handler !== 'function') {
    return { handled: true, error: '暂时无法使用此方式登录，请联系应用管理员。' }
  }
  let res
  try {
    res = await withTimeout(handler.call(cloud.auth), 12000)
  } catch (e) {
    return { handled: true, error: e?.message || '登录失败' }
  }
  if (res?.error) return { handled: true, error: res.error.message || '登录失败' }
  if (res?.data) {
    sessionCache = res.data
    // 清掉一次性 code/state，保留业务参数（sharecode）与 hash
    for (const key of ['code', 'state', 'provider']) url.searchParams.delete(key)
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
    return { handled: true, session: res.data }
  }
  return { handled: true, error: '登录未成功，请重试。' }
}

/* ---------------- LLM（免密钥） ---------------- */

let cachedModelId = null

export async function pickModel() {
  if (cachedModelId) return cachedModelId
  const list = await withTimeout(cloud.llm.models.list(), 8000)
  const models = Array.isArray(list) ? list : (list?.data || [])
  const model = models.find(m => m.disabled !== true && m.enabled !== false)
  if (!model) return null
  cachedModelId = model.id
  return model.id
}

/**
 * 云大模型对话（流式收集为完整文本）。每条请求必须带 system 首包。
 * @param {Array<{role:string,content:string}>} messages
 * @param {{signal?:AbortSignal, onDelta?:(text:string)=>void, temperature?:number}} options
 */
export async function cloudChat(messages, options = {}) {
  const model = await pickModel()
  if (!model) throw new Error('云端暂无可用模型')
  let answer = ''
  for await (const chunk of cloud.llm.chat.completions.create({
    model,
    messages,
    stream: true,
    temperature: options.temperature ?? 0.8,
    signal: options.signal
  })) {
    const delta = chunk?.choices?.[0]?.delta
    const text = delta?.content || delta?.reasoning_content
    if (text) {
      answer += text
      if (typeof options.onDelta === 'function') options.onDelta(text)
    }
  }
  return answer
}

/* ---------------- 存储 ---------------- */

/**
 * 有云会话时把文件上传到用户私有目录，返回对象路径（形如 users/<uid>/...）。
 * @returns {Promise<string|null>} 云路径，未登录或失败返回 null
 */
export async function uploadToCloud(file, folder = 'photos') {
  const session = await getCloudSession()
  if (!session) return null
  const ext = (file?.name || '').split('.').pop() || 'bin'
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const path = cloud.storage.userPath(session.user.id, `${folder}/${name}`)
  const res = await cloud.storage.upload(path, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: false
  })
  if (res?.error) throw new Error(res.error.message || '云存储上传失败')
  return path
}

/** 云对象路径取签名下载链接（默认 600 秒） */
export async function signCloudUrl(path, ttl = 3600) {
  if (!path || !path.startsWith('users/')) return null
  const res = await cloud.storage.createSignedUrl(path, ttl)
  if (res?.error || !res?.data) return null
  return res.data.signedUrl || res.data.url || null
}

export async function removeCloudObject(path) {
  if (!path || !path.startsWith('users/')) return
  const res = await cloud.storage.remove([path])
  if (res?.error) throw new Error(res.error.message || '云存储删除失败')
}

/** 是否云存储路径 */
export function isCloudPath(name) {
  return typeof name === 'string' && (name.startsWith('users/') || name.startsWith('shared/'))
}

/* ---------------- 数据库：家族数据云备份 ---------------- */

const BACKUP_TABLE = 'family_backups'

/** 云端保存一份家族数据快照（每用户一行，覆盖式） */
export async function saveCloudBackup(payload, label = '') {
  const session = await getCloudSession()
  if (!session) throw new Error('请先使用 WorkBuddy 登录')
  const row = {
    label: label || '手动备份',
    payload,
    app_version: 2
  }
  const { data, error } = await withTimeout(
    cloud.database.from(BACKUP_TABLE).upsert(row, { onConflict: 'owner_id' }).select(),
    15000
  )
  if (error) throw new Error(error.message || '云备份失败')
  return Array.isArray(data) ? data[0] : data
}

/** 读取本人的云备份 */
export async function loadCloudBackup() {
  const session = await getCloudSession()
  if (!session) throw new Error('请先使用 WorkBuddy 登录')
  const { data, error } = await withTimeout(
    cloud.database
      .from(BACKUP_TABLE)
      .select('id, label, payload, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1),
    15000
  )
  if (error) throw new Error(error.message || '云备份读取失败')
  const row = Array.isArray(data) ? data[0] : null
  return row || null
}

export default cloud
