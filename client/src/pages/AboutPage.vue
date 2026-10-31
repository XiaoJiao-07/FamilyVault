<template>
  <div class="about-page">
    <van-nav-bar title="关于" left-arrow @click-left="$router.back()" />

    <div class="about-content">
      <!-- Logo 和名称 -->
      <div class="app-header">
        <div class="app-icon">
          <span class="icon-text">家</span>
        </div>
        <h1 class="app-name">FamilyVault</h1>
        <p class="app-version">版本 1.1.0 · 家庭共享版</p>
      </div>

      <!-- 家庭空间 -->
      <div v-if="loggedIn" class="section">
        <h3 class="section-title">家庭空间</h3>

        <div class="family-card">
          <div class="family-head">
            <div class="family-seal">家</div>
            <div class="family-meta">
              <h2 v-if="!renaming" class="family-name">{{ family?.name || '我的家庭' }}</h2>
              <div v-else class="rename-row">
                <input
                  v-model="renameValue"
                  class="rename-input"
                  maxlength="30"
                  @keyup.enter="submitRename"
                />
                <van-button size="mini" type="primary" @click="submitRename">保存</van-button>
                <van-button size="mini" plain @click="renaming = false">取消</van-button>
              </div>
              <p class="family-sub">
                {{ memberCount }} 位家人 · {{ roleLabel }}
              </p>
            </div>
            <van-icon
              v-if="isOwner"
              name="edit"
              class="family-edit"
              @click="startRename"
            />
          </div>

          <div class="member-row">
            <div
              v-for="m in family?.members || []"
              :key="m.userId"
              class="member-chip"
              :class="{ me: m.userId === currentUserId }"
            >
              <span class="member-avatar">{{ initial(m.displayName) }}</span>
              <span class="member-name">{{ m.displayName }}</span>
              <span v-if="m.role === 'owner'" class="member-role">创建者</span>
            </div>
          </div>

          <div class="invite-box">
            <div class="invite-row">
              <span class="invite-label">家庭邀请码</span>
              <span class="invite-code">{{ family?.inviteCode || '—' }}</span>
              <van-button
                size="mini"
                plain
                type="primary"
                class="invite-btn"
                @click="copyInvite"
              >
                复制
              </van-button>
              <van-button
                v-if="isOwner"
                size="mini"
                plain
                class="invite-btn"
                @click="rotateInvite"
              >
                重置
              </van-button>
            </div>
            <p class="invite-hint">
              把邀请码发给家人，他们用自己账号在下方输入，就能和你共用同一份家史。
            </p>
          </div>

          <div class="join-row">
            <van-field
              v-model="joinCode"
              placeholder="输入家人的邀请码"
              maxlength="8"
              class="join-field"
            />
            <van-button
              size="small"
              type="primary"
              class="join-btn"
              :loading="joining"
              @click="joinFamily"
            >
              加入
            </van-button>
          </div>

          <div class="sync-row">
            <span class="sync-dot" :class="syncStatus" />
            <span class="sync-text">{{ syncText }}</span>
            <van-button size="mini" plain class="sync-btn" @click="syncNow">
              立即同步
            </van-button>
          </div>
        </div>
      </div>

      <!-- 应用介绍 -->
      <div class="section">
        <h3 class="section-title">关于应用</h3>
        <p class="section-desc">
          FamilyVault 是一款开源的家庭记忆操作系统，帮助家庭记录和保存珍贵的家族故事、采访录音、家族图谱、记忆地图和传家宝。
        </p>
      </div>

      <!-- 功能列表 -->
      <div class="section">
        <h3 class="section-title">核心功能</h3>
        <van-cell-group inset>
          <van-cell title="AI 采访" label="智能引导，语音记录家族故事" icon="chat-o" />
          <van-cell title="家族图谱" label="可视化家族关系网络" icon="cluster-o" />
          <van-cell title="记忆地图" label="标注家族迁徙轨迹" icon="map-o" />
          <van-cell title="时光胶囊" label="给未来的人录一段话" icon="clock-o" />
          <van-cell title="传家宝" label="保存家传菜谱和手艺" icon="notes-o" />
        </van-cell-group>
      </div>

      <!-- 技术栈 -->
      <div class="section">
        <h3 class="section-title">技术栈</h3>
        <div class="tech-tags">
          <van-tag plain type="primary" size="medium">Vue 3</van-tag>
          <van-tag plain type="primary" size="medium">Vant UI</van-tag>
          <van-tag plain type="primary" size="medium">D3.js</van-tag>
          <van-tag plain type="primary" size="medium">Leaflet</van-tag>
          <van-tag plain type="primary" size="medium">PWA</van-tag>
          <van-tag plain type="primary" size="medium">Vite</van-tag>
        </div>
      </div>

      <!-- 开发者信息 -->
      <div class="section">
        <h3 class="section-title">开发者</h3>
        <van-cell-group inset>
          <van-cell title="GitHub" value="XiaoJiao-07" is-link url="https://github.com/xiaoJiao-07" />
          <van-cell title="项目仓库" is-link url="https://github.com/xiaoJiao-07/FamilyVault">
            <template #label>
              <span class="repo-link">FamilyVault</span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 反馈 -->
      <div class="section">
        <h3 class="section-title">反馈与建议</h3>
        <p class="section-desc">
          如果您有任何问题或建议，欢迎通过 GitHub Issues 反馈。
        </p>
        <van-button type="primary" plain block round @click="openGitHub">
          <van-icon name="github" style="margin-right: 6px" />
          前往 GitHub
        </van-button>
      </div>

      <!-- 数据管理 -->
      <div class="section">
        <h3 class="section-title">数据管理</h3>
        <van-cell-group inset>
          <van-cell title="导出数据" label="备份家族数据为 JSON 文件" icon="down" is-link @click="handleExportData" />
          <van-cell title="导入数据" label="从备份文件恢复数据" icon="upgrade" is-link @click="importData" />
          <van-cell title="清除本机缓存" label="只清当前设备，云端数据不受影响" icon="delete-o" is-link @click="clearData" />
        </van-cell-group>
        <input
          ref="fileInput"
          type="file"
          accept=".json"
          style="display: none"
          @change="handleFileSelect"
        />
      </div>

      <!-- 版权信息 -->
      <div class="footer">
        <p>© 2026 FamilyVault. All rights reserved.</p>
        <p class="license">MIT License</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import exportUtils from '@/utils/export'
