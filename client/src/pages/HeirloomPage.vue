<template>
  <div class="heirloom-page">
    <van-nav-bar title="传家宝" left-arrow @click-left="$router.back()" />

    <!-- 传家宝列表 -->
    <div class="heirloom-list">
      <van-tabs v-model:active="activeTab" sticky>
        <van-tab
          v-for="cat in categories"
          :key="cat.key"
          :title="cat.label"
          :name="cat.key"
        >
          <div class="tab-content">
            <EmptyState
              v-if="!itemsOf(cat.key).length"
              compact
              :icon="cat.icon"
              :title="cat.emptyTitle"
              :desc="cat.emptyDesc"
              action-text="记录第一件"
              @action="openAdd(cat.key)"
            />
            <div
              v-for="item in itemsOf(cat.key)"
              :key="item.id"
              class="heirloom-card"
              @click="showDetail(item)"
            >
              <div class="card-category" :class="item.category">
                {{ getCategoryName(item.category) }}
              </div>
              <div class="card-body">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-content">{{ preview(item.content) }}</div>
                <div class="card-footer">
                  <span class="author">{{ item.author_name || '匿名' }}</span>
                  <span class="date">{{ formatDate(item.created_at) }}</span>
                </div>
              </div>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </div>

    <!-- 添加按钮 -->
    <div class="fab" @click="openAdd('')">
      <van-icon name="plus" size="24" color="white" />
    </div>

    <!-- 详情弹窗 -->
    <van-popup
      v-model:show="showDetailPopup"
      position="bottom"
      round
      :style="{ height: '75%' }"
    >
      <div v-if="selectedItem" class="detail-content">
        <div class="detail-header">
          <div class="detail-category" :class="selectedItem.category">
            {{ getCategoryName(selectedItem.category) }}
          </div>
          <h2>{{ selectedItem.title }}</h2>
          <p class="author-info">
            {{ selectedItem.author_name || '匿名' }} · {{ formatDate(selectedItem.created_at) }}
          </p>
        </div>

        <div class="detail-body">
          <p>{{ selectedItem.content }}</p>
        </div>

        <div class="detail-footer">
          <van-button class="detail-delete" plain round @click="onDelete">
            删除这条
          </van-button>
          <van-button type="primary" block round @click="showDetailPopup = false">
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
      :style="{ height: '65%' }"
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
              :model-value="categoryLabel"
              name="category"
              label="类型"
              placeholder="选择类型：菜谱 / 手艺 / 家训"
              readonly
              is-link
              required
              @click="showCategoryPicker = true"
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

    <!-- 类型选择 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom" round>
      <van-picker
        :columns="categoryColumns"
        title="选择类型"
        @confirm="onPickCategory"
        @cancel="showCategoryPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import EmptyState from '@/components/EmptyState.vue'

const activeTab = ref('all')
const showDetailPopup = ref(false)
const showAdd = ref(false)
const showCategoryPicker = ref(false)
const selectedItem = ref(null)

const categories = [
  {
    key: 'all',
    label: '全部',
    icon: 'gift-card-o',
    emptyTitle: '还没有传家宝',
    emptyDesc: '一道家常菜、一门老手艺、一句家训，都是能传下去的东西。先记下最想留住的那一件。'
  },
  {
    key: 'recipe',
    label: '菜谱',
    icon: 'shop-o',
    emptyTitle: '还没有记下菜谱',
    emptyDesc: '那道只有家里人才做得出的味道，趁还记得，把用料和火候写下来。'
  },
  {
    key: 'craft',
    label: '手艺',
    icon: 'setting-o',
    emptyTitle: '还没有记下手艺',
    emptyDesc: '木工、缝纫、修表、种花——手上会的东西，写下来才不会断。'
  },
  {
    key: 'motto',
    label: '家训',
    icon: 'records-o',
    emptyTitle: '还没有记下家训',
    emptyDesc: '长辈常挂在嘴边的那句话，往往就是这家人行事的分寸。'
  }
]

const categoryColumns = [
  { text: '菜谱', value: 'recipe' },
  { text: '手艺', value: 'craft' },
  { text: '家训', value: 'motto' }
]

const newItem = ref({
  title: '',
  category: '',
  content: '',
  author_name: ''
})

// 全部数据来自本地/云端，不预置示例
const heirlooms = ref(
  Array.isArray(storage.get(STORAGE_KEYS.HEIRLOOMS, null))
    ? storage.get(STORAGE_KEYS.HEIRLOOMS, null)
    : []
)

const saveHeirlooms = () => {
  storage.set(STORAGE_KEYS.HEIRLOOMS, heirlooms.value)
}

