<template>
  <div class="heirloom-page">
    <van-nav-bar title="传家宝" left-arrow @click-left="$router.back()" />

    <!-- 空状态 -->
    <div v-if="!hasHeirlooms" class="empty-state">
      <van-icon name="notes-o" size="64" color="#ddd" />
      <p class="empty-title">传家宝</p>
      <p class="empty-desc">保存家传菜谱、祖传手艺、家训格言</p>
      <van-button type="primary" plain @click="showAdd = true">
        添加传家宝
      </van-button>
    </div>

    <!-- 传家宝列表 -->
    <div v-else class="heirloom-list">
      <van-tabs v-model:active="activeTab">
        <van-tab title="全部" name="all">
          <div class="tab-content">
            <div
              v-for="item in heirlooms"
              :key="item.id"
              class="heirloom-card"
              @click="showDetail(item)"
            >
              <div class="card-header">
                <van-tag :type="getCategoryTag(item.category)">
                  {{ getCategoryName(item.category) }}
                </van-tag>
                <span class="card-title">{{ item.title }}</span>
              </div>
              <div class="card-content">
                {{ item.content.substring(0, 100) }}...
              </div>
              <div class="card-footer">
                <span class="author">{{ item.author_name || '匿名' }}</span>
                <span class="date">{{ formatDate(item.created_at) }}</span>
              </div>
            </div>
          </div>
        </van-tab>

        <van-tab title="菜谱" name="recipe">
          <div class="tab-content">
            <div
              v-for="item in filteredHeirlooms('recipe')"
              :key="item.id"
              class="heirloom-card"
              @click="showDetail(item)"
            >
              <div class="card-header">
                <van-tag type="danger">菜谱</van-tag>
                <span class="card-title">{{ item.title }}</span>
              </div>
              <div class="card-content">
                {{ item.content.substring(0, 100) }}...
              </div>
            </div>
          </div>
        </van-tab>

        <van-tab title="手艺" name="craft">
          <div class="tab-content">
            <div
              v-for="item in filteredHeirlooms('craft')"
              :key="item.id"
              class="heirloom-card"
              @click="showDetail(item)"
            >
              <div class="card-header">
                <van-tag type="primary">手艺</van-tag>
                <span class="card-title">{{ item.title }}</span>
              </div>
              <div class="card-content">
                {{ item.content.substring(0, 100) }}...
              </div>
            </div>
          </div>
        </van-tab>

        <van-tab title="家训" name="motto">
          <div class="tab-content">
            <div
              v-for="item in filteredHeirlooms('motto')"
              :key="item.id"
              class="heirloom-card"
              @click="showDetail(item)"
            >
              <div class="card-header">
                <van-tag type="success">家训</van-tag>
                <span class="card-title">{{ item.title }}</span>
              </div>
              <div class="card-content">
                {{ item.content.substring(0, 100) }}...
              </div>
            </div>
          </div>
        </van-tab>
      </van-tabs>

      <!-- 添加按钮 -->
      <van-button
        class="add-btn"
        type="primary"
        icon="plus"
        round
        @click="showAdd = true"
      >
        添加
      </van-button>
    </div>

    <!-- 详情弹窗 -->
    <van-popup
      v-model:show="showDetailPopup"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div v-if="selectedItem" class="detail-content">
        <div class="detail-header">
          <van-tag :type="getCategoryTag(selectedItem.category)">
            {{ getCategoryName(selectedItem.category) }}
          </van-tag>
          <h2>{{ selectedItem.title }}</h2>
          <p class="author-info">
            {{ selectedItem.author_name || '匿名' }} · {{ formatDate(selectedItem.created_at) }}
          </p>
        </div>

        <div class="detail-body">
          <p>{{ selectedItem.content }}</p>
        </div>

        <div class="detail-footer">
          <van-button type="primary" block @click="showDetailPopup = false">
            关闭
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 添加弹窗 -->
    <van-popup
      v-model:show="showAdd"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div class="add-form">
        <h3>添加传家宝</h3>

        <van-form @submit="onAdd">
          <van-cell-group inset>
            <van-field
              v-model="newItem.title"
              name="title"
              label="标题"
              placeholder="例如：奶奶的红烧肉"
              required
            />
            <van-field
              v-model="newItem.category"
              name="category"
              label="类型"
              placeholder="recipe/craft/motto"
              required
            />
            <van-field
              v-model="newItem.content"
              name="content"
              label="内容"
              type="textarea"
              placeholder="详细描述..."
              rows="6"
              required
            />
            <van-field
              v-model="newItem.author_name"
              name="author_name"
              label="作者"
              placeholder="例如：奶奶"
            />
          </van-cell-group>

          <div style="margin: 16px">
            <van-button round block type="primary" native-type="submit">
              保存
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast } from 'vant'