import storage from '@/utils/storage'
import { authAPI, familyAPI } from '@/utils/api'

const fileInput = ref(null)
const family = ref(null)
const role = ref('member')
const joinCode = ref('')
const joining = ref(false)
const syncStatus = ref(storage.status)
const lastSyncedAt = ref(storage.lastSyncedAt)

const loggedIn = computed(() => authAPI.isLoggedIn())
const currentUserId = computed(() => authAPI.getCurrentUser()?.id)
const isOwner = computed(() => role.value === 'owner')
const memberCount = computed(() => family.value?.members?.length || 0)
const roleLabel = computed(() => (isOwner.value ? '你是创建者' : '你是成员'))

const initial = (name) => (name ? String(name).trim().slice(0, 1) : '家')

const syncText = computed(() => {
  if (syncStatus.value === 'syncing') return '正在同步…'
  if (syncStatus.value === 'offline') return '离线，改动已存在本机'
  if (syncStatus.value === 'error') return '同步失败，稍后自动重试'
  if (!lastSyncedAt.value) return '已连接家庭云端'
  const t = lastSyncedAt.value
  const hh = String(t.getHours()).padStart(2, '0')
  const mm = String(t.getMinutes()).padStart(2, '0')
  return `已同步 · ${hh}:${mm}`
})

let unsubscribe = null

onMounted(async () => {
  unsubscribe = storage.subscribe(({ status, lastSyncedAt: at }) => {
    syncStatus.value = status
    lastSyncedAt.value = at
  })

  if (!loggedIn.value) return
  const result = await familyAPI.get()
  if (result.success) {
    family.value = result.family
    role.value = result.role || 'member'
  }
})

