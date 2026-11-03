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
        <span class="legend-wave">〜</span>
        <span>夫妻</span>
      </div>
    </div>

    <!-- 成员详情弹窗 -->
    <van-popup
      v-model:show="showMemberDetail"
      position="bottom"
      round
      :style="{ height: '76%' }"
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

        <div v-if="selectedMember.bio" class="detail-bio">
          <h4>生平</h4>
          <p>{{ selectedMember.bio }}</p>
        </div>

        <div v-if="detailEvents.length" class="detail-timeline">
          <h4>人生年轮</h4>
          <div v-for="(ev, i) in detailEvents" :key="i" class="timeline-item">
            <span class="tl-year">{{ ev.year }}</span>
            <span class="tl-text">{{ ev.text }}</span>
          </div>
        </div>

        <div class="detail-photos">
          <div class="relations-head">
            <h4>照片</h4>
            <button class="rel-add-btn" type="button" @click="pickPhoto">＋ 上传</button>
          </div>
          <p v-if="!detailPhotos.length" class="relation-empty">还没有照片，点右上「上传」添加</p>
          <div v-else class="photo-grid">
            <div v-for="ph in detailPhotos" :key="ph.filename" class="photo-cell" @click="confirmRemovePhoto(ph)">
              <img :src="ph.url" alt="成员照片" />
            </div>
          </div>
        </div>
        <input ref="photoInput" type="file" accept="image/*" hidden @change="onPhotoSelect" />

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
          <div class="detail-actions-row">
            <van-button type="default" round @click="openEditMember">编辑</van-button>
            <van-button type="danger" round @click="onDeleteMember">删除</van-button>
            <van-button type="primary" round @click="showMemberDetail = false">
              关闭
            </van-button>
          </div>
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
        <h3>{{ editingId ? '编辑成员' : '添加家族成员' }}</h3>
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
            <van-field
              v-model="newMember.bio"
              name="bio"
              label="生平"
              type="textarea"
              rows="2"
              autosize
              maxlength="500"
              show-word-limit
              placeholder="TA 的生平简介、性格、口头禅…"
            />
          </van-cell-group>

          <div class="events-editor">
            <div class="relations-head">
              <h4>人生年轮</h4>
              <button class="rel-add-btn" type="button" @click="addEventRow">＋ 加一条</button>
            </div>
            <p v-if="!newMember.events.length" class="relation-empty">记下重要年份：结婚、参加工作、搬迁…</p>
            <div v-for="(ev, i) in newMember.events" :key="i" class="event-row">
              <van-field
                v-model="ev.year"
                type="digit"
                maxlength="4"
                class="event-year"
                placeholder="年份"
              />
              <van-field v-model="ev.text" class="event-text" placeholder="那年发生了什么" />
              <van-icon name="cross" class="event-del" @click="newMember.events.splice(i, 1)" />
            </div>
          </div>
          <div style="margin: 16px">
            <van-button round block type="primary" native-type="submit">
              {{ editingId ? '保存修改' : '添加' }}
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
    <div class="fab" @click="openAddMember">
      <van-icon name="plus" size="24" color="white" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import * as d3 from 'd3'
