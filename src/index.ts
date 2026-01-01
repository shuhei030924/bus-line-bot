import express from 'express';
import { config } from './config/env';
import { webhookController, healthController } from './controllers/webhook';
import { startNotificationScheduler } from './services/notification';

const app = express();

// LINE Webhook用に生のボディを保存（署名検証に必要）
app.use('/webhook', express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// その他のルート用JSONパーサー
app.use(express.json());

// ルート
app.get('/', healthController);
app.get('/health', healthController);
app.post('/webhook', webhookController);

// サーバー起動
app.listen(config.port, () => {
  console.log(`🚌 Bus LINE Bot server is running on port ${config.port}`);
  
  // 通知スケジューラーを開始
  startNotificationScheduler();
});