onUnmounted(() => {
  if (unsubscribe) unsubscribe()
})

const loadFamily = async () => {
  const result = await familyAPI.get()
  if (result.success) {
    family.value = result.family
    role.value = result.role || 'member'
  }
}

const copyInvite = async () => {
  const code = family.value?.inviteCode
  if (!code) return
  try {
    await navigator.clipboard.writeText(code)
    showToast('邀请码已复制')
  } catch {
    showToast(`邀请码：${code}`)
  }
}

const rotateInvite = async () => {
  try {
    await showConfirmDialog({
      title: '重置邀请码',
      message: '旧邀请码会立即失效，已加入的家人不受影响。确定重置吗？'
    })
  } catch {
    return
  }
  const result = await familyAPI.rotateInvite()
  if (result.success) {
    family.value = result.family
    showToast('已生成新邀请码')
  } else {
    showToast(result.message)
  }
}

const renameFamily = () => {
  startRename()
}

const renaming = ref(false)
const renameValue = ref('')

const startRename = () => {
  renameValue.value = family.value?.name || ''
  renaming.value = true
}

const submitRename = async () => {
  const name = renameValue.value.trim()
  if (!name) {
    showToast('家庭名不能为空')
    return
  }
  const result = await familyAPI.rename(name)
  if (result.success) {
    family.value = result.family
    renaming.value = false
    showToast('已更新家庭名')
  } else {
    showToast(result.message)
  }
}

const joinFamily = async () => {
  const code = joinCode.value.trim().toUpperCase()
  if (!code) {
    showToast('请输入邀请码')
    return
  }
  joining.value = true
  try {
    const result = await familyAPI.join(code)
    if (!result.success) {
      showToast(result.message)
      return
    }
    family.value = result.family
    role.value = 'member'
    joinCode.value = ''
    showToast('已加入家庭，正在同步家史…')
    await storage.syncNow()
    window.location.reload()
  } finally {
    joining.value = false
  }
}

const syncNow = async () => {
  await storage.syncNow()
  showToast(syncStatus.value === 'offline' ? '网络不可用，稍后再试' : '已同步')
}

const openGitHub = () => {
  window.open('https://github.com/xiaoJiao-07/FamilyVault', '_blank')
}

const handleExportData = () => {
  exportUtils.exportFullPackage(storage.getAll())
  showToast('数据已导出')
}

const importData = () => {
  fileInput.value?.click()
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    const data = await exportUtils.importFromJSON(file)
    storage.setAll(data)
    showToast('数据导入成功')
  } catch (err) {
    showToast('导入失败：' + err.message)
  }

  event.target.value = ''
}

const clearData = async () => {
  try {
    await showConfirmDialog({
      title: '确认清除',
      message: '仅清除当前设备的缓存，云端与家人的数据不受影响，下次打开会自动拉回。建议先导出备份。'
    })
  } catch {
    return
  }

  storage.clear()
  showToast('本机缓存已清除')
}
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: var(--fv-surface-soft);
}

.about-content {
  padding-bottom: 40px;
}

