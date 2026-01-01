# バス時刻案内 LINE Bot

LINE Botでバスの時刻を簡単に確認できるサービスです。

## 機能

- 🚌 **行きのバス検索**: 会社行きの次のバス2本を表示
- 🏠 **帰りのバス検索**: 帰りの次のバス2本を表示（乗り場も表示）
- 🕐 **到着時刻指定**: 「9時に会社に着きたい」などの自然な入力に対応
- ⏰ **通知機能**: 指定時刻にバス情報を通知
- ⚙️ **設定変更**: 乗車・降車バス停を自由に変更

## セットアップ

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、以下を設定：

```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
```

### 3. データベースのセットアップ

```bash
npx prisma generate
npx prisma db push
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

### 5. 本番ビルド

```bash
npm run build
npm start
```

## LINE Developers設定

1. [LINE Developers](https://developers.line.biz/) でMessaging APIチャネルを作成
2. チャネルアクセストークンを発行
3. Webhook URLを設定: `https://your-domain.com/webhook`
4. Webhookの利用をオンに

## Railwayへのデプロイ

1. [Railway](https://railway.app/) でプロジェクトを作成
2. GitHubリポジトリを連携
3. PostgreSQLを追加
4. 環境変数を設定
5. デプロイ完了後、Webhook URLをLINE Developersに設定

## 対応バス停

### 行き（会社行き）
西条駅 → 中央公園前 → 西条昭和町 → 石ヶ瀬橋 → 西条小学校 → 江熊 → 図書館前 → ががら口 → 東中郷 → 会社

### 帰り（会社発）
会社 → 東中郷 → ががら口 → 図書館前 → 江熊 → 西条小学校 → 石ヶ瀬橋 → 西条昭和町 → 中央公園前 → 西条駅

## 使い方

| 入力 | 動作 |
|------|------|
| 行く | 会社行きの次のバス2本を表示 |
| 帰る | 帰りの次のバス2本を表示 |
| 9時に会社に着きたい | 9時までに到着するバスを表示 |
| 18時に通知して | 18時にバス情報を通知 |
| 設定 | バス停の変更メニューを表示 |

## 技術スタック

- Node.js / TypeScript
- Express.js
- Prisma (PostgreSQL)
- @line/bot-sdk
- node-cron（通知スケジューラー）
