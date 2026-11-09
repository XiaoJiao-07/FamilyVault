<template>
  <div class="archive-page">
    <van-nav-bar title="家族档案" left-arrow @click-left="goHome" />

    <!-- 说明 -->
    <div class="arch-hero">
      <p class="arch-kicker">FAMILY VAULT · 家族档案</p>
      <h1 class="arch-title">{{ familyName }}档案</h1>
      <p class="arch-desc">
        把散在各处的记录装订成一份可以打印、可以发给家人的册子。原话照录，不改写。
      </p>
      <div class="arch-stats">
        <div class="as-item">
          <b>{{ stats.members }}</b><span>位家人</span>
        </div>
        <div class="as-item">
          <b>{{ stats.stories }}</b><span>段口述</span>
        </div>
        <div class="as-item">
          <b>{{ stats.locations }}</b><span>处地点</span>
        </div>
        <div class="as-item">
          <b>{{ stats.heirlooms }}</b><span>件传家</span>
        </div>
      </div>
      <p v-if="span" class="arch-span">时间跨度 {{ span }}</p>
    </div>

    <!-- 还可以补充什么 -->
    <div v-if="gaps.length" class="arch-gaps">
      <div class="gaps-head">
        <van-icon name="edit" size="14" color="var(--fv-primary)" />
        <span>档案还能更完整</span>
      </div>
      <div
        v-for="(g, i) in gaps.slice(0, 4)"
        :key="i"
        class="gap-item"
        @click="$router.push(g.path)"
      >
        <span class="gap-dot"></span>
        <span class="gap-text">{{ g.text }}</span>
        <van-icon name="arrow" size="12" color="var(--fv-ink-4)" />
      </div>
    </div>

    <!-- 预览 -->
    <div class="arch-preview-label">
      <span>成册预览</span>
      <span class="arch-preview-hint">滑动查看</span>
    </div>
    <div class="arch-preview">
      <iframe
        :srcdoc="html"
        title="家族档案预览"
        class="arch-frame"
        sandbox="allow-same-origin allow-modals"
      ></iframe>
    </div>

    <!-- 操作 -->
    <div class="arch-actions">
      <van-button
        class="act-main"
        type="primary"
        round
        block
        :loading="saving"
        @click="download"
      >
        <van-icon name="down" size="16" style="margin-right: 6px" />
        下载档案（HTML）
      </van-button>
      <div class="act-row">
        <van-button class="act-sub" plain round block @click="printArchive">
          <van-icon name="printer" size="15" style="margin-right: 5px" />
          打印 / 存 PDF
        </van-button>
        <van-button class="act-sub" plain round block @click="copyHint">
          <van-icon name="description" size="15" style="margin-right: 5px" />
          怎么用
        </van-button>
      </div>
      <p class="arch-foot">
        下载后是一个独立的 HTML 文件，双击就能在电脑或手机上打开，也可以用浏览器「打印」存成 PDF。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showDialog } from 'vant'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { buildArchiveHtml, archiveStats, archiveGaps, familySurname } from '@/utils/archive'

const router = useRouter()
// 统一回首页：不逐页后退，回到首页后安卓返回键可直接退出
const goHome = () => router.replace('/')

const html = ref('')
const stats = ref(archiveStats({}))
const gaps = ref([])
const surname = ref('')
const saving = ref(false)

const familyName = computed(() => (surname.value ? `${surname.value}氏家族` : '家族'))
const span = computed(() =>
  stats.value.from && stats.value.to ? `${stats.value.from} — ${stats.value.to}` : ''
)

const readAll = () => ({
  members: storage.get(STORAGE_KEYS.FAMILY_MEMBERS, []) || [],
  relationships: storage.get(STORAGE_KEYS.FAMILY_RELATIONSHIPS, []) || [],
  sessions: storage.get(STORAGE_KEYS.INTERVIEW_SESSIONS, []) || [],
  locations: storage.get(STORAGE_KEYS.MEMORY_LOCATIONS, []) || [],
  heirlooms: storage.get(STORAGE_KEYS.HEIRLOOMS, []) || [],
  capsules: storage.get(STORAGE_KEYS.TIME_CAPSULES, []) || []
})

const rebuild = () => {
  const data = readAll()
  stats.value = archiveStats(data)
  gaps.value = archiveGaps(data)
  surname.value = familySurname(data.members)
  html.value = buildArchiveHtml(data)
}

const fileStamp = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

const download = async () => {
  if (!html.value) return
  saving.value = true
  try {
    const name = `${familyName.value}档案-${fileStamp()}.html`
    const blob = new Blob(['\ufeff', html.value], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 4000)
    showToast({ message: '已下载，发给家人或打印成册', duration: 2200 })
  } catch (err) {
    console.error(err)
    showToast('下载失败，可以试试「打印 / 存 PDF」')
  } finally {
    saving.value = false
  }
}

