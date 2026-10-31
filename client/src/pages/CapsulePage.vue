<template>
  <div class="capsule-page">
    <van-nav-bar title="时光胶囊" left-arrow @click-left="$router.back()" />

    <!-- 胶囊列表 -->
    <div class="capsule-list">
      <div
        v-for="capsule in capsules"
        :key="capsule.id"
        class="capsule-card"
        :class="{ locked: !capsule.is_unlocked, unlocked: capsule.is_unlocked }"
      >
        <div class="capsule-header">
          <div class="capsule-icon" :class="capsule.is_unlocked ? 'unlocked-bg' : 'locked-bg'">
            <van-icon :name="capsule.is_unlocked ? 'passed' : 'lock'" size="22" :color="capsule.is_unlocked ? '#5f7a52' : '#ff976a'" />
          </div>
          <div class="capsule-info">
            <div class="capsule-title">{{ capsule.title }}</div>
            <div class="capsule-meta">
              给 {{ capsule.to_person }} · {{ capsule.unlock_date }} 解锁
            </div>
          </div>
        </div>

        <div class="capsule-content">
          <div v-if="capsule.is_unlocked" class="unlocked-content">
            <p>{{ capsule.content }}</p>
          </div>
          <div v-else class="locked-content">
            <div class="lock-visual">
              <div class="lock-icon"><van-icon name="lock" size="32" color="#ff976a" /></div>
              <div class="countdown">
                <span class="days">{{ capsule.days_left }}</span>
                <span class="unit">天</span>
              </div>
            </div>
            <p>距离解锁还有 {{ capsule.days_left }} 天</p>
          </div>
        </div>

        <div class="capsule-footer">
          <van-tag :type="capsule.is_unlocked ? 'success' : 'warning'" round>
            {{ capsule.is_unlocked ? '已解锁' : '未解锁' }}
          </van-tag>
          <van-button
            v-if="!capsule.is_unlocked && capsule.can_unlock"
            size="small"
            type="primary"
            round
            @click="unlockCapsule(capsule.id)"
          >
            立即解锁
          </van-button>
        </div>
      </div>
    </div>

    <!-- 创建按钮 -->
    <div class="fab" @click="showCreate = true">
      <van-icon name="plus" size="24" color="white" />
    </div>

    <!-- 创建胶囊弹窗 -->
    <van-popup
      v-model:show="showCreate"
      position="bottom"
      round
      :style="{ height: '65%' }"
    >
      <div class="create-form">
        <h3>创建时光胶囊</h3>

        <van-form @submit="onCreate">
          <van-cell-group inset>
            <van-field
              v-model="newCapsule.from_person"
              name="from_person"
              label="来自"
              placeholder="你的名字"
              required
            />
            <van-field
              v-model="newCapsule.to_person"
              name="to_person"
              label="给谁"
              placeholder="例如：未来的自己、孙子"
              required
            />
            <van-field
              v-model="newCapsule.title"
              name="title"
              label="标题"
              placeholder="例如：给 2050 年的你"
              required
            />
            <van-field
              v-model="newCapsule.content"
              name="content"
              label="内容"
              type="textarea"
              placeholder="写下你想说的话..."
              rows="4"
              required
            />
            <van-field
              v-model="newCapsule.unlock_date"
              name="unlock_date"
              label="解锁日期"
              placeholder="例如：2050-01-01"
              required
            />
          </van-cell-group>

          <div style="margin: 16px">
            <van-button round block type="primary" native-type="submit">
              创建胶囊
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import storage, { STORAGE_KEYS } from '@/utils/storage'

const capsules = ref([])
const showCreate = ref(false)

const newCapsule = ref({
  from_person: '',
  to_person: '',
  title: '',
  content: '',
  unlock_date: '',
  message_type: 'text'
})