import storage, { STORAGE_KEYS } from '@/utils/storage'
import { resolveMediaUrl, uploadMedia } from '@/utils/media'

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
  occupation: '',
  bio: '',
  events: []
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
      bio: n.bio || '',
      events: Array.isArray(n.events)
        ? n.events.filter(e => e && (e.year || (e.text && e.text.trim())))
        : [],
      photos: Array.isArray(n.photos) ? n.photos.filter(Boolean) : [],
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
// 成员+关系 → 家庭组层级树：夫妻并排组成一个「家庭组」节点，孩子挂在父母组下
const buildFamilyTree = (nodes, edges) => {
  if (!nodes || !nodes.length) return null

  const byId = new Map(nodes.map(n => [n.id, n]))
  const fatherOf = new Map()
  const motherOf = new Map()
  const spouseOf = new Map()

  edges.forEach(e => {
    const s = typeof e.source === 'object' ? e.source.id : e.source
    const t = typeof e.target === 'object' ? e.target.id : e.target
    if (!byId.has(s) || !byId.has(t)) return
    if (e.label === '父子' || e.label === '父女') fatherOf.set(t, s)
    else if (e.label === '母子' || e.label === '母女') motherOf.set(t, s)
    else if (e.label === '夫妻' || e.label === '丈夫' || e.label === '妻子') {
      if (!spouseOf.has(s)) spouseOf.set(s, t)
      if (!spouseOf.has(t)) spouseOf.set(t, s)
    }
  })

  // 家庭组：已婚两人合成一组（key 取双方 id 排序），未婚单人一组
  const groupKey = (id) => {
    const sp = spouseOf.get(id)
    if (sp !== undefined && byId.has(sp)) return 'c' + [id, sp].sort((a, b) => (a > b ? 1 : -1)).join('-')
    return 's' + id
  }

  const anchorOf = new Map()
  nodes.forEach(n => {
    const k = groupKey(n.id)
    const cur = anchorOf.get(k)
    if (cur === undefined || n.id < cur) anchorOf.set(k, n.id)
  })

  // 孩子归属：父母互为配偶 → 挂该夫妻组；否则挂父/母所在组
  const parentGroupOf = new Map()
  nodes.forEach(n => {
    const f = fatherOf.get(n.id)
    const m = motherOf.get(n.id)
    let pg = null
    if (f !== undefined && m !== undefined && spouseOf.get(f) === m) pg = groupKey(f)
    else if (f !== undefined) pg = groupKey(f)
    else if (m !== undefined) pg = groupKey(m)
    const k = groupKey(n.id)
    if (pg && pg !== k) parentGroupOf.set(k, pg)
  })

  const childrenGroupsOf = new Map()
  parentGroupOf.forEach((pg, k) => {
    if (!childrenGroupsOf.has(pg)) childrenGroupsOf.set(pg, [])
    childrenGroupsOf.get(pg).push(k)
  })

  const seen = new Set()
  const buildGroup = (k) => {
    if (seen.has(k)) return null
    seen.add(k)
    const anchor = byId.get(anchorOf.get(k))
    if (!anchor) return null
    const members = [anchor]
    const spId = spouseOf.get(anchor.id)
    if (spId !== undefined && byId.has(spId) && groupKey(spId) === k && spouseOf.get(spId) === anchor.id) {
      members.push(byId.get(spId))
    }
    const kids = (childrenGroupsOf.get(k) || []).map(buildGroup).filter(Boolean)
    return { key: k, members, virtual: false, children: kids.length ? kids : undefined }
  }

  const roots = [...anchorOf.keys()].filter(k => {
    const pg = parentGroupOf.get(k)
    return pg === undefined || pg === k
  })
  const built = roots.map(buildGroup).filter(Boolean)
  if (!built.length) return null
  if (built.length === 1) return built[0]
  return { key: '__root__', members: [], virtual: true, children: built }
}

// 树卡片尺寸（px）
const CARD_W = 104
const CARD_H = 92
const CARD_GAP = 18

