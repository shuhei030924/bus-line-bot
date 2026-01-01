import { WebhookEvent, FollowEvent } from '@line/bot-sdk';
import { findOrCreateUser } from '../services/user';
import { replyMessage, createWelcomeMessage } from '../services/line';

/**
 * フォローイベント（友だち追加）を処理
 */
export async function handleFollow(event: FollowEvent) {
  const userId = event.source.userId;
  if (!userId) return;

  // ユーザーを作成
  await findOrCreateUser(userId);

  // ウェルカムメッセージを送信
  const welcomeMessage = createWelcomeMessage();

  await replyMessage(event.replyToken, [
    welcomeMessage,
    {
      type: 'text',
      text: '下のメニューから操作できます 👇',
    },
  ]);
}
