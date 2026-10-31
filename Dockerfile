# ---------- 构建阶段：安装全部依赖并构建前端 ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci --no-audit --no-fund

COPY client/ client/
RUN npm run build --workspace=client

# ---------- 运行阶段：只保留生产依赖 + 构建产物 ----------
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY client/package*.json client/
COPY server/package*.json server/
RUN npm ci --omit=dev --no-audit --no-fund

COPY server/ server/
COPY --from=build /app/client/dist client/dist

# 数据库与上传文件持久化目录
VOLUME ["/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server/src/app.js"]