// 渲染家谱树（家庭组卡片式：夫妻并排，子代干线垂下）
const renderTree = () => {
  const container = graphContainer.value
  if (!container) return

  const width = container.clientWidth
  d3.select(container).selectAll('*').remove()

  const treeData = buildFamilyTree(graphData.value.nodes, graphData.value.edges)
  if (!treeData) return

  const root = d3.hierarchy(treeData)
  d3.tree().nodeSize([272, 190])(root)

  const xs = root.descendants().map(d => d.x)
  const maxY = Math.max(...root.descendants().map(d => d.y))
  const height = Math.max(560, maxY - 0 + 160)
  const svg = d3.select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('cursor', 'grab')

  const g = svg.append('g')

  // 家庭组内卡片布局：返回每张卡片相对组锚点的左上角偏移
  const memberCards = (d) => {
    const n = d.data.members.length
    const totalW = n * CARD_W + (n - 1) * CARD_GAP
    const startX = -totalW / 2
    return d.data.members.map((m, i) => ({
      member: m,
      x: startX + i * (CARD_W + CARD_GAP),
      y: 0
    }))
  }

  // 亲子干线：父组底部 → 水平母线 → 孩子组顶部
  g.append('g')
    .selectAll('path')
    .data(root.links())
    .enter()
    .append('path')
    .attr('d', d => {
      const px = d.source.x
      const py = d.source.y + CARD_H
      const cy = d.target.y
      const by = py + (cy - py) / 2
      return `M${px},${py} L${px},${by} L${d.target.x},${by} L${d.target.x},${cy}`
    })
    .attr('fill', 'none')
    .attr('stroke', '#C9BCA8')
    .attr('stroke-width', 1.8)
    .attr('opacity', 0.85)

  // 家庭组节点
  const node = g.append('g')
    .selectAll('g.group')
    .data(root.descendants())
    .enter()
    .append('g')
    .attr('transform', d => `translate(${d.x},${d.y})`)

  // 虚拟「族」根
  const virtualRoot = node.filter(d => d.data.virtual)
  virtualRoot.append('circle')
    .attr('r', 22)
    .attr('cy', CARD_H / 2)
    .attr('fill', '#8E7C69')
    .attr('stroke', '#FFFDF8')
    .attr('stroke-width', 3)
  virtualRoot.append('text')
    .text('族')
    .attr('text-anchor', 'middle')
    .attr('y', CARD_H / 2 + 5)
    .attr('font-size', '14px')
    .attr('font-weight', '600')
    .attr('fill', 'white')

  // 卡片（虚拟根无成员）
  const card = node.filter(d => !d.data.virtual && d.data.members.length)
    .append('g')
    .selectAll('g.card')
    .data(d => memberCards(d))
    .enter()
    .append('g')
    .attr('transform', c => `translate(${c.x},${c.y})`)
    .style('cursor', 'pointer')
    .on('click', (event, c) => onNodeClick(c.member))

  const isMale = c => c.member.gender !== '女'
  const scaleX = c => (c.member.name || '').charAt(0)

  card.append('rect')
    .attr('width', CARD_W)
    .attr('height', CARD_H)
    .attr('rx', 10)
    .attr('fill', c => (isMale(c) ? '#EDF3FB' : '#FBEDF3'))
    .attr('stroke', c => (isMale(c) ? '#7BA3CF' : '#CD8AA4'))
    .attr('stroke-width', 1.6)

  // 姓氏圆徽章
  card.append('circle')
    .attr('cx', CARD_W / 2)
    .attr('cy', 27)
    .attr('r', 15)
    .attr('fill', '#F3E2E0')
    .attr('stroke', '#E2CCC6')
    .attr('stroke-width', 1)
  card.append('text')
    .text(c => scaleX(c))
    .attr('text-anchor', 'middle')
    .attr('x', CARD_W / 2)
    .attr('y', 32)
    .attr('font-size', '13px')
    .attr('font-weight', '600')
    .attr('fill', '#B4442E')

  // 姓名
  card.append('text')
    .text(c => c.member.name)
    .attr('text-anchor', 'middle')
    .attr('x', CARD_W / 2)
    .attr('y', 60)
    .attr('font-size', '12.5px')
    .attr('font-weight', '500')
    .attr('fill', '#2B2119')

  // 出生年
  card.append('text')
    .text(c => (c.member.birthYear ? `${c.member.birthYear}年生` : ''))
    .attr('text-anchor', 'middle')
    .attr('x', CARD_W / 2)
    .attr('y', 78)
    .attr('font-size', '10px')
    .attr('fill', '#8A7A66')

  // 夫妻波浪线（两卡间隙中心）
  const wave = node.filter(d => !d.data.virtual && d.data.members.length > 1)
  wave.append('path')
    .attr('d', () => {
      const wy = CARD_H * 0.34
      return `M-8,${wy} q4,-4 8,0 q4,4 8,0`
    })
    .attr('fill', 'none')
    .attr('stroke', '#B4442E')
    .attr('stroke-width', 1.6)
    .attr('stroke-linecap', 'round')
    .attr('opacity', 0.75)

  // 缩放 + 拖拽（初始自适应：整棵树缩放到屏幕宽度内）
  const zoom = d3.zoom()
    .scaleExtent([0.3, 2.2])
    .on('zoom', event => g.attr('transform', event.transform))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const treeW = maxX - minX + 260
  const initScale = Math.min(1, Math.max(0.3, (width - 24) / treeW))
  svg.call(zoom)
  svg.call(
    zoom.transform,
    d3.zoomIdentity
      .translate(width / 2 - ((minX + maxX) / 2) * initScale, 60)
      .scale(initScale)
  )
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

  const fields = () => ({
    name: newMember.value.name,
    gender: newMember.value.gender || '未知',
    birthYear: parseInt(newMember.value.birthYear) || null,
    hometown: newMember.value.hometown,
    occupation: newMember.value.occupation,
    bio: (newMember.value.bio || '').trim(),
    events: (newMember.value.events || [])
      .filter(e => e.year || (e.text && e.text.trim()))
      .map(e => ({ year: e.year || '', text: (e.text || '').trim() })),
    color: newMember.value.gender === '女' ? '#9C5B6B' : '#4A6B7C'
  })

  if (editingId.value != null) {
    // 编辑：更新现有成员
    const node = graphData.value.nodes.find(n => n.id === editingId.value)
    if (node) Object.assign(node, fields())
    showToast('已保存')
  } else {
    // 用时间戳生成 id，避免 Math.max 遇到非数字 id 产生 NaN
    graphData.value.nodes.push({ id: Date.now(), ...fields() })
    showToast('添加成功')
  }

  saveGraphData() // 保存到 localStorage
  showAddMember.value = false
  editingId.value = null
  newMember.value = { name: '', gender: '', birthYear: '', hometown: '', occupation: '', bio: '', events: [] }

  await nextTick()
  if (viewMode.value === 'tree') renderTree()
  else renderGraph()
}

