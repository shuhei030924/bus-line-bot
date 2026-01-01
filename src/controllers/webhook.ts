import { Request, Response } from 'express';
import { WebhookEvent, validateSignature } from '@line/bot-sdk';
import { config } from '../config/env';
import { handleFollow } from '../handlers/follow';
import { handleMessage } from '../handlers/message';
import { handlePostback } from '../handlers/postback';

/**
 * LINE Webhookを処理
 */
export async function webhookController(req: Request, res: Response) {
  // 署名検証
  const signature = req.headers['x-line-signature'] as string;
  const body = JSON.stringify(req.body);

  if (!validateSignature(body, config.lineChannelSecret, signature)) {
    res.status(401).send('Invalid signature');
    return;
  }

  const events: WebhookEvent[] = req.body.events;

  // 各イベントを処理
  await Promise.all(
    events.map(async (event) => {
      try {
        switch (event.type) {
          case 'follow':
            await handleFollow(event);
            break;
          case 'message':
            await handleMessage(event);
            break;
          case 'postback':
            await handlePostback(event);
            break;
          default:
            console.log('Unhandled event type:', event.type);
        }
      } catch (error) {
        console.error('Error handling event:', error);
      }
    })
  );

  res.status(200).send('OK');
}

/**
 * ヘルスチェック
 */
export function healthController(req: Request, res: Response) {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
}
