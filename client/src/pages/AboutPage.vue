<template>
  <div class="about-page">
    <van-nav-bar title="关于" left-arrow @click-left="$router.back()" />

    <div class="about-content">
      <!-- Logo 和名称 -->
      <div class="app-header">
        <div class="app-icon">
          <span class="icon-text">FV</span>
        </div>
        <h1 class="app-name">FamilyVault</h1>
        <p class="app-version">版本 1.0.0</p>
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
          <van-cell title="清除数据" label="清除所有本地数据" icon="delete-o" is-link @click="clearData" />
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
import { ref } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import exportUtils from '@/utils/export'

const fileInput = ref(null)

const openGitHub = () => {
  window.open('https://github.com/xiaoJiao-07/FamilyVault', '_blank')
}

const handleExportData = () => {
  // 收集所有本地数据
  const familyData = {
    members: JSON.parse(localStorage.getItem('familyMembers') || '[]'),
    stories: JSON.parse(localStorage.getItem('familyStories') || '[]'),
    locations: JSON.parse(localStorage.getItem('memoryLocations') || '[]'),
    capsules: JSON.parse(localStorage.getItem('timeCapsules') || '[]'),
    heirlooms: JSON.parse(localStorage.getItem('heirlooms') || '[]'),
    interviews: JSON.parse(localStorage.getItem('interviews') || '[]')
  }

  exportUtils.exportFullPackage(familyData)
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

    // 保存到 localStorage
    if (data.members) localStorage.setItem('familyMembers', JSON.stringify(data.members))
    if (data.stories) localStorage.setItem('familyStories', JSON.stringify(data.stories))
    if (data.locations) localStorage.setItem('memoryLocations', JSON.stringify(data.locations))
    if (data.capsules) localStorage.setItem('timeCapsules', JSON.stringify(data.capsules))
    if (data.heirlooms) localStorage.setItem('heirlooms', JSON.stringify(data.heirlooms))
    if (data.interviews) localStorage.setItem('interviews', JSON.stringify(data.interviews))

    showToast('数据导入成功')
  } catch (err) {
    showToast('导入失败：' + err.message)
  }

  // 重置 input
  event.target.value = ''
}

const clearData = async () => {
  try {
    await showConfirmDialog({
      title: '确认清除',
      message: '这将清除所有本地数据，且无法恢复。建议先导出备份。确定要清除吗？'
    })

    localStorage.removeItem('familyMembers')
    localStorage.removeItem('familyStories')
    localStorage.removeItem('memoryLocations')
    localStorage.removeItem('timeCapsules')
    localStorage.removeItem('heirlooms')
    localStorage.removeItem('interviews')

    showToast('数据已清除')
  } catch {
    // 用户取消
  }
}
</script>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.about-content {
  padding-bottom: 40px;
}

.app-header {
  text-align: center;
  padding: 40px 20px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.app-icon {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.icon-text {
  font-size: 32px;
  font-weight: 700;
  color: white;
}

.app-name {
  font-size: 24px;
  font-weight: 700;
  color: white;
  margin: 0 0 8px;
}

.app-version {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
}

.section {
  padding: 20px 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px;
}

.section-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.repo-link {
  font-size: 12px;
  color: #667eea;
}

.footer {
  text-align: center;
  padding: 30px 20px;
  color: #999;
  font-size: 12px;
}

.footer p {
  margin: 4px 0;
}

.license {
  color: #bbb;
}
</style>