// ---------- 编辑 / 删除成员 ----------
const editingId = ref(null)

const openAddMember = () => {
  editingId.value = null
  newMember.value = { name: '', gender: '', birthYear: '', hometown: '', occupation: '', bio: '', events: [] }
  showAddMember.value = true
}

// 弹窗关闭（含点遮罩/取消）时清理编辑态
watch(showAddMember, v => {
  if (!v) editingId.value = null
})

const openEditMember = () => {
  const m = selectedMember.value
  if (!m) return
  editingId.value = m.id
  newMember.value = {
    name: m.name || '',
    gender: m.gender === '未知' ? '' : (m.gender || ''),
    birthYear: m.birthYear || '',
    hometown: m.hometown || '',
    occupation: m.occupation || '',
    bio: m.bio || '',
    events: (m.events || []).map(e => ({ year: String(e.year || ''), text: e.text || '' }))
  }
  showMemberDetail.value = false
  showAddMember.value = true
}

const onDeleteMember = () => {
  const m = selectedMember.value
  if (!m) return
  const relCount = graphData.value.edges.filter(e => {
    const s = typeof e.source === 'object' ? e.source.id : e.source
    const t = typeof e.target === 'object' ? e.target.id : e.target
    return s === m.id || t === m.id
  }).length

  showConfirmDialog({
    title: '删除成员',
    message: relCount
      ? `确定删除「${m.name}」吗？\n与 TA 相关的 ${relCount} 条关系也会一并删除。`
      : `确定删除「${m.name}」吗？`,
    confirmButtonText: '删除',
    confirmButtonColor: '#B4442E'
  })
    .then(() => {
      graphData.value.nodes = graphData.value.nodes.filter(n => n.id !== m.id)
      graphData.value.edges = graphData.value.edges.filter(e => {
        const s = typeof e.source === 'object' ? e.source.id : e.source
        const t = typeof e.target === 'object' ? e.target.id : e.target
        return s !== m.id && t !== m.id
      })
      saveGraphData()
      showMemberDetail.value = false
      selectedMember.value = null
      showToast('已删除')
      nextTick(() => (viewMode.value === 'tree' ? renderTree() : renderGraph()))
    })
    .catch(() => {})
}

