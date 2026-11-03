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
      <div class="view-switch">
        <button class="vs-btn" :class="{ 'is-on': viewMode === 'graph' }" @click="switchView('graph')">
          关系图
        </button>
        <button class="vs-btn" :class="{ 'is-on': viewMode === 'tree' }" @click="switchView('tree')">
          家谱树
        </button>
      </div>
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
        <span>亲子</span>
      </div>
      <div v-if="viewMode === 'tree'" class="legend-item">
        <span class="legend-line dashed"></span>
        <span>夫妻</span>
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
          <div class="relations-head">
            <h4>家族关系</h4>
            <button class="rel-add-btn" type="button" @click="openAddRelation">＋ 添加</button>
          </div>
          <p v-if="!memberRelations.length" class="relation-empty">还没有关系，点右上「添加」创建</p>
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

    <!-- 添加关系弹窗 -->
    <van-popup
      v-model:show="showAddRelation"
      position="bottom"
      round
      :style="{ height: '48%' }"
    >
      <div class="add-relation-form">
        <h3>添加关系</h3>
        <p v-if="selectedMember" class="rel-from">以「{{ selectedMember.name }}」为中心</p>
        <div class="rel-types">
          <button
            v-for="t in relationTypes"
            :key="t"
            type="button"
            class="rel-type-btn"
            :class="{ 'is-on': newRelation.type === t }"
            @click="newRelation.type = t"
          >
            {{ t }}
          </button>
        </div>
        <van-cell-group inset>
          <van-field
            readonly
            clickable
            :model-value="newRelation.targetName"
            placeholder="选择对方成员"
            @click="showMemberPicker = true"
          />
        </van-cell-group>
        <div style="margin: 16px">
          <van-button round block type="primary" @click="onSaveRelation">
            保存关系
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 选择成员 -->
    <van-popup v-model:show="showMemberPicker" position="bottom" round>
      <van-picker
        :columns="relationColumns"
        title="选择成员"
        @confirm="onPickTarget"
        @cancel="showMemberPicker = false"
      />
    </van-popup>

    <!-- 浮动按钮 -->
    <div class="fab" @click="showAddMember = true">
      <van-icon name="plus" size="24" color="white" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { showToast } from 'vant'
import * as d3 from 'd3'
import storage, { STORAGE_KEYS } from '@/utils/storage'

const graphContainer = ref(null)
const searchQuery = ref('')
const showMemberDetail = ref(false)
const showAddMember = ref(false)
const selectedMember = ref(null)
const memberRelations = ref([])
const viewMode = ref('graph')

const newMember = ref({
  name: '',
  gender: '',
  birthYear: '',
  hometown: '',
  occupation: ''
})

