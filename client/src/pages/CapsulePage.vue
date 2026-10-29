<template>
  <div class="capsule-page">
    <van-nav-bar title="时光胶囊" left-arrow @click-left="$router.back()" />

    <!-- 空状态 -->
    <div v-if="!hasCapsules" class="empty-state">
      <van-icon name="clock-o" size="64" color="#ddd" />
      <p class="empty-title">时光胶囊</p>
      <p class="empty-desc">给未来的人录一段话，设定日期解锁</p>
      <van-button type="primary" plain @click="showCreate = true">
        创建胶囊
      </van-button>
    </div>

    <!-- 胶囊列表 -->
    <div v-else class="capsule-list">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list>
          <div
            v-for="capsule in capsules"
            :key="capsule.id"
            class="capsule-card"
            :class="{ locked: !capsule.is_unlocked, unlocked: capsule.is_unlocked }"
          >
            <div class="capsule-header">
              <van-icon
                :name="capsule.is_unlocked ? 'lock-open' : 'lock'"
                :class="capsule.is_unlocked ? 'unlocked-icon' : 'locked-icon'"
              />
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
                <div v-if="capsule.media_url" class="media-preview">
                  <van-image
                    v-if="capsule.message_type === 'image'"
                    :src="capsule.media_url"
                    fit="cover"
                  />
                  <audio
                    v-else-if="capsule.message_type === 'audio'"
                    :src="capsule.media_url"
                    controls
                  />
                </div>
              </div>
              <div v-else class="locked-content">
                <van-icon name="lock" size="40" color="#ddd" />
                <p>距离解锁还有 {{ capsule.days_left }} 天</p>
              </div>
            </div>

            <div class="capsule-footer">
              <van-tag :type="capsule.is_unlocked ? 'success' : 'warning'">
                {{ capsule.is_unlocked ? '已解锁' : '未解锁' }}
              </van-tag>
              <van-button
                v-if="!capsule.is_unlocked && capsule.can_unlock"
                size="small"
                type="primary"
                @click="unlockCapsule(capsule.id)"
              >
                立即解锁
              </van-button>
            </div>
          </div>
        </van-list>
      </van-pull-refresh>

      <!-- 创建按钮 -->
      <van-button
        class="create-btn"
        type="primary"
        icon="plus"
        round
        @click="showCreate = true"
      >
        创建胶囊
      </van-button>
    </div>

    <!-- 创建胶囊弹窗 -->
    <van-popup
      v-model:show="showCreate"
      position="bottom"
      round
      :style="{ height: '70%' }"
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
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { capsuleApi } from '@/services/api'

const capsules = ref([])
const refreshing = ref(false)
const showCreate = ref(false)

const newCapsule = ref({
  from_person: '',
  to_person: '',
  title: '',
  content: '',
  unlock_date: '',
  message_type: 'text'
})

const hasCapsules = computed(() => capsules.value.length > 0)

// 加载胶囊列表
const loadCapsules = async () => {
  try {
    const res = await capsuleApi.getCapsules()
    if (res.success) {
      capsules.value = res.data.map(c => ({
        ...c,
        days_left: Math.ceil((new Date(c.unlock_date) - new Date()) / (1000 * 60 * 60 * 24)),
        can_unlock: new Date(c.unlock_date) <= new Date()
      }))
    }
  } catch (error) {
    console.error('加载胶囊失败:', error)
  }
}

// 下拉刷新
const onRefresh = async () => {
  await loadCapsules()
  refreshing.value = false
}

// 创建胶囊
const onCreate = async () => {
  try {
    const res = await capsuleApi.createCapsule({
      ...newCapsule.value,
      message_type: 'text'
    })

    if (res.success) {
      showToast('创建成功')
      showCreate.value = false

      // 重置表单
      newCapsule.value = {
        from_person: '',
        to_person: '',
        title: '',
        content: '',
        unlock_date: '',
        message_type: 'text'
      }

      await loadCapsules()
    }
  } catch (error) {
    showToast('创建失败：' + error.message)
  }
}

// 解锁胶囊
const unlockCapsule = async (id) => {
  try {
    const res = await capsuleApi.unlockCapsule(id)
    if (res.success) {
      showToast('解锁成功')
      await loadCapsules()
    }
  } catch (error) {
    showToast(error.message || '解锁失败')
  }
}

// 模拟数据
const loadMockData = () => {
  capsules.value = [
    {
      id: 1,
      from_person: '爸爸',
      to_person: '未来的儿子',
      title: '给 30 岁的你',
      content: '儿子，当你看到这个的时候，应该已经 30 岁了。爸爸想告诉你，无论遇到什么困难，都要保持乐观...',
      message_type: 'text',
      unlock_date: '2030-01-01',
      is_unlocked: false,
      days_left: 1500,
      can_unlock: false
    },
    {
      id: 2,
      from_person: '妈妈',
      to_person: '女儿',
      title: '结婚当天的祝福',
      content: '亲爱的女儿，今天是你结婚的日子，妈妈为你感到骄傲...',
      message_type: 'text',
      unlock_date: '2025-06-01',
      is_unlocked: true,
      days_left: 0,
      can_unlock: true
    }
  ]
}

onMounted(() => {
  loadMockData()
})
</script>

<style scoped>
.capsule-page {
  min-height: 100vh;
  background: #f7f8fa;
  display: flex;
  flex-direction: column;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  flex: 1;
}

.empty-title {
  margin: 12px 0;
  font-size: 16px;
  color: #666;
}

.empty-desc {
  font-size: 13px;
  color: #999;
  margin-bottom: 24px;
}

.capsule-list {
  flex: 1;
  padding: 16px;
  position: relative;
}

.capsule-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.capsule-card.locked {
  opacity: 0.8;
}

.capsule-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.locked-icon {
  color: #ff976a;
  font-size: 24px;
  margin-right: 12px;
}

.unlocked-icon {
  color: #07c160;
  font-size: 24px;
  margin-right: 12px;
}

.capsule-info {
  flex: 1;
}

.capsule-title {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}

.capsule-meta {
  font-size: 12px;
  color: #999;
}

.capsule-content {
  margin-bottom: 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.unlocked-content p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: #333;
}

.locked-content {
  text-align: center;
  padding: 20px;
}

.locked-content p {
  margin: 12px 0 0 0;
  font-size: 13px;
  color: #999;
}

.media-preview {
  margin-top: 12px;
}

.capsule-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.create-btn {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1000;
}

.create-form {
  padding: 16px;
}

.create-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
}
</style>