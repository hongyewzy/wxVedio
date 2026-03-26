# 使用 Node.js 官方镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 server 目录下的 package.json 和 package-lock.json
COPY server/package*.json ./

# 安装依赖
RUN npm install --production

# 复制 server 目录下的应用代码
COPY server/src/ ./src/

# 暴露端口
EXPOSE 8080

# 启动应用
CMD ["node", "src/index.js"]