// 默认家族数据
const defaultNodes = [
  { id: 1, name: '曾祖父', gender: '男', birthYear: 1920, hometown: '湖北武汉', occupation: '商人', color: '#4A6B7C' },
  { id: 2, name: '曾祖母', gender: '女', birthYear: 1922, hometown: '湖北武汉', occupation: '家庭主妇', color: '#9C5B6B' },
  { id: 3, name: '爷爷', gender: '男', birthYear: 1950, hometown: '湖北武汉', occupation: '工程师', color: '#4A6B7C' },
  { id: 4, name: '奶奶', gender: '女', birthYear: 1952, hometown: '四川成都', occupation: '教师', color: '#9C5B6B' },
  { id: 5, name: '大伯', gender: '男', birthYear: 1975, hometown: '湖北武汉', occupation: '医生', color: '#4A6B7C' },
  { id: 6, name: '爸爸', gender: '男', birthYear: 1978, hometown: '湖北武汉', occupation: '程序员', color: '#4A6B7C' },
  { id: 7, name: '妈妈', gender: '女', birthYear: 1980, hometown: '湖南长沙', occupation: '会计', color: '#9C5B6B' },
  { id: 8, name: '我', gender: '男', birthYear: 2005, hometown: '湖北武汉', occupation: '学生', color: '#4A6B7C' },
  { id: 9, name: '堂哥', gender: '男', birthYear: 2003, hometown: '湖北武汉', occupation: '大学生', color: '#4A6B7C' },
  { id: 10, name: '姑姑', gender: '女', birthYear: 1982, hometown: '湖北武汉', occupation: '设计师', color: '#9C5B6B' }
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
const idOf = v => (typeof v === 'object' && v !== null ? v.id : v)

// 兼容历史脏数据：补缺失 id、过滤引用了不存在成员的关系
graphData.value.nodes.forEach((n, i) => {
  if (n && n.id == null) n.id = Date.now() + i
})
const validIds = new Set(graphData.value.nodes.map(n => n.id))
graphData.value.edges = graphData.value.edges.filter(
  e => e && validIds.has(idOf(e.source)) && validIds.has(idOf(e.target))
)

const saveGraphData = () => {
  // 保存前清洗：剥离 d3 力导向写入的 x/y/vx/vy 等运行时属性
  const cleanNodes = graphData.value.nodes
    .filter(n => n && n.name && n.id != null)
    .map(n => ({
      id: n.id,
      name: n.name,
      gender: n.gender || '',
      birthYear: n.birthYear || null,
      hometown: n.hometown || '',
      occupation: n.occupation || '',
      color: n.color || ''
    }))
  const cleanEdges = graphData.value.edges
    .filter(e => e && e.label)
    .map(e => ({ source: idOf(e.source), target: idOf(e.target), label: e.label }))
  storage.set(STORAGE_KEYS.FAMILY_MEMBERS, cleanNodes)
  storage.set(STORAGE_KEYS.FAMILY_RELATIONSHIPS, cleanEdges)
}

// 加载图谱数据
const loadGraphData = async () => {
  await nextTick()
  if (viewMode.value === 'tree') renderTree()
  else renderGraph()
}

// 渲染 D3 图谱
const renderGraph = () => {
  if (!graphContainer.value) return

  const container = graphContainer.value
  const width = container.clientWidth
  const height = Math.max(500, window.innerHeight - 200)

  d3.select(container).selectAll('*').remove()

  // 只渲染两端都存在的关系，防止脏数据让力导向崩溃
  const validIdSet = new Set(graphData.value.nodes.map(n => n.id))
  const usableEdges = graphData.value.edges.filter(
    e => e && validIdSet.has(idOf(e.source)) && validIdSet.has(idOf(e.target))
  )
  // 深拷贝边，避免 forceLink 把 source/target 改写成节点对象引用
  const linkEdges = usableEdges.map(e => ({ ...e }))

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)

  const simulation = d3.forceSimulation(graphData.value.nodes)
    .force('link', d3.forceLink(linkEdges).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collision', d3.forceCollide().radius(50))

  // 绘制连线
  const link = svg.append('g')
    .selectAll('line')
    .data(linkEdges)
    .enter()
    .append('line')
    .attr('stroke', '#E5D9C7')
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
    .attr('fill', d => d.gender === '男' ? '#4A6B7C' : '#9C5B6B')
    .attr('stroke', '#FFFDF8')
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
    .attr('fill', '#2B2119')

  // 连线标签
  const linkLabel = svg.append('g')
    .selectAll('text')
    .data(linkEdges)
    .enter()
    .append('text')
    .text(d => d.label)
    .attr('font-size', '10px')
    .attr('fill', '#8E7C69')
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
  if (!member || member.virtual) return
  selectedMember.value = member

  memberRelations.value = graphData.value.edges
    .filter(e => idOf(e.source) === member.id || idOf(e.target) === member.id)
    .map(e => {
      const s = idOf(e.source)
      const t = idOf(e.target)
      const otherId = s === member.id ? t : s
      const other = graphData.value.nodes.find(n => n.id === otherId)
      return {
        id: `${s}-${t}`,
        type: e.label,
        otherName: other ? other.name : '未知'
      }
    })

  showMemberDetail.value = true
}

// ---------- 家谱树 ----------
// 成员+关系 → 层级树：每个孩子优先挂父亲下，母亲以夫妻虚线关联
const buildFamilyTree = (nodes, edges) => {
  if (!nodes || !nodes.length) return null

  const byId = new Map(nodes.map(n => [n.id, n]))
  const fatherOf = new Map()
  const motherOf = new Map()

  edges.forEach(e => {
    const s = typeof e.source === 'object' ? e.source.id : e.source
    const t = typeof e.target === 'object' ? e.target.id : e.target
    if (!byId.has(s) || !byId.has(t)) return
    if (e.label === '父子' || e.label === '父女') fatherOf.set(t, s)
    else if (e.label === '母子' || e.label === '母女') motherOf.set(t, s)
  })

  const mainParent = new Map()
  nodes.forEach(n => {
    if (fatherOf.has(n.id)) mainParent.set(n.id, fatherOf.get(n.id))
    else if (motherOf.has(n.id)) mainParent.set(n.id, motherOf.get(n.id))
  })

  const childrenOf = new Map()
  mainParent.forEach((p, c) => {
    if (!childrenOf.has(p)) childrenOf.set(p, [])
    childrenOf.get(p).push(c)
  })

  const seen = new Set()
  const build = (id) => {
    if (seen.has(id)) return null
    seen.add(id)
    const node = byId.get(id)
    if (!node) return null
    const kids = (childrenOf.get(id) || []).map(build).filter(Boolean)
    return { ...node, children: kids.length ? kids : undefined }
  }

  const roots = nodes.filter(n => !mainParent.has(n.id))
  if (!roots.length) return build(nodes[0].id)
  if (roots.length === 1) return build(roots[0].id)
  return {
    id: '__root__',
    name: '始祖',
    virtual: true,
    gender: '',
    children: roots.map(r => build(r.id)).filter(Boolean)
  }
}

// 渲染家谱树（纵向：先辈在上，后代在下）
const renderTree = () => {
  const container = graphContainer.value
  if (!container) return

  const width = container.clientWidth
  const height = Math.max(500, window.innerHeight - 220)
  d3.select(container).selectAll('*').remove()

  const treeData = buildFamilyTree(graphData.value.nodes, graphData.value.edges)
  if (!treeData) return

  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('cursor', 'grab')

  const root = d3.hierarchy(treeData)
  d3.tree().nodeSize([76, 108])(root)

  const xs = root.descendants().map(d => d.x)
  const offsetX = width / 2 - (Math.min(...xs) + Math.max(...xs)) / 2

  const g = svg.append('g')

  // 亲子连线
  g.append('g')
    .selectAll('path')
    .data(root.links())
    .enter()
    .append('path')
    .attr('d', d3.linkVertical().x(d => d.x).y(d => d.y))
    .attr('fill', 'none')
    .attr('stroke', '#D9C7AE')
    .attr('stroke-width', 2)

  // 夫妻虚线
  const posOf = new Map(root.descendants().map(d => [d.data.id, d]))
  const idOf = v => (typeof v === 'object' && v !== null ? v.id : v)
  const couples = graphData.value.edges
    .filter(e => e.label === '夫妻')
    .map(e => ({ a: posOf.get(idOf(e.source)), b: posOf.get(idOf(e.target)) }))
    .filter(c => c.a && c.b)

  g.append('g')
    .selectAll('line')
    .data(couples)
    .enter()
    .append('line')
    .attr('x1', d => d.a.x).attr('y1', d => d.a.y)
    .attr('x2', d => d.b.x).attr('y2', d => d.b.y)
    .attr('stroke', '#B4442E')
    .attr('stroke-width', 1.5)
    .attr('stroke-dasharray', '4 4')
    .attr('opacity', 0.5)

  // 节点
  const node = g.append('g')
    .selectAll('g')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (event, d) => onNodeClick(d.data))

  node.append('circle')
    .attr('r', d => (d.data.virtual ? 16 : 26))
    .attr('fill', d => {
      if (d.data.virtual) return '#8E7C69'
      return d.data.gender === '女' ? '#9C5B6B' : '#4A6B7C'
    })
    .attr('stroke', '#FFFDF8')
    .attr('stroke-width', 3)

  node.append('text')
    .text(d => (d.data.virtual ? '族' : d.data.name.charAt(0)))
    .attr('text-anchor', 'middle')
    .attr('dy', 5)
    .attr('font-size', d => (d.data.virtual ? '13px' : '15px'))
    .attr('font-weight', '600')
    .attr('fill', 'white')

  node.append('text')
    .text(d => (d.data.virtual ? '' : d.data.name))
    .attr('text-anchor', 'middle')
    .attr('dy', 44)
    .attr('font-size', '11px')
    .attr('font-weight', '500')
    .attr('fill', '#2B2119')

  // 缩放 + 拖拽
  const zoom = d3.zoom()
    .scaleExtent([0.35, 2.2])
    .on('zoom', event => g.attr('transform', event.transform))
  svg.call(zoom)
  svg.call(zoom.transform, d3.zoomIdentity.translate(offsetX, 46))
}

