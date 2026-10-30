<template>
  <div class="graph-page">
    <van-nav-bar title="家族图谱" left-arrow @click-left="$router.back()" />

    <!-- 工具栏 -->
    <div class="toolbar">
      <van-search
        v-model="searchQuery"
        placeholder="搜索家族成员..."
        shape="round"
        @search="onSearch"
        @clear="onSearchClear"
      />
    </div>

    <!-- D3 图谱容器 -->
    <div ref="graphContainer" class="graph-canvas"></div>

    <!-- 图例 -->
    <div class="legend">
      <div class="legend-item">
        <span class="legend-dot male"></span>
        <span>男</span>
      </div>
      <div class="legend-item">
        <span class="legend-dot female"></span>
        <span>女</span>
      </div>
      <div class="legend-item">
        <span class="legend-line"></span>
        <span>关系</span>
      </div>
    </div>

    <!-- 成员详情弹窗 -->
    <van-popup
      v-model:show="showMemberDetail"
      position="bottom"
      round
      :style="{ height: '55%' }"
    >
      <div v-if="selectedMember" class="member-detail">
        <div class="detail-header">
          <div class="member-avatar" :style="{ background: selectedMember.color }">
            <span class="avatar-text">{{ selectedMember.name.charAt(0) }}</span>
          </div>
          <div class="detail-info">
            <h3>{{ selectedMember.name }}</h3>
            <p>{{ selectedMember.gender }} · {{ selectedMember.birthYear }}年生</p>
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
            <van-tag :type="getRelationTagType(rel.type)" round>
              {{ rel.type }}
            </van-tag>
            <span class="relation-name">{{ rel.otherName }}</span>
          </div>
        </div>

        <div class="detail-actions">
          <van-button type="primary" block round @click="showMemberDetail = false">
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

    <!-- 浮动按钮 -->
    <div class="fab" @click="showAddMember = true">
      <van-icon name="plus" size="24" color="white" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast } from 'vant'
import * as d3 from 'd3'
import storage, { STORAGE_KEYS } from '@/utils/storage'

const graphContainer = ref(null)
const searchQuery = ref('')
const showMemberDetail = ref(false)
const showAddMember = ref(false)
const selectedMember = ref(null)
const memberRelations = ref([])

const newMember = ref({
  name: '',
  gender: '',
  birthYear: '',
  hometown: '',
  occupation: ''
})

// 默认家族数据
const defaultNodes = [
  { id: 1, name: '曾祖父', gender: '男', birthYear: 1920, hometown: '湖北武汉', occupation: '商人', color: '#4A90E2' },
  { id: 2, name: '曾祖母', gender: '女', birthYear: 1922, hometown: '湖北武汉', occupation: '家庭主妇', color: '#E91E63' },
  { id: 3, name: '爷爷', gender: '男', birthYear: 1950, hometown: '湖北武汉', occupation: '工程师', color: '#4A90E2' },
  { id: 4, name: '奶奶', gender: '女', birthYear: 1952, hometown: '四川成都', occupation: '教师', color: '#E91E63' },
  { id: 5, name: '大伯', gender: '男', birthYear: 1975, hometown: '湖北武汉', occupation: '医生', color: '#4A90E2' },
  { id: 6, name: '爸爸', gender: '男', birthYear: 1978, hometown: '湖北武汉', occupation: '程序员', color: '#4A90E2' },
  { id: 7, name: '妈妈', gender: '女', birthYear: 1980, hometown: '湖南长沙', occupation: '会计', color: '#E91E63' },
  { id: 8, name: '我', gender: '男', birthYear: 2005, hometown: '湖北武汉', occupation: '学生', color: '#4A90E2' },
  { id: 9, name: '堂哥', gender: '男', birthYear: 2003, hometown: '湖北武汉', occupation: '大学生', color: '#4A90E2' },
  { id: 10, name: '姑姑', gender: '女', birthYear: 1982, hometown: '湖北武汉', occupation: '设计师', color: '#E91E63' }
]

const defaultEdges = [
  { source: 1, target: 2, label: '夫妻' },
  { source: 1, target: 3, label: '父子' },
  { source: 2, target: 3, label: '母子' },
  { source: 3, target: 4, label: '夫妻' },
  { source: 3, target: 5, label: '父子' },
  { source: 3, target: 6, label: '父子' },
  { source: 3, target: 10, label: '父女' },
  { source: 4, target: 5, label: '母子' },
  { source: 4, target: 6, label: '母子' },
  { source: 4, target: 10, label: '母女' },
  { source: 6, target: 7, label: '夫妻' },
  { source: 6, target: 8, label: '父子' },
  { source: 7, target: 8, label: '母子' },
  { source: 5, target: 9, label: '父子' }
]

// 从 localStorage 加载数据，如果没有则使用默认数据
const savedNodes = storage.get(STORAGE_KEYS.FAMILY_MEMBERS, null)
const savedEdges = storage.get(STORAGE_KEYS.FAMILY_RELATIONSHIPS, null)

const graphData = ref({
  nodes: savedNodes || [...defaultNodes],
  edges: savedEdges || [...defaultEdges]
})

