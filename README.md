<div align="center">

# 🏛️ FamilyVault · 家史馆

### 开源家庭记忆操作系统

**用 AI 帮你留住家族故事、方言、菜谱和人生经验**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![GitHub stars](https://img.shields.io/github/stars/XiaoJiao-07/FamilyVault.svg?style=social&label=Star)](https://github.com/XiaoJiao-07/FamilyVault)
[![GitHub forks](https://img.shields.io/github/forks/XiaoJiao-07/FamilyVault.svg?style=social&label=Fork)](https://github.com/XiaoJiao-07/FamilyVault)

[🚀 快速开始](#-快速开始) · [📖 功能介绍](#-核心功能) · [🛠️ 技术栈](#️-技术栈) · [🤝 贡献指南](#-贡献指南)

**趁老人还能说，把家族故事永久保存下来。**

</div>

---

## 📌 为什么做这个项目？

> 中国每年消失约 **10 万种**地方口述传统。老人去世后，家族故事、方言、习俗永远消失。

现有家谱软件只记名字和关系，不记"人"本身。**FamilyVault** 要把家族故事变成一个**可查询、可交互的知识图谱**，让记忆不再只是躺在相册里的老照片。

### 💡 核心洞察

- **情感刚需**：每个人都想留住家人的故事，但不知道从何问起
- **技术可行**：AI 语音识别 + 知识图谱 + 大语言模型已经成熟
- **市场空白**：GitHub 上没有开源的家族记忆知识图谱项目
- **传播潜力**：春节/重阳节回家给爸妈装上，天然裂变

---

## ✨ 核心功能

### 1. 🎙️ AI 采访员

**智能引导，让记录变得简单**

- 根据老人年龄、籍贯、经历，**自动生成采访话题**
- 支持语音录音 + 实时转文字
- 方言识别（粤语、闽南语、四川话等）
- 像聊天一样自然，不像采访那样生硬

**示例对话：**
```
AI: 爸，您小时候过年都吃什么？有没有什么特别的年菜？
老人: 那时候穷，能吃到肉就不错了。你奶奶做的红烧肉...
AI: 奶奶的红烧肉有什么秘诀吗？您还记得她怎么做的吗？
```

### 2. 🌳 家族知识图谱

**可查询的家族记忆网络**

- 从对话中自动提取人物、地点、时间、事件
- 构建可视化的家族关系网络
- 支持自然语言查询

**你可以问：**
- "大舅当年在哪里当兵？"
- "爷爷奶奶是怎么认识的？"
- "家里谁去过北京？"

### 3. 🗺️ 记忆地图

**家族迁徙轨迹可视化**

- 在地图上标注每个故事的发生地
- 可视化家族迁徙路线
- 按时间轴筛选不同年代的记忆

### 4. 💊 时光胶囊

**给未来的人录一段话**

- 录制语音/视频/文字消息
- 设定未来日期解锁（如 2050 年）
- 端到端加密，到时间自动推送

**使用场景：**
- 给未来的孙子录一段话
- 给结婚周年的伴侣留个惊喜
- 给 10 年后的自己写封信

### 5. 📜 传家宝模块

**保存家族的智慧和精神**

- 家传菜谱（奶奶的红烧肉做法）
- 祖传手艺（木工、编织、书法）
- 家训格言（家族精神传承）
- 支持图文 + 音频 + 视频多媒体

---

---

## 📊 当前状态（诚实版）

> 上面的「核心功能」是产品愿景。下面是目前**真实可用**的部分，欢迎按 ROADMAP 认领开发。

| 能力 | 状态 | 说明 |
|------|------|------|
| 账号注册/登录 | ✅ 可用 | JWT + bcrypt，登录失败限流，防账号枚举 |
| 家庭空间 | ✅ 可用 | 邀请码把家人拉进同一个家，数据按家庭隔离共享 |
| 云端同步 | ✅ 可用 | 数据自动同步到服务端，换设备不丢，断网可离线记账 |
| 冲突保护 | ✅ 可用 | 家人同时编辑时按 id 合并，不互相覆盖 |
| AI 采访 | ⚠️ 演示模式 | 未配置 DOUBAO/QWEN key 时使用内置话题池；配置后为真实 AI 引导 |
| 语音转文字 | ⚠️ 依赖环境 | 需配置 Whisper API，浏览器内识别视设备而定 |
| 家族图谱 | ✅ 可用 | 本地创建成员与关系，D3 可视化，数据已上云 |
| 记忆地图 | ✅ 基础可用 | Leaflet 标点 + 时间轴 |
| 时光胶囊 | ✅ 基础可用 | 定时解锁逻辑在服务端，推送通知未实现 |
| 端到端加密 | ❌ 未实现 | 见 ROADMAP |
| 方言识别 | ❌ 未实现 | 见 ROADMAP |

---

## 🛠️ 技术栈

| 模块 | 技术 | 说明 |
|------|------|------|
| **前端** | Vue 3 + Vant UI | 移动端组件库，触摸友好 |
| **后端** | Node.js + Express | 轻量 RESTful API |
| **数据库** | SQLite (sql.js) | 单文件本地库，无需配置 |
| **语音转文字** | Whisper (本地/API) | 开源模型，数据不出设备 |
| **AI 采访引导** | 豆包/通义千问 API | 根据背景生成话题 |
| **知识图谱** | D3.js / vis.js | 交互式家族关系网 |
| **记忆地图** | Leaflet.js + 高德地图 | 免费开源地图引擎 |
| **时光胶囊** | Node.js 定时任务 + 加密 | 到时间自动通知 |

### 架构特点

- ✅ **家庭共享**：数据按家庭存储，家人共同书写同一份家史（本地缓存 + 云端同步）
- ✅ **离线可用**：核心功能不依赖网络
- ✅ **模块化设计**：前后端分离，易于扩展
- ✅ **开源免费**：MIT 许可证，可商用

---

## 🚀 快速开始

### 环境要求

- Node.js >= 18.x
- npm >= 9.x
- Git

### Docker 一键部署（推荐）

```bash
git clone https://github.com/XiaoJiao-07/FamilyVault.git
cd FamilyVault
JWT_SECRET=$(openssl rand -hex 32) docker compose up -d

# 首次启动会创建管理员并打印账号信息
docker logs familyvault
```

访问 `http://localhost:3000`（生产模式，单端口同时提供前端与 API）。

### 本地开发

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/XiaoJiao-07/FamilyVault.git
cd FamilyVault

# 2. 安装依赖
npm install

# 3. 配置环境变量
cd server
cp .env.example .env
# 编辑 .env 文件，填入你的 API Key（可选）

# 4. 启动开发环境（前后端同时启动）
cd ..
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

### 手机访问

**方式一：同一局域网**
1. 确保手机和电脑在同一 WiFi 下
2. 查看电脑的局域网 IP（如 192.168.1.100）
3. 手机浏览器访问：`http://192.168.1.100:5173`

**方式二：内网穿透（推荐开发时使用）**
```bash
# 使用 ngrok
ngrok http 5173
# 用生成的公网链接在手机上访问
```

---

## 📁 项目结构

```
FamilyVault/
├── client/                    # 前端 Vue 3 应用
│   ├── src/
│   │   ├── components/        # 可复用组件
│   │   ├── pages/             # 页面
│   │   │   ├── HomePage.vue       # 首页
│   │   │   ├── InterviewPage.vue  # AI 采访
│   │   │   ├── GraphPage.vue      # 家族图谱
│   │   │   ├── MapPage.vue        # 记忆地图
│   │   │   ├── CapsulePage.vue    # 时光胶囊
│   │   │   └── HeirloomPage.vue   # 传家宝
│   │   ├── stores/            # Pinia 状态管理
│   │   ├── services/          # API 调用封装
│   │   ├── utils/             # 工具函数
│   │   ├── router/            # 路由配置
│   │   ├── App.vue            # 主组件
│   │   └── main.js            # 入口文件
│   ├── public/
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
├── server/                    # 后端 Node.js 应用
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   │   ├── interview.js       # 采访相关
│   │   │   ├── graph.js           # 图谱相关
│   │   │   ├── capsule.js         # 时光胶囊
│   │   │   └── upload.js          # 文件上传
│   │   ├── services/          # 业务逻辑
│   │   │   ├── aiService.js       # AI 话题生成
│   │   │   └── whisperService.js  # 语音转文字
│   │   ├── models/            # 数据模型
│   │   │   └── database.js        # SQLite 数据库
│   │   ├── middleware/        # 中间件
│   │   ├── utils/             # 工具函数
│   │   └── app.js             # Express 入口
│   ├── package.json
│   └── .env.example
│
├── data/                      # 本地数据存储（gitignore）
│   ├── database.sqlite
│   └── uploads/
│
├── docs/                      # 项目文档
│   ├── QUICKSTART.md          # 快速开始指南
│   ├── API.md                 # API 文档
│   ├── DEPLOY.md              # 部署指南
│   └── CONTRIBUTING.md        # 贡献指南
│
├── package.json               # 根配置（workspaces）
├── .gitignore
├── LICENSE
└── README.md
```

---

## 📊 数据库设计

### 核心表结构

| 表名 | 说明 | 关键字段 |
|------|------|----------|
| `interviewees` | 采访对象 | name, age, hometown, relationship |
| `interview_sessions` | 采访会话 | interviewee_id, status, started_at |
| `messages` | 对话消息 | session_id, role, text, audio_url |
| `family_members` | 家族成员 | name, gender, birth_year, bio |
| `family_relationships` | 家族关系 | from_member_id, to_member_id, relationship_type |
| `memory_locations` | 记忆地点 | name, latitude, longitude, year |
| `time_capsules` | 时光胶囊 | from_person, to_person, unlock_date |
| `heirlooms` | 传家宝 | title, category, content, author_id |

详细 ER 图见 [docs/DATABASE.md](docs/DATABASE.md)

---

## 🔧 配置说明

### 环境变量

复制 `server/.env.example` 为 `server/.env`，配置以下参数：

```env
# AI 服务（二选一或都配）
DOUBAO_API_KEY=你的豆包API密钥
DOUBAO_MODEL=你的模型名称

QWEN_API_KEY=你的通义千问API密钥
QWEN_MODEL=qwen-turbo

# Whisper 语音转文字（可选）
WHISPER_API_URL=http://localhost:8080/inference

# 数据库
DATABASE_PATH=../data/database.sqlite

# JWT 密钥
JWT_SECRET=your_jwt_secret_change_this_in_production
```

### 如何获取 API Key

- **豆包 API**：https://console.volcengine.com/ark/
- **通义千问 API**：https://dashscope.console.aliyun.com/
- **Whisper**：可本地部署或使用 OpenAI API

未配置 API 时，系统会使用模拟数据，功能可正常体验。

---

## 📖 API 文档

### 采访模块

```bash
# 获取所有采访对象
GET /api/interview/interviewees

# 创建采访对象
POST /api/interview/interviewees
{
  "name": "爸爸",
  "age": 55,
  "hometown": "湖北武汉",
  "relationship": "父亲"
}

# 开始采访会话
POST /api/interview/sessions/start
{
  "intervieweeId": 1
}

# 发送消息
POST /api/interview/sessions/:sessionId/messages
{
  "text": "用户说的话",
  "audioUrl": "/uploads/xxx.mp3"
}
```

完整 API 文档见 [docs/API.md](docs/API.md)

---

## 🗺️ 开发路线图

### Phase 1: 最小闭环 ✅（第 1 周）
- [x] 基础页面框架（Vue 3 + Vant UI）
- [x] 采访对话界面
- [x] 后端 API 基础架构
- [x] SQLite 数据库设计
- [ ] 录音功能（调用设备麦克风）
- [ ] Whisper 语音转文字集成

### Phase 2: AI 采访员（第 2-3 周）
- [ ] 话题引导生成（根据老人背景）
- [ ] 实体提取（人物/地点/事件/时间）
- [ ] 豆包/通义千问 API 集成
- [ ] 对话历史管理

### Phase 3: 知识图谱（第 4 周）
- [ ] 家族关系建模
- [ ] D3.js 可视化
- [ ] 自然语言查询

### Phase 4: 记忆地图 + 时光胶囊（第 5 周）
- [ ] Leaflet.js 地图集成
- [ ] 记忆地点标注
- [ ] 迁徙路线可视化
- [ ] 时光胶囊定时任务

### Phase 5: 打磨发布（第 6 周）
- [ ] UI 优化
- [ ] 性能优化
- [ ] 文档完善
- [ ] Demo 视频
- [ ] GitHub 正式发布

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 如何贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 贡献方向

- 💻 **代码开发**：前端页面、后端 API、数据库优化
- 🎨 **UI/UX 设计**：界面美化、交互优化
- 📝 **文档完善**：README、API 文档、教程
- 🧪 **测试反馈**：功能测试、Bug 报告
- 🌍 **国际化**：多语言支持
- 🗣️ **方言支持**：方言语音识别模型训练

### 行为准则

- 尊重每一位贡献者
- 接受建设性批评
- 关注社区最佳实践
- 保持包容和友好的氛围

---

## ❓ 常见问题

### Q: 前端页面打不开？
A: 检查后端是否启动成功，终端应显示 `🚀 FamilyVault Server running on http://localhost:3000`

### Q: AI 采访没有回复？
A: 检查 `.env` 文件中是否正确配置了 API Key。未配置时会使用模拟数据。

### Q: 手机无法访问？
A: 确保手机和电脑在同一网络，或者使用内网穿透工具（如 ngrok）。

### Q: 数据库文件在哪里？
A: 本地数据库存储在 `data/database.sqlite`，已被 `.gitignore` 忽略。

### Q: 如何备份数据？
A: 定期复制 `data/` 目录即可。未来版本会支持导出功能。

### Q: 支持哪些方言？
A: 目前普通话识别最准确。方言支持需要额外训练模型，正在开发中。

---

## 📄 许可证

本项目采用 [MIT 许可证](LICENSE) 开源。

---

## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vant](https://vant-ui.github.io/vant/) - 轻量、可靠的移动端组件库
- [Whisper](https://github.com/openai/whisper) - OpenAI 开源语音识别模型
- [D3.js](https://d3js.org/) - 数据可视化库
- [Leaflet](https://leafletjs.com/) - 开源地图库

---

## 📮 联系方式

- 项目作者：[XiaoJiao-07](https://github.com/XiaoJiao-07)
- 问题反馈：[GitHub Issues](https://github.com/XiaoJiao-07/FamilyVault/issues)

---

<div align="center">

**如果这个项目对你有帮助，请给一个 ⭐️ Star 支持！**

**趁老人还能说，把家族故事永久保存下来。**

</div>