const printArchive = () => {
  // iOS 的 iframe 不支持 print()，直接开新页面用系统打印
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  if (!isIOS) {
    const frame = document.querySelector('.arch-frame')
    try {
      frame?.contentWindow?.focus()
      frame?.contentWindow?.print()
      return
    } catch (err) {
      console.error(err)
    }
  }
  // 降级：把档案开在新标签页，用浏览器自带的「打印 / 存储为 PDF」
  try {
    const url = URL.createObjectURL(new Blob([html.value], { type: 'text/html;charset=utf-8' }))
    const win = window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
    if (!win) showToast('请允许打开新页面，或直接下载文件')
    else showToast({ message: '在新页面里用「打印」即可存成 PDF', duration: 2600 })
  } catch (err) {
    console.error(err)
    showToast('这个浏览器不支持直接打印，请先下载文件再打开打印')
  }
}

const copyHint = () => {
  showDialog({
    title: '这份档案怎么用',
    message:
      '1. 下载后是一个 HTML 文件，微信里可以直接发给家人，对方用浏览器打开即可；\n' +
      '2. 想做成纸质册子：在电脑上打开，按 Ctrl/⌘+P（手机上用「打印」），版式已按 A4 排好；\n' +
      '3. 这是一份快照，之后再有新的采访或地点，回来重新生成一次即可。',
    confirmButtonText: '知道了'
  })
}

onMounted(() => {
  rebuild()
})

// keep-alive 缓存：从别处补了内容再回来，重新生成一次
onActivated(() => {
  rebuild()
})
</script>

<style scoped>
.archive-page {
  min-height: 100%;
  padding-bottom: 20px;
  background: var(--fv-paper);
}

/* ---- 说明区 ---- */
.arch-hero {
  padding: 22px 20px 18px;
  background: var(--fv-surface);
  border-bottom: 1px solid var(--fv-border-soft);
}
.arch-kicker {
  margin: 0 0 10px;
  font-size: 10px;
  letter-spacing: 0.28em;
  color: var(--fv-ink-4);
}
.arch-title {
  margin: 0 0 8px;
  font-family: var(--fv-font-serif);
  font-size: 24px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--fv-ink);
}
.arch-desc {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fv-ink-3);
}
.arch-stats {
  display: flex;
  gap: 8px;
}
.as-item {
  flex: 1;
  padding: 10px 6px;
  text-align: center;
  background: var(--fv-surface-cream);
  border: 1px solid var(--fv-border-soft);
  border-radius: 10px;
}
.as-item b {
  display: block;
  font-family: var(--fv-font-serif);
  font-size: 20px;
  line-height: 1.2;
  color: var(--fv-primary);
}
.as-item span {
  font-size: 11px;
  color: var(--fv-ink-3);
}
.arch-span {
  margin: 12px 0 0;
  font-size: 11.5px;
  color: var(--fv-ink-4);
  letter-spacing: 0.04em;
}

/* ---- 待补充 ---- */
.arch-gaps {
  margin: 14px 16px 0;
  padding: 12px 14px;
  background: var(--fv-primary-soft);
  border: 1px solid var(--fv-border-warm);
  border-radius: 12px;
}
.gaps-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--fv-primary-deep);
}
.gap-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 12.5px;
  color: var(--fv-ink-2);
}
.gap-item:active {
  opacity: 0.6;
}
.gap-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--fv-primary);
  opacity: 0.5;
  flex: none;
}
.gap-text {
  flex: 1;
}

/* ---- 预览 ---- */
.arch-preview-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  padding: 20px 20px 8px;
  font-size: 12px;
  color: var(--fv-ink-3);
  letter-spacing: 0.08em;
}
.arch-preview-hint {
  font-size: 11px;
  color: var(--fv-ink-4);
  letter-spacing: 0;
}
.arch-preview {
  margin: 0 16px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--fv-border);
  box-shadow: 0 6px 20px rgba(80, 55, 30, 0.09);
  background: #fff;
}
.arch-frame {
  display: block;
  width: 100%;
  height: 58vh;
  border: 0;
  background: #e8e0d2;
}

/* ---- 操作 ---- */
.arch-actions {
  padding: 18px 20px 8px;
}
.act-main {
  height: 46px;
  font-size: 15px;
}
.act-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}
.act-sub {
  flex: 1;
  height: 42px;
  font-size: 13px;
  color: var(--fv-ink-2);
  border-color: var(--fv-border);
}
.arch-foot {
  margin: 12px 0 0;
  font-size: 11.5px;
  line-height: 1.7;
  color: var(--fv-ink-4);
}
</style>
