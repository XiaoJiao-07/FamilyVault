<template>
  <div class="heirloom-page">
    <van-nav-bar title="传家宝" left-arrow @click-left="$router.back()" />

    <!-- 传家宝列表 -->
    <div class="heirloom-list">
      <van-tabs v-model:active="activeTab" sticky>
        <van-tab title="全部" name="all">
          <div class="tab-content">
            <div
              v-for="item in heirlooms"
              :key="item.id"
              class="heirloom-card"
              @click="showDetail(item)"
            >
              <div class="card-category" :class="item.category">
                {{ getCategoryName(item.category) }}
              </div>
              <div class="card-body">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-content">{{ item.content.substring(0, 80) }}...</div>
                <div class="card-footer">
                  <span class="author">{{ item.author_name || '匿名' }}</span>
                  <span class="date">{{ formatDate(item.created_at) }}</span>
                </div>
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
              <div class="card-category recipe">菜谱</div>
              <div class="card-body">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-content">{{ item.content.substring(0, 80) }}...</div>
                <div class="card-footer">
                  <span class="author">{{ item.author_name || '匿名' }}</span>
                  <span class="date">{{ formatDate(item.created_at) }}</span>
                </div>
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
              <div class="card-category craft">手艺</div>
              <div class="card-body">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-content">{{ item.content.substring(0, 80) }}...</div>
                <div class="card-footer">
                  <span class="author">{{ item.author_name || '匿名' }}</span>
                  <span class="date">{{ formatDate(item.created_at) }}</span>
                </div>
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
              <div class="card-category motto">家训</div>
              <div class="card-body">
                <div class="card-title">{{ item.title }}</div>
                <div class="card-content">{{ item.content.substring(0, 80) }}...</div>
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
    <div class="fab" @click="showAdd = true">
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
import { ref } from 'vue'
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

const heirlooms = ref([
  {
    id: 1,
    title: '奶奶的红烧肉',
    category: 'recipe',
    content: '材料：五花肉 500g、冰糖 30g、生抽 2 勺、老抽 1 勺、料酒 2 勺、葱姜适量。\n\n做法：\n1. 五花肉切块，冷水下锅焯水\n2. 锅中放少许油，加冰糖炒糖色\n3. 下肉块翻炒上色\n4. 加生抽、老抽、料酒、葱姜\n5. 加水没过肉，大火烧开转小火炖 1 小时\n6. 大火收汁即可\n\n小贴士：冰糖比白糖上色更好，炖的时候不要频繁开盖。',
    author_name: '奶奶',
    created_at: '2024-01-15'
  },
  {
    id: 2,
    title: '木工手艺 - 榫卯结构',
    category: 'craft',
    content: '卯是中国传统木工的核心技术，不用钉子和胶水，仅靠木材之间的凹凸结合就能牢固连接。\n\n常见榫卯类型：\n1. 燕尾榫 - 用于抽屉、箱子\n2. 直榫 - 最基本的连接方式\n3. 粽角榫 - 用于家具角部\n4. 抱肩榫 - 用于桌椅腿\n\n学习要点：\n- 木材要干燥处理\n- 尺寸要精确到毫米\n- 需要多年练习才能掌握',
    author_name: '爷爷',
    created_at: '2024-02-20'
  },
  {
    id: 3,
    title: '家训：勤俭持家',
    category: 'motto',
    content: '一粥一饭，当思来处不易；半丝半缕，恒念物力维艰。\n\n做人要诚实，做事要认真。\n宁可吃亏，不可占人便宜。\n\n家族传承五代，这是我们家最重要的精神财富。',
    author_name: '曾祖父',
    created_at: '2024-03-10'
  },
  {
    id: 4,
    title: '妈妈的腌菜秘方',
    category: 'recipe',
    content: '材料：大白菜 5 斤、盐 150g、花椒 20g、干辣椒 10 个\n\n做法：\n1. 白菜洗净晾干水分\n2. 切成适当大小\n3. 加盐揉搓出水\n4. 加入花椒和干辣椒\n5. 装入坛中压实\n6. 密封腌制 15 天\n\n这是妈妈从外婆那里学来的，味道特别好。',
    author_name: '妈妈',
    created_at: '2024-04-05'
  }
])

const filteredHeirlooms = (category) => {
  return heirlooms.value.filter(item => item.category === category)
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

const onAdd = () => {
  if (!newItem.value.title || !newItem.value.content) {
    showToast('请填写完整信息')
    return
  }

  heirlooms.value.unshift({
    id: Date.now(),
    ...newItem.value,
    created_at: new Date().toISOString().split('T')[0]
  })

  showToast('添加成功')
  showAdd.value = false
  newItem.value = { title: '', category: '', content: '', author_name: '' }
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