.app-header {
  text-align: center;
  padding: 40px 20px 30px;
  background:
    radial-gradient(120% 90% at 20% 0%, #c25b3e 0%, rgba(194, 91, 62, 0) 55%),
    linear-gradient(160deg, #a8432c 0%, #8c3223 100%);
}

.app-icon {
  width: 68px;
  height: 68px;
  border-radius: 18px;
  background: rgba(255, 246, 234, 0.14);
  border: 1px solid rgba(255, 246, 234, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.icon-text {
  font-family: var(--fv-font-serif);
  font-size: 32px;
  color: #fff6ea;
}

.app-name {
  font-family: var(--fv-font-serif);
  font-size: 24px;
  font-weight: 600;
  color: #fff6ea;
  margin: 0 0 8px;
  letter-spacing: 0.06em;
}

.app-version {
  font-size: 12px;
  color: rgba(255, 246, 234, 0.72);
  margin: 0;
}

.section {
  padding: 20px 16px;
}

.section-title {
  font-family: var(--fv-font-serif);
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
  margin: 0 0 12px;
  letter-spacing: 0.04em;
}

.section-desc {
  font-size: 14px;
  color: var(--fv-ink-2);
  line-height: 1.7;
  margin: 0;
}

/* ---------- 家庭空间 ---------- */
.family-card {
  background: var(--fv-surface);
  border: 1px solid var(--fv-border);
  border-radius: 18px;
  box-shadow: var(--fv-shadow-sm);
  padding: 16px;
}

.family-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.family-seal {
  width: 42px;
  height: 42px;
  border-radius: 10px;
  background: var(--fv-primary-soft);
  border: 1px solid #f0cfc1;
  color: var(--fv-primary);
  font-family: var(--fv-font-serif);
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}

.family-meta {
  flex: 1;
  min-width: 0;
}

.family-name {
  font-family: var(--fv-font-serif);
  font-size: 17px;
  color: var(--fv-ink);
  margin: 0 0 2px;
  letter-spacing: 0.03em;
}

.family-sub {
  font-size: 12px;
  color: var(--fv-ink-3);
  margin: 0;
}

.rename-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rename-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--fv-border);
  border-radius: 8px;
  padding: 5px 8px;
  font-size: 14px;
  color: var(--fv-ink);
  background: var(--fv-surface);
  font-family: inherit;
}

.rename-input:focus {
  outline: none;
  border-color: var(--fv-primary);
}

.family-edit {
  color: var(--fv-ink-3);
  font-size: 18px;
  padding: 6px;
}

.member-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.member-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  background: var(--fv-surface-soft);
  border: 1px solid var(--fv-border);
  border-radius: 999px;
  font-size: 12px;
  color: var(--fv-ink-2);
}

.member-chip.me {
  border-color: #f0cfc1;
  background: var(--fv-primary-soft);
  color: var(--fv-primary);
}

.member-avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--fv-brass-soft);
  color: var(--fv-ink-2);
  font-size: 11px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.member-chip.me .member-avatar {
  background: var(--fv-primary);
  color: #fff6ea;
}

.member-role {
  font-size: 10px;
  color: var(--fv-ink-4);
}

.invite-box {
  margin-top: 14px;
  padding: 12px;
  border-radius: 12px;
  background: var(--fv-surface-soft);
  border: 1px dashed var(--fv-border);
}

.invite-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.invite-label {
  font-size: 12px;
  color: var(--fv-ink-3);
}

.invite-code {
  font-family: var(--fv-font-serif);
  font-size: 16px;
  letter-spacing: 0.18em;
  color: var(--fv-primary);
}

.invite-btn {
  flex: none;
}

.invite-hint {
  font-size: 11px;
  color: var(--fv-ink-4);
  line-height: 1.6;
  margin: 8px 0 0;
}

.join-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.join-field {
  flex: 1;
  border: 1px solid var(--fv-border);
  border-radius: 10px;
  padding: 6px 12px;
  background: var(--fv-surface);
}

.join-btn {
  flex: none;
  border-radius: 10px;
}

.sync-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--fv-border-soft);
}

.sync-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #5f7a52;
  flex: none;
}

.sync-dot.syncing {
  background: var(--fv-brass);
  animation: pulse 1s infinite;
}

.sync-dot.offline,
.sync-dot.error {
  background: var(--fv-primary);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}

.sync-text {
  flex: 1;
  font-size: 12px;
  color: var(--fv-ink-3);
}

.sync-btn {
  flex: none;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.repo-link {
  font-size: 12px;
  color: var(--fv-primary);
}

.footer {
  text-align: center;
  padding: 30px 20px;
  color: var(--fv-ink-3);
  font-size: 12px;
}

.footer p {
  margin: 4px 0;
}

.license {
  color: var(--fv-ink-4);
}
</style>