// 切换视图
const switchView = async (mode) => {
  if (viewMode.value === mode) return
  viewMode.value = mode
  await nextTick()
  if (mode === 'graph') renderGraph()
  else renderTree()
}

// ---------- 添加关系 ----------
const showAddRelation = ref(false)
const showMemberPicker = ref(false)
const relationTypes = ['夫妻', '父子', '母子', '父女', '母女', '兄弟', '姐妹']
const newRelation = ref({ type: '', targetId: null, targetName: '' })

const relationColumns = computed(() =>
  graphData.value.nodes
    .filter(n => !selectedMember.value || n.id !== selectedMember.value.id)
    .map(n => ({ text: n.name, value: n.id }))
)

const openAddRelation = () => {
  newRelation.value = { type: '', targetId: null, targetName: '' }
  showAddRelation.value = true
}

const onPickTarget = ({ selectedOptions }) => {
  const opt = selectedOptions && selectedOptions[0]
  if (opt) {
    newRelation.value.targetId = opt.value
    newRelation.value.targetName = opt.text
  }
  showMemberPicker.value = false
}

const onSaveRelation = () => {
  const from = selectedMember.value
  if (!from || !newRelation.value.type || newRelation.value.targetId == null) {
    showToast('请选择关系类型和成员')
    return
  }
  const target = graphData.value.nodes.find(n => n.id === newRelation.value.targetId)
  if (!target) {
    showToast('未找到对方成员')
    return
  }
  const dup = graphData.value.edges.some(e => {
    const s = idOf(e.source)
    const t = idOf(e.target)
    return (s === from.id && t === target.id) || (s === target.id && t === from.id)
  })
  if (dup) {
    showToast('这两位之间已有关联')
    return
  }
  graphData.value.edges.push({ source: from.id, target: target.id, label: newRelation.value.type })
  saveGraphData()
  showToast('关系已添加')
  showAddRelation.value = false
  onNodeClick(from)
  nextTick(() => (viewMode.value === 'tree' ? renderTree() : renderGraph()))
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

  // 用时间戳生成 id，避免 Math.max 遇到非数字 id 产生 NaN
  const newNode = {
    id: Date.now(),
    name: newMember.value.name,
    gender: newMember.value.gender || '未知',
    birthYear: parseInt(newMember.value.birthYear) || null,
    hometown: newMember.value.hometown,
    occupation: newMember.value.occupation,
    color: newMember.value.gender === '女' ? '#9C5B6B' : '#4A6B7C'
  }

  graphData.value.nodes.push(newNode)
  saveGraphData() // 保存到 localStorage
  showToast('添加成功')
  showAddMember.value = false
  newMember.value = { name: '', gender: '', birthYear: '', hometown: '', occupation: '' }

  await nextTick()
  if (viewMode.value === 'tree') renderTree()
  else renderGraph()
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
  background: var(--fv-surface-soft);
  display: flex;
  flex-direction: column;
  position: relative;
}

