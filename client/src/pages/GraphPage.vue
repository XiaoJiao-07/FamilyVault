<template>
  <div class="graph-page">
    <van-nav-bar title="家族图谱" left-arrow @click-left="$router.back()" />

    <!-- 空状态 -->
    <div v-if="!hasData" class="empty-state">
      <van-icon name="cluster-o" size="64" color="#ddd" />
      <p class="empty-title">家族图谱</p>
      <p class="empty-desc">通过 AI 采访自动提取人物关系，构建可视化家族网络</p>
      <van-button type="primary" plain @click="$router.push('/interview')">
        去采访
      </van-button>
    </div>

    <!-- 图谱展示 -->
    <div v-else class="graph-container">
      <!-- 工具栏 -->
      <div class="toolbar">
        <van-search
          v-model="searchQuery"
          placeholder="搜索家族成员..."
          @search="onSearch"
          @clear="onSearchClear"
        />
        <div class="toolbar-actions">
          <van-button size="small" icon="plus" @click="showAddMember = true">
            添加成员
          </van-button>
        </div>
      </div>

      <!-- D3 图谱容器 -->
      <div ref="graphContainer" class="graph-canvas"></div>

      <!-- 成员详情弹窗 -->
      <van-popup
        v-model:show="showMemberDetail"
        position="bottom"
        round
        :style="{ height: '60%' }"
      >
        <div v-if="selectedMember" class="member-detail">
          <div class="detail-header">
            <van-image
              round
              width="60"
              height="60"
              :src="selectedMember.avatar || defaultAvatar"
            />
            <div class="detail-info">
              <h3>{{ selectedMember.name }}</h3>
              <p>{{ selectedMember.gender }} · {{ selectedMember.birthYear || '未知' }}年生</p>
              <p v-if="selectedMember.hometown">{{ selectedMember.hometown }}</p>
            </div>
          </div>

          <van-cell-group inset>
            <van-cell title="职业" :value="selectedMember.occupation || '未知'" />
            <van-cell title="关系数" :value="memberRelations.length + ' 个'" />
          </van-cell-group>

          <div class="relations-section">
            <h4>家族关系</h4>
            <div v-for="rel in memberRelations" :key="rel.id" class="relation-item">
              <van-tag :type="getRelationTagType(rel.relationship_type)">
                {{ rel.relationship_type }}
              </van-tag>
              <span class="relation-name">{{ rel.other_name }}</span>
            </div>
          </div>

          <div class="detail-actions">
            <van-button type="primary" block @click="showMemberDetail = false">
              关闭
            </van-button>
          </div>
        </div>
      </van-popup>

      <!-- 添加成员弹窗 -->
      <van-popup
        v-model:show="showAddMember"
        position="bottom"
        round
        :style="{ height: '50%' }"
      >
        <div class="add-member-form">
          <h3>添加家族成员</h3>
          <van-form @submit="onAddMember">
            <van-cell-group inset>
              <van-field
                v-model="newMember.name"
                name="name"
                label="姓名"
                placeholder="请输入姓名"
                required
              />
              <van-field
                v-model="newMember.gender"
                name="gender"
                label="性别"
                placeholder="男/女"
              />
              <van-field
                v-model="newMember.birthYear"
                name="birthYear"
                label="出生年份"
                type="number"
                placeholder="例如：1950"
              />
              <van-field
                v-model="newMember.hometown"
                name="hometown"
                label="籍贯"
                placeholder="例如：湖北武汉"
              />
              <van-field
                v-model="newMember.occupation"
                name="occupation"
                label="职业"
                placeholder="例如：教师"
              />
            </van-cell-group>
            <div style="margin: 16px">
              <van-button round block type="primary" native-type="submit">
                添加
              </van-button>
            </div>
          </van-form>
        </div>
      </van-popup>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast } from 'vant'
import * as d3 from 'd3'
import { graphApi } from '@/services/api'

const graphContainer = ref(null)
const searchQuery = ref('')
const showMemberDetail = ref(false)
const showAddMember = ref(false)
const selectedMember = ref(null)
const memberRelations = ref([])

const defaultAvatar = 'https://fastly.jsdelivr.net/npm/@vant/assets/cat.jpeg'

const newMember = ref({
  name: '',
  gender: '',
  birthYear: '',
  hometown: '',
  occupation: ''
})

// 图谱数据
const graphData = ref({ nodes: [], edges: [] })

const hasData = computed(() => {
  return graphData.value.nodes.length > 0
})

// 加载图谱数据
const loadGraphData = async () => {
  try {
    const res = await graphApi.getFullGraph()
    if (res.success && res.data.nodes.length > 0) {
      graphData.value = res.data
      await nextTick()
      renderGraph()
    }
  } catch (error) {
    console.error('加载图谱失败:', error)
  }
}