// ---------- 详情：时间线与照片 ----------
const addEventRow = () => {
  newMember.value.events.push({ year: '', text: '' })
}

const detailEvents = computed(() => (selectedMember.value?.events || []))

const detailPhotos = ref([]) // [{ filename, url }]
const photoInput = ref(null)

// 打开详情时换签名链接显示照片
watch([showMemberDetail, selectedMember], async ([show]) => {
  if (!show) return
  const m = selectedMember.value
  detailPhotos.value = []
  const names = (m?.photos || []).filter(Boolean)
  for (const filename of names) {
    const url = await resolveMediaUrl(filename)
    if (url) detailPhotos.value.push({ filename, url })
  }
})

const pickPhoto = () => photoInput.value?.click()

const onPhotoSelect = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  const m = selectedMember.value
  if (!m) return

  showToast('正在上传…')
  const result = await uploadMedia(file, 'image')
  if (!result.success) {
    showToast(result.message || '上传失败')
    event.target.value = ''
    return
  }

  const filename = result.filename
  if (!filename) {
    showToast('上传返回异常')
    event.target.value = ''
    return
  }

  if (!Array.isArray(m.photos)) m.photos = []
  m.photos.push(filename)
  saveGraphData()
  const url = await resolveMediaUrl(filename)
  if (url) detailPhotos.value.push({ filename, url })
  showToast('已上传')
  event.target.value = ''
}

const confirmRemovePhoto = (ph) => {
  const m = selectedMember.value
  if (!m) return
  showConfirmDialog({
    title: '删除照片',
    message: '确定从这位成员的相册中移除这张照片吗？',
    confirmButtonText: '删除',
    confirmButtonColor: '#B4442E'
  })
    .then(() => {
      m.photos = (m.photos || []).filter(f => f !== ph.filename)
      detailPhotos.value = detailPhotos.value.filter(p => p.filename !== ph.filename)
      saveGraphData()
      showToast('已删除')
    })
    .catch(() => {})
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

.legend-wave {
  color: #B4442E;
  font-size: 15px;
  font-weight: 600;
  line-height: 1;
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
  overflow-y: auto;
  height: 100%;
  box-sizing: border-box;
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

.detail-bio h4,
.detail-timeline h4,
.detail-photos h4 {
  margin: 14px 4px 8px;
  font-size: 13px;
  color: var(--fv-ink-2);
  font-weight: 600;
}

.detail-bio p {
  margin: 0 4px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--fv-ink);
  white-space: pre-wrap;
}

.detail-timeline {
  position: relative;
  margin: 0 4px;
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 10px;
  padding: 0 0 12px 14px;
  border-left: 2px solid #E5D9C7;
  margin-left: 6px;
}

.timeline-item:last-child {
  border-left-color: transparent;
}

.timeline-item::before {
  content: '';
  position: absolute;
  left: -5px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #B4442E;
}

.tl-year {
  font-size: 12px;
  font-weight: 700;
  color: #B4442E;
  min-width: 34px;
  font-variant-numeric: tabular-nums;
}

.tl-text {
  font-size: 13px;
  color: var(--fv-ink);
  line-height: 1.5;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin: 0 4px;
}

.photo-cell {
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #F0E8DA;
}

.photo-cell img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.events-editor {
  margin: 12px 16px 0;
}

.event-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.event-row :deep(.van-cell) {
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--fv-surface-soft);
}

.event-year {
  width: 84px;
  flex: none;
}

.event-text {
  flex: 1;
}

.event-del {
  flex: none;
  color: #B98A7E;
  font-size: 16px;
  padding: 6px;
}

.detail-actions-row {
  display: flex;
  gap: 10px;
}

.detail-actions-row .van-button {
  flex: 1;
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
