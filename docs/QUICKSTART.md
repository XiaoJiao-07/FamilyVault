# FamilyVault 快速开始指南

## 环境准备

### 1. 安装 Node.js
确保你的电脑已安装 Node.js 18.x 或更高版本。

检查版本：
```bash
node -v
npm -v
```

### 2. 克隆项目
```bash
cd Desktop/My.Git.Repo
git clone https://github.com/XiaoJiao-07/FamilyVault.git
cd FamilyVault
```

## 安装依赖

```bash
# 在项目根目录执行
npm install
```

这会自动安装前端和后端的所有依赖。

## 配置环境变量

### 后端配置

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件，填入你的 API Key：

```env
# AI 服务（二选一或都配）
DOUBAO_API_KEY=你的豆包API密钥
DOUBAO_MODEL=你的模型名称

QWEN_API_KEY=你的通义千问API密钥
QWEN_MODEL=qwen-turbo

# Whisper 语音转文字（可选）
WHISPER_API_URL=http://localhost:8080/inference
```

**如何获取 API Key：**
- 豆包：https://console.volcengine.com/ark/
- 通义千问：https://dashscope.console.aliyun.com/

## 启动项目

### 方式一：同时启动前后端（推荐）

```bash
# 在项目根目录
npm run dev
```

这会同时启动：
- 前端：http://localhost:5173
- 后端：http://localhost:3000

### 方式二：分别启动

**终端 1 - 启动后端：**
```bash
cd server
npm run dev
```

**终端 2 - 启动前端：**
```bash
cd client
npm run dev
```

## 访问应用

打开浏览器（推荐 Edge 或 Chrome），访问：

```
http://localhost:5173
```

你应该能看到 FamilyVault 的首页。

## 手机访问

### 方式一：同一局域网

1. 确保手机和电脑在同一 WiFi 下
2. 查看电脑的局域网 IP（如 192.168.1.100）
3. 手机浏览器访问：`http://192.168.1.100:5173`

### 方式二：内网穿透（推荐开发时使用）

使用 ngrok 或其他内网穿透工具：

```bash
# 安装 ngrok 后
ngrok http 5173
```

然后用生成的公网链接在手机上访问。

## 功能测试

### 1. 创建采访对象
- 点击"开始第一次采访"
- 输入采访对象信息（如"爸爸"、55岁、"湖北武汉"）

### 2. 开始采访
- 点击"开始录音"按钮
- AI 会自动生成第一个话题
- 模拟录音完成后，AI 会继续追问

### 3. 查看家族图谱
- 底部导航切换到"图谱"
- 目前显示空状态，需要采访后才会生成数据

## 常见问题

### Q: 前端页面打不开？
A: 检查后端是否启动成功，终端应显示 `🚀 FamilyVault Server running on http://localhost:3000`

### Q: AI 采访没有回复？
A: 检查 `.env` 文件中是否正确配置了 API Key。未配置时会使用模拟数据。

### Q: 手机无法访问？
A: 确保手机和电脑在同一网络，或者使用内网穿透工具。

### Q: 数据库文件在哪里？
A: 本地数据库存储在 `data/database.sqlite`，已被 `.gitignore` 忽略。

## 下一步

- 阅读 `README.md` 了解完整功能
- 查看 `docs/API.md` 了解后端接口
- 开始你的第一次家族采访！

---

**趁老人还能说，把家族故事永久保存下来。**