// 渲染 D3 图谱
const renderGraph = () => {
  if (!graphContainer.value || !hasData.value) return

  const container = graphContainer.value
  const width = container.clientWidth
  const height = 500

  // 清除旧图谱
  d3.select(container).selectAll('*').remove()

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)

  // 创建力导向图
  const simulation = d3.forceSimulation(graphData.value.nodes)
    .force('link', d3.forceLink(graphData.value.edges).id(d => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(40))

  // 绘制连线
  const link = svg.append('g')
    .selectAll('line')
    .data(graphData.value.edges)
    .enter()
    .append('line')
    .attr('stroke', '#999')
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.6)

  // 绘制节点
  const node = svg.append('g')
    .selectAll('g')
    .data(graphData.value.nodes)
    .enter()
    .append('g')
    .call(d3.drag()
      .on('start', dragStarted)
      .on('drag', dragged)
      .on('end', dragEnded))
    .on('click', (event, d) => onNodeClick(d))

  // 节点圆形
  node.append('circle')
    .attr('r', 30)
    .attr('fill', d => getNodeColor(d.gender))
    .attr('stroke', '#fff')
    .attr('stroke-width', 2)

  // 节点文字
  node.append('text')
    .text(d => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', 45)
    .attr('font-size', '12px')
    .attr('fill', '#333')

  // 连线标签
  const linkLabel = svg.append('g')
    .selectAll('text')
    .data(graphData.value.edges)
    .enter()
    .append('text')
    .text(d => d.label)
    .attr('font-size', '10px')
    .attr('fill', '#666')
    .attr('text-anchor', 'middle')

  // 更新位置
  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)

    node.attr('transform', d => `translate(${d.x},${d.y})`)

    linkLabel
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2)
  })

  // 拖拽函数
  function dragStarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart()
    d.fx = d.x
    d.fy = d.y
  }

  function dragged(event, d) {
    d.fx = event.x
    d.fy = event.y
  }

  function dragEnded(event, d) {
    if (!event.active) simulation.alphaTarget(0)
    d.fx = null
    d.fy = null
  }
}

// 节点颜色
const getNodeColor = (gender) => {
  if (gender === '男') return '#4A90E2'
  if (gender === '女') return '#E91E63'
  return '#9E9E9E'
}

// 点击节点
const onNodeClick = async (member) => {
  selectedMember.value = member

  // 获取该成员的关系
  try {
    const res = await graphApi.getRelationships()
    if (res.success) {
      memberRelations.value = res.data
        .filter(r => r.from_member_id === member.id || r.to_member_id === member.id)
        .map(r => ({
          ...r,
          other_name: r.from_member_id === member.id ? r.to_name : r.from_name
        }))
    }
  } catch (error) {
    console.error('获取关系失败:', error)
  }

  showMemberDetail.value = true
}

// 关系标签类型
const getRelationTagType = (type) => {
  const map = {
    '父子': 'primary',
    '母子': 'primary',
    '夫妻': 'danger',
    '兄弟': 'success',
    '姐妹': 'success'
  }
  return map[type] || 'default'
}

// 搜索
const onSearch = (value) => {
  if (!value) return
  const found = graphData.value.nodes.find(n =>
    n.name.includes(value)
  )
  if (found) {
    onNodeClick(found)
  } else {
    showToast('未找到该成员')
  }
}

const onSearchClear = () => {
  searchQuery.value = ''
}

// 添加成员
const onAddMember = async () => {
  try {
    const res = await graphApi.addMember({
      name: newMember.value.name,
      gender: newMember.value.gender,
      birthYear: parseInt(newMember.value.birthYear) || null,
      hometown: newMember.value.hometown,
      occupation: newMember.value.occupation
    })

    if (res.success) {
      showToast('添加成功')
      showAddMember.value = false
      newMember.value = {
        name: '',
        gender: '',
        birthYear: '',
        hometown: '',
        occupation: ''
      }
      await loadGraphData()
    }
  } catch (error) {
    showToast('添加失败：' + error.message)
  }
}

onMounted(() => {
  loadGraphData()
})

onUnmounted(() => {
  // 清理 D3
  if (graphContainer.value) {
    d3.select(graphContainer.value).selectAll('*').remove()
  }
})
</script>

<style scoped>
.graph-page {
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

.graph-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.toolbar {
  background: white;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.toolbar-actions {
  padding: 8px 16px;
}

.graph-canvas {
  flex: 1;
  overflow: hidden;
  background: white;
}

.member-detail {
  padding: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.detail-info {
  margin-left: 12px;
}

.detail-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
}

.detail-info p {
  margin: 2px 0;
  font-size: 13px;
  color: #666;
}

.relations-section {
  padding: 16px;
}

.relations-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.relation-name {
  font-size: 14px;
}

.detail-actions {
  padding: 16px;
}

.add-member-form {
  padding: 16px;
}

.add-member-form h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  text-align: center;
}
</style>