const activeTab = ref('all')
const showDetailPopup = ref(false)
const showAdd = ref(false)
const selectedItem = ref(null)

const newItem = ref({
  title: '',
  category: '',
  content: '',
  author_name: ''
})

// 模拟数据
const heirlooms = ref([
  {
    id: 1,
    title: '奶奶的红烧肉',
    category: 'recipe',
    content: '材料：五花肉 500g、冰糖 30g、生抽 2 勺、老抽 1 勺、料酒 2 勺、葱姜适量。\n\n做法：\n1. 五花肉切块，冷水下锅焯水\n2. 锅中放少许油，加冰糖炒糖色\n3. 下肉块翻炒上色\n4. 加生抽、老抽、料酒、葱姜\n5. 加水没过肉，大火烧开转小火炖 1 小时\n6. 大火收汁即可',
    author_name: '奶奶',
    created_at: '2024-01-15'
  },
  {
    id: 2,
    title: '木工手艺 - 榫卯结构',
    category: 'craft',
    content: '卯是中国传统木工的核心技术，不用钉子和胶水，仅靠木材之间的凹凸结合就能牢固连接...\n\n常见榫卯类型：\n1. 燕尾榫\n2. 直榫\n3. 粽角榫\n4. 抱肩榫',
    author_name: '爷爷',
    created_at: '2024-02-20'
  },
  {
    id: 3,
    title: '家训：勤俭持家',
    category: 'motto',
    content: '一粥一饭，当思来处不易；半丝半缕，恒念物力维艰。\n\n做人要诚实，做事要认真。\n宁可吃亏，不可占人便宜。',
    author_name: '曾祖父',
    created_at: '2024-03-10'
  }
])

const hasHeirlooms = computed(() => heirlooms.value.length > 0)

const filteredHeirlooms = (category) => {
  return heirlooms.value.filter(item => item.category === category)
}

const getCategoryName = (category) => {
  const map = {
    recipe: '菜谱',
    craft: '手艺',
    motto: '家训',
    other: '其他'
  }
  return map[category] || '其他'
}

const getCategoryTag = (category) => {
  const map = {
    recipe: 'danger',
    craft: 'primary',
    motto: 'success',
    other: 'default'
  }
  return map[category] || 'default'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '未知'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const showDetail = (item) => {
  selectedItem.value = item
  showDetailPopup.value = true
}

const onAdd = () => {
  heirlooms.value.push({
    id: Date.now(),
    ...newItem.value,
    created_at: new Date().toISOString().split('T')[0]
  })

  showToast('添加成功')
  showAdd.value = false

  newItem.value = {
    title: '',
    category: '',
    content: '',
    author_name: ''
  }
}
</script>

<style scoped>
.heirloom-page {
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

.heirloom-list {
  flex: 1;
  position: relative;
}

.tab-content {
  padding: 12px;
  min-height: 300px;
}

.heirloom-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: transform 0.2s;
}

.heirloom-card:active {
  transform: scale(0.98);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.card-title {
  font-size: 15px;
  font-weight: 500;
}

.card-content {
  font-size: 13px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 8px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #999;
}

.add-btn {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 1000;
}

.detail-content {
  padding: 16px;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-header h2 {
  margin: 12px 0 8px 0;
  font-size: 20px;
}

.author-info {
  font-size: 13px;
  color: #999;
  margin: 0;
}

.detail-body {
  padding: 16px;
  background: #f7f8fa;
  border-radius: 8px;
  margin-bottom: 16px;
  max-height: 400px;
  overflow-y: auto;
}

.detail-body p {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.detail-footer {
  padding: 0 16px;
}

.add-form {
  padding: 16px;
}

.add-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
}
</style>