const itemsOf = (category) =>
  category === 'all'
    ? heirlooms.value
    : heirlooms.value.filter(item => item.category === category)

const preview = (content) => {
  const text = String(content || '').replace(/\s+/g, ' ').trim()
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

const getCategoryName = (category) => {
  const map = { recipe: '菜谱', craft: '手艺', motto: '家训' }
  return map[category] || '其他'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '未知'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const showDetail = (item) => {
  selectedItem.value = item
  showDetailPopup.value = true
}

const openAdd = (category = '') => {
  newItem.value = {
    title: '',
    category: category === 'all' ? '' : category,
    content: '',
    author_name: ''
  }
  showAdd.value = true
}

const categoryLabel = computed(() => {
  const hit = categoryColumns.find(c => c.value === newItem.value.category)
  return hit ? hit.text : ''
})

const onPickCategory = ({ selectedOptions }) => {
  newItem.value.category = selectedOptions[0]?.value || ''
  showCategoryPicker.value = false
}

const onAdd = () => {
  if (!newItem.value.title.trim() || !newItem.value.content.trim()) {
    showToast('标题和内容都要写，哪怕只有一句话')
    return
  }
  if (!newItem.value.category) {
    showToast('先选一个类型：菜谱 / 手艺 / 家训')
    return
  }

  heirlooms.value.unshift({
    id: Date.now(),
    title: newItem.value.title.trim(),
    category: newItem.value.category,
    content: newItem.value.content.trim(),
    author_name: newItem.value.author_name.trim(),
    created_at: new Date().toISOString().split('T')[0]
  })
  saveHeirlooms()

  showToast('已记下')
  showAdd.value = false
  newItem.value = { title: '', category: '', content: '', author_name: '' }
}

const onDelete = () => {
  const item = selectedItem.value
  if (!item) return
  showConfirmDialog({
    title: '删除传家宝',
    message: `确定删除「${item.title}」吗？删除后无法恢复。`,
    confirmButtonText: '删除',
    confirmButtonColor: '#B4442E'
  })
    .then(() => {
      heirlooms.value = heirlooms.value.filter(h => h.id !== item.id)
      saveHeirlooms()
      showDetailPopup.value = false
      showToast('已删除')
    })
    .catch(() => {})
}
</script>

<style scoped>
.heirloom-page {
  min-height: 100vh;
  background: var(--fv-surface-soft);
  display: flex;
  flex-direction: column;
  position: relative;
}

.heirloom-list {
  flex: 1;
  overflow: hidden;
}

.tab-content {
  padding: 12px;
  min-height: 300px;
}

.heirloom-card {
  background: var(--fv-surface);
  border-radius: 14px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
}

.heirloom-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
}

.card-category {
  width: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: white;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  flex-shrink: 0;
}

.card-category.recipe { background: linear-gradient(180deg, #e6b8c3, #c9737f); }
.card-category.craft { background: linear-gradient(180deg, #a9c6d6, #7fb3c4); }
.card-category.motto { background: linear-gradient(180deg, #b7cfa4, #8fc9b4); }

.card-body {
  flex: 1;
  padding: 14px;
  min-width: 0;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--fv-ink);
  margin-bottom: 6px;
}

.card-content {
  font-size: 13px;
  color: var(--fv-ink-2);
  line-height: 1.5;
  margin-bottom: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--fv-ink-4);
}

.fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--fv-primary), var(--fv-primary-deep));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  cursor: pointer;
  z-index: 100;
  transition: transform 0.2s;
}

.fab:active {
  transform: scale(0.9);
}

.detail-content {
  padding: 16px;
}

.detail-header {
  margin-bottom: 16px;
}

.detail-category {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  margin-bottom: 10px;
}

.detail-category.recipe { background: linear-gradient(135deg, #e6b8c3, #c9737f); }
.detail-category.craft { background: linear-gradient(135deg, #a9c6d6, #7fb3c4); }
.detail-category.motto { background: linear-gradient(135deg, #b7cfa4, #8fc9b4); }

.detail-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 700;
}

.author-info {
  font-size: 13px;
  color: var(--fv-ink-3);
  margin: 0;
}

.detail-body {
  padding: 16px;
  background: var(--fv-surface-soft);
  border-radius: 12px;
  margin-bottom: 16px;
  max-height: 45vh;
  overflow-y: auto;
}

.detail-body p {
  margin: 0;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
  color: var(--fv-ink);
}

.detail-footer {
  padding: 0 16px;
}

.detail-delete {
  width: 100%;
  margin-bottom: 10px;
  color: #b4442e;
  border-color: rgba(180, 68, 46, 0.35);
}

.add-form {
  padding: 16px;
}

.add-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
  font-weight: 600;
}
</style>
