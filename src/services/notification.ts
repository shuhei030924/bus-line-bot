import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendTextMessage, createBusScheduleMessage, client } from './line';
import { findNextBuses } from './schedule';

/**
 * 通知を作成
 */
export async function createNotification(
  lineUserId: string,
  direction: 'outbound' | 'inbound',
  notifyAt: Date
) {
  const user = await prisma.user.findUnique({ where: { lineUserId } });
  if (!user) return null;

  return prisma.notification.create({
    data: {
      userId: user.id,
      direction,
      notifyAt,
      isOneTime: true,
      status: 'pending',
    },
  });
}

/**
 * 通知をキャンセル
 */
export async function cancelNotifications(lineUserId: string) {
  const user = await prisma.user.findUnique({ where: { lineUserId } });
  if (!user) return;

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      status: 'pending',
    },
    data: {
      status: 'cancelled',
    },
  });
}

/**
 * 特定の通知を削除
 */
export async function deleteNotification(notificationId: string) {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: 'cancelled' },
  });
}

/**
 * 保留中の通知を取得
 */
export async function getPendingNotifications(lineUserId: string) {
  const user = await prisma.user.findUnique({ where: { lineUserId } });
  if (!user) return [];

  return prisma.notification.findMany({
    where: {
      userId: user.id,
      status: 'pending',
    },
    orderBy: {
      notifyAt: 'asc',
    },
  });
}

/**
 * 通知を処理
 */
async function processNotifications() {
  const now = new Date();

  // 現在時刻の通知を取得
  const notifications = await prisma.notification.findMany({
    where: {
      status: 'pending',
      notifyAt: {
        lte: now,
      },
    },
    include: {
      user: {
        include: {
          settings: true,
        },
      },
    },
  });

  for (const notification of notifications) {
    try {
      const { user } = notification;

      // シンプルなリマインダーメッセージだけ送信
      await client.pushMessage(user.lineUserId, [
        {
          type: 'text',
          text: '⏰ 通知時間になりました！',
        },
      ]);

      // ステータスを更新
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'sent' },
      });
    } catch (error) {
      console.error('Notification error:', error);
    }
  }
}

/**
 * 通知スケジューラーを開始
 */
export function startNotificationScheduler() {
  // 毎分チェック
  cron.schedule('* * * * *', () => {
    processNotifications().catch(console.error);
  });

  console.log('Notification scheduler started');
}