.toolbar {
  background: var(--fv-surface);
  padding: 8px 12px;
  border-bottom: 1px solid var(--fv-border-soft);
}

.graph-canvas {
  flex: 1;
  overflow: hidden;
  background: var(--fv-surface);
  min-height: 400px;
}

.legend {
  position: absolute;
  top: 176px;
  right: 12px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 8px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--fv-ink-2);
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

.legend-dot.male { background: #4A6B7C; }
.legend-dot.female { background: #9C5B6B; }

.legend-line {
  width: 16px;
  height: 2px;
  background: #E5D9C7;
}

.legend-line.dashed {
  background: repeating-linear-gradient(90deg, #B4442E 0 4px, transparent 4px 8px);
}

.relations-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rel-add-btn {
  padding: 3px 10px;
  border: 1px solid #e3d5c2;
  border-radius: 999px;
  background: #fdf8f0;
  font-family: inherit;
  font-size: 12px;
  color: #b4442e;
  cursor: pointer;
}

.relation-empty {
  margin: 8px 0 0;
  font-size: 12px;
  color: #b3a28d;
}

.add-relation-form {
  padding: 20px 0 10px;
}

.add-relation-form h3 {
  margin: 0 0 4px;
  text-align: center;
}

.rel-from {
  margin: 0 0 10px;
  text-align: center;
  font-size: 12px;
  color: #8e7c69;
}

.rel-types {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 14px;
  padding: 0 16px;
}

.rel-type-btn {
  padding: 6px 14px;
  border: 1px solid #e3d5c2;
  border-radius: 999px;
  background: #fffcf6;
  font-family: inherit;
  font-size: 13px;
  color: #5f5e5a;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.rel-type-btn.is-on {
  background: #b4442e;
  border-color: #b4442e;
  color: #fff;
}

.view-switch {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  padding: 3px;
  background: var(--fv-surface-soft);
  border-radius: 10px;
}

.vs-btn {
  flex: 1;
  padding: 7px 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--fv-ink-2);
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}

.vs-btn.is-on {
  background: var(--fv-surface);
  color: var(--fv-primary);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(74, 52, 36, 0.12);
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
  color: var(--fv-ink-2);
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
  border-bottom: 1px solid var(--fv-border-soft);
}

.relation-item:last-child {
  border-bottom: none;
}

.relation-name {
  font-size: 14px;
  color: var(--fv-ink);
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
</style>
