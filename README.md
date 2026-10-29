# FamilyVault · 家史馆

> 开源家庭记忆操作系统 —— 用 AI 帮你留住家族故事、方言、菜谱和人生经验

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 为什么做这个项目？

中国每年消失约 10 万种地方口述传统。老人去世后，家族故事、方言、习俗永远消失。

现有家谱软件只记名字和关系，不记"人"本身。**FamilyVault** 要把家族故事变成一个**可查询、可交互的知识图谱**，让记忆不再只是躺在相册里的老照片。

## 核心功能

### 1. AI 采访员
- 根据老人年龄、籍贯、经历，**自动生成采访话题引导**
- 支持语音录音 + 实时转文字
- 方言识别（粤语、闽南语、四川话等）

### 2. 家族知识图谱
- 从对话中自动提取人物、地点、时间、事件
- 构建可查询的家族关系网络
- "大舅当年在哪里当兵？" → 秒级回答

### 3. 记忆地图
- 在地图上标注家族每个人的故事发生地
- 可视化家族迁徙路线
- 按时间轴筛选不同年代的记忆

### 4. 时光胶囊
- 给未来的孙子录一段话
- 设定 2050 年才能打开
- 端到端加密，到时间自动推送

### 5. 传家宝模块
- 家传菜谱（奶奶的红烧肉做法）
- 祖传手艺（木工、编织、书法）
- 家训格言（家族精神传承）

## 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| 前端 | Vue 3 + Vant UI | 移动端组件库，触摸友好 |
| 后端 | Node.js + Express | 轻量 RESTful API |
| 数据库 | SQLite (better-sqlite3) | 本地轻量，无需配置 |
| 语音转文字 | Whisper (本地/API) | 开源模型，数据不出设备 |
| AI 采访引导 | 豆包/通义千问 API | 根据背景生成话题 |
| 知识图谱 | D3.js / vis.js | 交互式家族关系网 |
| 记忆地图 | Leaflet.js + 高德地图 | 免费开源地图引擎 |
| 时光胶囊 | Node.js 定时任务 + 加密 | 到时间自动通知 |

## 快速开始

### 环境要求
- Node.js >= 18.x
- npm >= 9.x

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/XiaoJiao-07/FamilyVault.git
cd FamilyVault

# 2. 安装依赖
npm install

# 3. 启动开发环境（前后端同时启动）
npm run dev
```

访问 `http://localhost:5173` 查看前端页面。

### 单独启动

```bash
# 只启动后端
npm run dev:server

# 只启动前端
npm run dev:client
```

## 项目结构

```
FamilyVault/
├── client/              # 前端 Vue 3 应用
│   ├── src/
│   │   ├── components/  # 可复用组件
│   │   ├── pages/       # 页面（采访、图谱、地图等）
│   │   ├── stores/      # Pinia 状态管理
│   │   ├── services/    # API 调用封装
│   │   ├── utils/       # 工具函数
│   │   ├── App.vue
│   │   └── main.js
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/              # 后端 Node.js 应用
│   ├── src/
│   │   ├── routes/      # API 路由
│   │   ├── services/    # 业务逻辑（AI、语音、图谱）
│   │   ├── models/      # 数据模型
│   │   ├── middleware/  # 中间件
│   │   ├── utils/       # 工具函数
│   │   └── app.js       # Express 入口
│   ├── package.json
│   └── .env.example
│
├── data/                # 本地数据存储（gitignore）
│   ├── database.sqlite
│   └── uploads/
│
├── docs/                # 项目文档
│   ├── API.md
│   ├── DEPLOY.md
│   └── CONTRIBUTING.md
│
├── package.json         # 根配置（workspaces）
├── .gitignore
└── README.md
```

## 开发路线图

### Phase 1: 最小闭环（第 1 周）
- [ ] 基础页面框架（Vue 3 + Vant UI）
- [ ] 录音功能（调用设备麦克风）
- [ ] Whisper 语音转文字
- [ ] 基础展示页面

### Phase 2: AI 采访员（第 2-3 周）
- [ ] 话题引导生成（根据老人背景）
- [ ] 对话管理界面
- [ ] 实体提取（人物/地点/事件/时间）

### Phase 3: 知识图谱（第 4 周）
- [ ] 家族关系建模
- [ ] D3.js 可视化
- [ ] 查询功能

### Phase 4: 记忆地图 + 时光胶囊（第 5 周）
- [ ] 地图标注
- [ ] 迁徙路线
- [ ] 定时消息

### Phase 5: 打磨发布（第 6 周）
- [ ] UI 优化
- [ ] README 完善
- [ ] Demo 视频
- [ ] GitHub 发布

## 贡献指南

欢迎提交 Issue 和 Pull Request！

如果你也想留住家族记忆，欢迎加入这个项目。无论是代码、设计、文档还是测试，每一份贡献都很重要。

## License

[MIT](LICENSE) © 2026 XiaoJiao-07

---

**趁老人还能说，把家族故事永久保存下来。**