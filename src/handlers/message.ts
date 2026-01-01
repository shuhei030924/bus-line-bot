import { MessageEvent, TextEventMessage } from '@line/bot-sdk';
import { findOrCreateUser, getUserSettings } from '../services/user';
import { findNextBuses, findBusesToArriveBy } from '../services/schedule';
import { parseIntent } from '../services/nlp';
import { createNotification } from '../services/notification';
import {
  replyMessage,
  createBusScheduleMessage,
  createSettingsMenu,
  createMainMenu,
  createHelpMessage,
} from '../services/line';

/**
 * テキストメッセージを処理
 */
export async function handleMessage(event: MessageEvent) {
  const userId = event.source.userId;
  if (!userId) return;

  if (event.message.type !== 'text') return;

  const text = (event.message as TextEventMessage).text;

  // ユーザーを取得または作成
  await findOrCreateUser(userId);
  const settings = await getUserSettings(userId);

  if (!settings) return;

  // 意図を解析
  const intent = parseIntent(text);

  switch (intent.type) {
    case 'search_outbound': {
      const buses = findNextBuses(
        'outbound',
        settings.outboundDeparture,
        settings.outboundArrival,
        2
      );
      const message = createBusScheduleMessage(
        'outbound',
        settings.outboundDeparture,
        settings.outboundArrival,
        buses
      );
      await replyMessage(event.replyToken, [message]);
      break;
    }

    case 'search_inbound': {
      const buses = findNextBuses(
        'inbound',
        settings.inboundDeparture,
        settings.inboundArrival,
        2
      );
      const message = createBusScheduleMessage(
        'inbound',
        settings.inboundDeparture,
        settings.inboundArrival,
        buses
      );
      await replyMessage(event.replyToken, [message]);
      break;
    }

    case 'arrive_by': {
      const direction = intent.direction;
      const departureStop = direction === 'outbound' 
        ? settings.outboundDeparture 
        : settings.inboundDeparture;
      const arrivalStop = direction === 'outbound' 
        ? settings.outboundArrival 
        : settings.inboundArrival;

      const buses = findBusesToArriveBy(
        direction,
        departureStop,
        arrivalStop,
        intent.time,
        new Date(), // 今日
        2
      );

      if (buses.length === 0) {
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `${intent.time}までに到着するバスは見つかりませんでした。`,
          },
        ]);
      } else {
        const message = createBusScheduleMessage(
          direction,
          departureStop,
          arrivalStop,
          buses
        );
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `${intent.time}までに到着するバス:`,
          },
          message,
        ]);
      }
      break;
    }

    case 'depart_at': {
      // 指定時刻以降のバスを検索
      const direction = intent.direction;
      const departureStop = direction === 'outbound' 
        ? settings.outboundDeparture 
        : settings.inboundDeparture;
      const arrivalStop = direction === 'outbound' 
        ? settings.outboundArrival 
        : settings.inboundArrival;

      const buses = findNextBuses(direction, departureStop, arrivalStop, 2);
      const message = createBusScheduleMessage(
        direction,
        departureStop,
        arrivalStop,
        buses
      );
      await replyMessage(event.replyToken, [message]);
      break;
    }

    case 'settings': {
      const menu = createSettingsMenu();
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'notification': {
      // 通知を設定
      const now = new Date();
      const [hours, minutes] = intent.time.split(':').map(Number);
      const notifyAt = new Date(now);
      notifyAt.setHours(hours, minutes, 0, 0);

      // 既に過ぎていたら翌日に設定
      if (notifyAt <= now) {
        notifyAt.setDate(notifyAt.getDate() + 1);
      }

      await createNotification(userId, 'outbound', notifyAt);

      const dateStr = notifyAt.toLocaleDateString('ja-JP', {
        month: 'long',
        day: 'numeric',
      });
      const timeStr = notifyAt.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });

      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `⏰ ${dateStr} ${timeStr} に通知をセットしました！`,
        },
      ]);
      break;
    }

    case 'help': {
      const helpMessage = createHelpMessage();
      await replyMessage(event.replyToken, [helpMessage]);
      break;
    }

    case 'unknown':
    default: {
      // メニューボタンを表示
      const menu = createMainMenu();
      await replyMessage(event.replyToken, [menu]);
      break;
    }
  }
}
