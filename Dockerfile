# 使用 Node.js 官方镜像
FROM node:18-alpine

# 设置工作目录
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install --production

# 复制应用代码
COPY src/ ./src/

# 暴露端口（与微信云托管配置一致）
EXPOSE 8080

# 启动应用
CMD ["node", "src/index.js"]