// 保存数据到 localStorage
const saveGraphData = () => {
  storage.set(STORAGE_KEYS.FAMILY_MEMBERS, graphData.value.nodes)
  storage.set(STORAGE_KEYS.FAMILY_RELATIONSHIPS, graphData.value.edges)
}

// 加载图谱数据
const loadGraphData = async () => {
  await nextTick()
  renderGraph()
}

// 渲染 D3 图谱
const renderGraph = () => {
  if (!graphContainer.value) return

  const container = graphContainer.value
  const width = container.clientWidth
  const height = Math.max(500, window.innerHeight - 200)

  d3.select(container).selectAll('*').remove()

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)

  const simulation = d3.forceSimulation(graphData.value.nodes)
    .force('link', d3.forceLink(graphData.value.edges).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))

  // 绘制连线
  const link = svg.append('g')
    .selectAll('line')
    .data(graphData.value.edges)
    .enter()
    .append('line')
    .attr('stroke', '#e0e0e0')
    .attr('stroke-width', 2)
    .attr('stroke-opacity', 0.8)

  // 绘制节点组
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

  // 节点圆形（带渐变）
  node.append('circle')
    .attr('r', 32)
    .attr('fill', d => d.gender === '男' ? '#4A90E2' : '#E91E63')
    .attr('stroke', '#fff')
    .attr('stroke-width', 3)
    .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))')

  // 节点文字（首字）
  node.append('text')
    .text(d => d.name.charAt(0))
    .attr('text-anchor', 'middle')
    .attr('dy', 6)
    .attr('font-size', '16px')
    .attr('font-weight', '600')
    .attr('fill', 'white')

  // 节点名字
  node.append('text')
    .text(d => d.name)
    .attr('text-anchor', 'middle')
    .attr('dy', 50)
    .attr('font-size', '12px')
    .attr('font-weight', '500')
    .attr('fill', '#333')

  // 连线标签
  const linkLabel = svg.append('g')
    .selectAll('text')
    .data(graphData.value.edges)
    .enter()
    .append('text')
    .text(d => d.label)
    .attr('font-size', '10px')
    .attr('fill', '#999')
    .attr('text-anchor', 'middle')
    .attr('dy', -5)

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

// 点击节点
const onNodeClick = (member) => {
  selectedMember.value = member

  memberRelations.value = sampleEdges
    .filter(e => e.source === member.id || e.target === member.id)
    .map(e => {
      const otherId = e.source === member.id ? e.target : e.source
      const other = sampleNodes.find(n => n.id === otherId)
      return {
        id: `${e.source}-${e.target}`,
        type: e.label,
        otherName: other ? other.name : '未知'
      }
    })

  showMemberDetail.value = true
}

const getRelationTagType = (type) => {
  const map = {
    '夫妻': 'danger',
    '父子': 'primary',
    '母子': 'primary',
    '父女': 'primary',
    '母女': 'primary',
    '兄弟': 'success',
    '姐妹': 'success'
  }
  return map[type] || 'default'
}

const onSearch = (value) => {
  if (!value) return
  const found = graphData.value.nodes.find(n => n.name.includes(value))
  if (found) {
    onNodeClick(found)
  } else {
    showToast('未找到该成员')
  }
}

const onSearchClear = () => {
  searchQuery.value = ''
}

const onAddMember = async () => {
  if (!newMember.value.name) {
    showToast('请输入姓名')
    return
  }

  const newId = Math.max(...graphData.value.nodes.map(n => n.id)) + 1
  const newNode = {
    id: newId,
    name: newMember.value.name,
    gender: newMember.value.gender || '未知',
    birthYear: parseInt(newMember.value.birthYear) || null,
    hometown: newMember.value.hometown,
    occupation: newMember.value.occupation,
    color: newMember.value.gender === '女' ? '#E91E63' : '#4A90E2'
  }

  graphData.value.nodes.push(newNode)
  saveGraphData() // 保存到 localStorage
  showToast('添加成功')
  showAddMember.value = false
  newMember.value = { name: '', gender: '', birthYear: '', hometown: '', occupation: '' }

  await nextTick()
  renderGraph()
}

onMounted(() => {
  loadGraphData()
})

onUnmounted(() => {
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
  position: relative;
}

.toolbar {
  background: white;
  padding: 8px 12px;
  border-bottom: 1px solid #f0f0f0;
}

.graph-canvas {
  flex: 1;
  overflow: hidden;
  background: white;
  min-height: 400px;
}

.legend {
  position: absolute;
  top: 70px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: #666;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.male { background: #4A90E2; }
.legend-dot.female { background: #E91E63; }

.legend-line {
  width: 16px;
  height: 2px;
  background: #e0e0e0;
}

.member-detail {
  padding: 16px;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.member-avatar {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.member-avatar .avatar-text {
  color: white;
  font-size: 24px;
  font-weight: 600;
}

.detail-info {
  margin-left: 14px;
}

.detail-info h3 {
  margin: 0 0 4px 0;
  font-size: 18px;
  font-weight: 600;
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
  font-weight: 500;
}

.relation-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.relation-item:last-child {
  border-bottom: none;
}

.relation-name {
  font-size: 14px;
  color: #333;
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
  font-weight: 600;
}

.fab {
  position: fixed;
  bottom: 80px;
  right: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #007aff;
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
</style>
