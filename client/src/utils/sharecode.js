const KEY = 'familyvault_sharecode'

/**
 * 分享码（托管网关的访问凭证）
 *
 * 站点每次跳转都会丢掉 query，所以首次进入时落一份到本地：
 * 服务端要把音频交给第三方语音识别时，需要拼出「外部也能打开」的链接。
 */
export function rememberSharecode() {
  try {
    const fromUrl = new URLSearchParams(location.search).get('sharecode')
    if (fromUrl) {
      localStorage.setItem(KEY, fromUrl)
      return fromUrl
    }
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function getSharecode() {
  try {
    return (
      new URLSearchParams(location.search).get('sharecode') ||
      localStorage.getItem(KEY) ||
      ''
    )
  } catch {
    return ''
  }
}
