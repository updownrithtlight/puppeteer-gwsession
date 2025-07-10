FROM node:18-slim

# 安装 Puppeteer 所需的 Chromium 依赖
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgdk-pixbuf2.0-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libxext6 \
    libxss1 \
    libxfixes3 \
    libxrender1 \
    libxtst6 \
    libglib2.0-0 \
    libgbm1 \                    
    xdg-utils \
    --no-install-recommends && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# 环境变量（可自定义传入）
ENV SSO_USERNAME="your-default-username"
ENV SSO_PASSWORD="your-default-password"

CMD ["npm", "start"]