// 默认胶囊数据（首次使用时）
const defaultCapsules = [
  {
    id: 1,
    from_person: '爸爸',
    to_person: '未来的儿子',
    title: '给 30 岁的你',
    content: '儿子，当你看到这个的时候，应该已经 30 岁了。爸爸想告诉你，无论遇到什么困难，都要保持乐观。人生没有过不去的坎，只有过不去的心情。记住，家永远是你的港湾。',
    message_type: 'text',
    unlock_date: '2035-01-01',
    is_unlocked: false
  },
  {
    id: 2,
    from_person: '妈妈',
    to_person: '女儿',
    title: '结婚当天的祝福',
    content: '亲爱的女儿，今天是你结婚的日子，妈妈为你感到骄傲。从你出生的那一刻起，你就是妈妈最珍贵的礼物。现在你找到了自己的幸福，妈妈真心祝福你。',
    message_type: 'text',
    unlock_date: '2025-06-01',
    is_unlocked: true
  },
  {
    id: 3,
    from_person: '爷爷',
    to_person: '曾孙',
    title: '家族的故事',
    content: '孩子，我是你的曾祖父。虽然你可能没见过我，但我想告诉你我们家族的故事。我们是从湖北武汉走出来的，一代代人勤劳朴实...',
    message_type: 'text',
    unlock_date: '2040-01-01',
    is_unlocked: false
  }
]

// 保存胶囊到 localStorage
const saveCapsules = () => {
  storage.set(STORAGE_KEYS.TIME_CAPSULES, capsules.value)
}

// 加载胶囊
const loadCapsules = () => {
  const saved = storage.get(STORAGE_KEYS.TIME_CAPSULES, null)
  const data = saved || defaultCapsules

  capsules.value = data.map(c => ({
    ...c,
    days_left: Math.max(0, Math.ceil((new Date(c.unlock_date) - new Date()) / (1000 * 60 * 60 * 24))),
    can_unlock: new Date(c.unlock_date) <= new Date()
  }))

  // 如果是首次，保存到 localStorage
  if (!saved) {
    saveCapsules()
  }
}

// 创建胶囊
const onCreate = () => {
  if (!newCapsule.value.title || !newCapsule.value.content) {
    showToast('请填写完整信息')
    return
  }

  const newCap = {
    id: Date.now(),
    ...newCapsule.value,
    is_unlocked: false,
    days_left: Math.ceil((new Date(newCapsule.value.unlock_date) - new Date()) / (1000 * 60 * 60 * 24)),
    can_unlock: false
  }

  capsules.value.unshift(newCap)
  saveCapsules()
  showToast('创建成功')
  showCreate.value = false
  newCapsule.value = { from_person: '', to_person: '', title: '', content: '', unlock_date: '', message_type: 'text' }
}

// 解锁胶囊
const unlockCapsule = (id) => {
  const capsule = capsules.value.find(c => c.id === id)
  if (capsule) {
    capsule.is_unlocked = true
    saveCapsules()
    showToast('解锁成功')
  }
}

onMounted(() => {
  loadCapsules()
})
</script>

<style scoped>
.capsule-page {
  min-height: 100vh;
  background: var(--fv-surface-soft);
  display: flex;
  flex-direction: column;
  position: relative;
}

.capsule-list {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
}

.capsule-card {
  background: var(--fv-surface);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  transition: all 0.3s;
}

.capsule-card.unlocked {
  border-left: 4px solid #5f7a52;
}

.capsule-card.locked {
  border-left: 4px solid #ff976a;
  opacity: 0.9;
}

.capsule-header {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.capsule-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-right: 12px;
  flex-shrink: 0;
}

.locked-bg {
  background: linear-gradient(135deg, #f7e7d2, #e9c3a8);
}

.unlocked-bg {
  background: linear-gradient(135deg, #cfe0da, #f3dcd6);
}

.capsule-info {
  flex: 1;
}

.capsule-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
  margin-bottom: 3px;
}

.capsule-meta {
  font-size: 12px;
  color: var(--fv-ink-3);
}

.capsule-content {
  margin-bottom: 14px;
  padding: 14px;
  background: var(--fv-surface-soft);
  border-radius: 12px;
}

.unlocked-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.7;
  color: var(--fv-ink);
}

.locked-content {
  text-align: center;
  padding: 10px 0;
}

.lock-visual {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 8px;
}

.lock-icon {
  font-size: 32px;
  opacity: 0.6;
}

.countdown {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.countdown .days {
  font-size: 28px;
  font-weight: 700;
  color: #ff976a;
}

.countdown .unit {
  font-size: 14px;
  color: var(--fv-ink-3);
}

.locked-content p {
  margin: 0;
  font-size: 13px;
  color: var(--fv-ink-3);
}

.capsule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--fv-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
  cursor: pointer;
  z-index: 100;
  transition: transform 0.2s;
}

.fab:active {
  transform: scale(0.9);
}

.create-form {
  padding: 16px;
}

.create-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
  font-weight: 600;
}
</style>
