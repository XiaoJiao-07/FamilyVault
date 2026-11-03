import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.familyvault.app',
  appName: '家史馆',
  webDir: 'dist',
  server: {
    // 生产：直接加载线上站点（托管网关要求 sharecode 参数）
    url: 'https://familyvault.app.workbuddy.host/?sharecode=E62LSHXLJY',
    cleartext: false,
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false
  }
}

export default config
