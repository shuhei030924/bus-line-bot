FROM node:20-slim

# OpenSSLが必要
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# package.jsonとpackage-lock.jsonをコピー
COPY package*.json ./
COPY prisma ./prisma/

# 依存関係をインストール
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# ポートを公開
EXPOSE 3000

# アプリケーションを起動
CMD ["npm", "start"]
