import prisma from '../lib/prisma';
import { config } from '../config/env';

/**
 * ユーザーを作成または取得
 */
export async function findOrCreateUser(lineUserId: string, displayName?: string) {
  let user = await prisma.user.findUnique({
    where: { lineUserId },
    include: { settings: true },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        lineUserId,
        displayName,
        registrationStatus: 'pending',
        settings: {
          create: {
            outboundDeparture: config.defaults.outboundDeparture,
            outboundArrival: config.defaults.outboundArrival,
            inboundDeparture: config.defaults.inboundDeparture,
            inboundArrival: config.defaults.inboundArrival,
          },
        },
      },
      include: { settings: true },
    });
  }

  return user;
}

/**
 * ユーザーの登録ステータスを更新
 */
export async function updateRegistrationStatus(lineUserId: string, status: string) {
  return prisma.user.update({
    where: { lineUserId },
    data: { registrationStatus: status },
  });
}

/**
 * ユーザー設定を更新
 */
export async function updateUserSettings(
  lineUserId: string,
  settings: {
    outboundDeparture?: string;
    outboundArrival?: string;
    inboundDeparture?: string;
    inboundArrival?: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { lineUserId } });
  if (!user) return null;

  return prisma.userSettings.update({
    where: { userId: user.id },
    data: settings,
  });
}

/**
 * ユーザー設定を取得（存在しない場合は作成）
 */
export async function getUserSettings(lineUserId: string) {
  let user = await prisma.user.findUnique({
    where: { lineUserId },
    include: { settings: true },
  });
  
  // ユーザーが存在しない場合は自動作成
  if (!user) {
    console.log('User not found, creating new user:', lineUserId);
    user = await prisma.user.create({
      data: {
        lineUserId,
        registrationStatus: 'completed',
        settings: {
          create: {
            outboundDeparture: config.defaults.outboundDeparture,
            outboundArrival: config.defaults.outboundArrival,
            inboundDeparture: config.defaults.inboundDeparture,
            inboundArrival: config.defaults.inboundArrival,
          },
        },
      },
      include: { settings: true },
    });
  }
  
  return user?.settings;
}
