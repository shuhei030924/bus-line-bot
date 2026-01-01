import { PostbackEvent } from '@line/bot-sdk';
import { getUserSettings, updateUserSettings } from '../services/user';
import { findNextBuses, findBusesToArriveBy, getBusStops } from '../services/schedule';
import {
  replyMessage,
  createBusScheduleMessage,
  createSettingsMenu,
  createBusStopSelectMenu,
  createTimeSearchMenu,
  createNotificationListMenu,
  createCustomSearchMenu,
  createOutboundDepartureSelectMenu,
  createInboundArrivalSelectMenu,
  createHelpMessage,
} from '../services/line';
import { createNotification, getPendingNotifications, cancelNotifications, deleteNotification } from '../services/notification';

/**
 * ポストバックイベントを処理
 */
export async function handlePostback(event: PostbackEvent) {
  console.log('=== handlePostback called ===');
  console.log('Postback data:', event.postback.data);
  
  const userId = event.source.userId;
  if (!userId) {
    console.log('No userId');
    return;
  }

  const data = new URLSearchParams(event.postback.data);
  const action = data.get('action');
  console.log('Action:', action);

  const settings = await getUserSettings(userId);
  if (!settings) {
    console.log('No user settings found');
    return;
  }
  console.log('User settings:', JSON.stringify(settings));

  switch (action) {
    case 'search': {
      console.log('Processing search action');
      const direction = data.get('direction') as 'outbound' | 'inbound';
      const departureStop = direction === 'outbound' 
        ? settings.outboundDeparture 
        : settings.inboundDeparture;
      const arrivalStop = direction === 'outbound' 
        ? settings.outboundArrival 
        : settings.inboundArrival;
      console.log(`Direction: ${direction}, From: ${departureStop}, To: ${arrivalStop}`);

      const buses = findNextBuses(direction, departureStop, arrivalStop, 2);
      console.log('Buses found:', buses.length);
      
      const message = createBusScheduleMessage(
        direction,
        departureStop,
        arrivalStop,
        buses
      );

      console.log('Sending reply...');
      await replyMessage(event.replyToken, [message]);
      console.log('Reply sent successfully');
      break;
    }

    case 'settings': {
      const menu = createSettingsMenu();
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'show_settings': {
      await replyMessage(event.replyToken, [
        {
          type: 'text',
          text: `📍 現在の設定\n\n🚌 行き\n  乗車: ${settings.outboundDeparture}\n  降車: ${settings.outboundArrival}\n\n🏠 帰り\n  乗車: ${settings.inboundDeparture}\n  降車: ${settings.inboundArrival}`,
        },
      ]);
      break;
    }

    case 'change_stop': {
      const target = data.get('target');
      let direction: 'outbound' | 'inbound' = 'outbound';
      let stopType = 'departure';
      let promptText = '';

      switch (target) {
        case 'outbound_departure':
          direction = 'outbound';
          stopType = 'departure';
          promptText = '🚌 行きの乗車バス停を選んでください';
          break;
        case 'outbound_arrival':
          direction = 'outbound';
          stopType = 'arrival';
          promptText = '🚌 行きの降車バス停を選んでください';
          break;
        case 'inbound_departure':
          direction = 'inbound';
          stopType = 'departure';
          promptText = '🏠 帰りの乗車バス停を選んでください';
          break;
        case 'inbound_arrival':
          direction = 'inbound';
          stopType = 'arrival';
          promptText = '🏠 帰りの降車バス停を選んでください';
          break;
      }

      const stops = getBusStops(direction);
      const menu = createBusStopSelectMenu(stops, `set_${target}`, promptText);
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'set_outbound_departure': {
      const stop = data.get('stop');
      if (stop) {
        await updateUserSettings(userId, { outboundDeparture: stop });
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `✅ 行きの乗車バス停を「${stop}」に変更しました！`,
          },
        ]);
      }
      break;
    }

    case 'set_outbound_arrival': {
      const stop = data.get('stop');
      if (stop) {
        await updateUserSettings(userId, { outboundArrival: stop });
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `✅ 行きの降車バス停を「${stop}」に変更しました！`,
          },
        ]);
      }
      break;
    }

    case 'set_inbound_departure': {
      const stop = data.get('stop');
      if (stop) {
        await updateUserSettings(userId, { inboundDeparture: stop });
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `✅ 帰りの乗車バス停を「${stop}」に変更しました！`,
          },
        ]);
      }
      break;
    }

    case 'set_inbound_arrival': {
      const stop = data.get('stop');
      if (stop) {
        await updateUserSettings(userId, { inboundArrival: stop });
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `✅ 帰りの降車バス停を「${stop}」に変更しました！`,
          },
        ]);
      }
      break;
    }

    case 'time_search_menu': {
      const menu = createTimeSearchMenu();
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'arrive_by': {
      const direction = data.get('direction') as 'outbound' | 'inbound';
      const params = event.postback.params as { datetime?: string; date?: string; time?: string } | undefined;
      const datetime = params?.datetime; // "2026-01-02T09:00" format
      
      console.log('arrive_by params:', params);
      console.log('datetime:', datetime);
      
      if (!datetime) {
        await replyMessage(event.replyToken, [
          { type: 'text', text: '日時を選択してください' },
        ]);
        break;
      }

      // datetimeから日付と時刻を取得
      const targetDate = new Date(datetime);
      const time = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;

      console.log('targetDate:', targetDate);
      console.log('time:', time);

      const departureStop = direction === 'outbound' 
        ? settings.outboundDeparture 
        : settings.inboundDeparture;
      const arrivalStop = direction === 'outbound' 
        ? settings.outboundArrival 
        : settings.inboundArrival;

      console.log('departureStop:', departureStop, 'arrivalStop:', arrivalStop);

      const buses = findBusesToArriveBy(direction, departureStop, arrivalStop, time, targetDate, 2);
      
      console.log('buses found:', buses);

      const dateStr = targetDate.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });

      if (buses.length === 0) {
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `${dateStr} ${time}までに到着するバスは見つかりませんでした。`,
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
            text: `⏰ ${dateStr} ${time}までに到着するバス:`,
          },
          message,
        ]);
      }
      break;
    }

    case 'set_notification': {
      const direction = data.get('direction') as 'outbound' | 'inbound';
      const params = event.postback.params as { datetime?: string } | undefined;
      const datetime = params?.datetime;
      
      if (!datetime) {
        await replyMessage(event.replyToken, [
          { type: 'text', text: '日時を選択してください' },
        ]);
        break;
      }

      const notifyAt = new Date(datetime);
      const now = new Date();

      // 過去の日時は設定できない
      if (notifyAt <= now) {
        await replyMessage(event.replyToken, [
          { type: 'text', text: '過去の日時は設定できません。' },
        ]);
        break;
      }

      await createNotification(userId, direction, notifyAt);

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
          text: `🔔 ${dateStr} ${timeStr} にリマインダーをセットしました！`,
        },
      ]);
      break;
    }

    case 'list_notifications': {
      const notifications = await getPendingNotifications(userId);
      const menu = createNotificationListMenu(notifications);
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'delete_notification': {
      const notificationId = data.get('id');
      if (notificationId) {
        await deleteNotification(notificationId);
        await replyMessage(event.replyToken, [
          { type: 'text', text: '🗑️ 通知を削除しました' },
        ]);
      }
      break;
    }

    case 'delete_all_notifications': {
      await cancelNotifications(userId);
      await replyMessage(event.replyToken, [
        { type: 'text', text: '🗑️ すべての通知を削除しました' },
      ]);
      break;
    }

    case 'custom_search_menu': {
      const menu = createCustomSearchMenu();
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'custom_outbound_departure': {
      // 行き: 出発駅を選択（到着は会社固定）
      const stops = getBusStops('outbound');
      // 会社を除外（会社から会社への移動はないため）
      const departureStops = stops.filter(s => s !== '会社');
      const menu = createOutboundDepartureSelectMenu(departureStops);
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'custom_inbound_arrival': {
      // 帰り: 到着駅を選択（出発は会社固定）
      const stops = getBusStops('inbound');
      // 会社を除外（会社から会社への移動はないため）
      const arrivalStops = stops.filter(s => s !== '会社');
      const menu = createInboundArrivalSelectMenu(arrivalStops);
      await replyMessage(event.replyToken, [menu]);
      break;
    }

    case 'custom_arrive_by': {
      const direction = data.get('direction') as 'outbound' | 'inbound';
      const departureStop = decodeURIComponent(data.get('departure') || '');
      const arrivalStop = decodeURIComponent(data.get('arrival') || '');
      const params = event.postback.params as { datetime?: string } | undefined;
      const datetime = params?.datetime;

      if (!datetime) {
        await replyMessage(event.replyToken, [
          { type: 'text', text: '日時を選択してください' },
        ]);
        break;
      }

      const targetDate = new Date(datetime);
      const time = `${String(targetDate.getHours()).padStart(2, '0')}:${String(targetDate.getMinutes()).padStart(2, '0')}`;

      const buses = findBusesToArriveBy(direction, departureStop, arrivalStop, time, targetDate, 2);

      const dateStr = targetDate.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
      });

      if (buses.length === 0) {
        await replyMessage(event.replyToken, [
          {
            type: 'text',
            text: `${dateStr} ${time}までに${arrivalStop}に到着するバスは見つかりませんでした。`,
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
            text: `⏰ ${dateStr} ${time}までに到着するバス:`,
          },
          message,
        ]);
      }
      break;
    }

    case 'help': {
      const helpMessage = createHelpMessage();
      await replyMessage(event.replyToken, [helpMessage]);
      break;
    }

    default:
      break;
  }
}
