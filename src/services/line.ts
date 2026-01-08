import { Client, TextMessage, FlexMessage, FlexBox, FlexComponent, QuickReply, QuickReplyItem } from '@line/bot-sdk';
import { config } from '../config/env';

const client = new Client({
  channelAccessToken: config.lineChannelAccessToken,
});

/**
 * テキストメッセージを送信
 */
export async function sendTextMessage(userId: string, text: string, quickReply?: QuickReply) {
  const message: TextMessage = {
    type: 'text',
    text,
    ...(quickReply && { quickReply }),
  };
  return client.pushMessage(userId, message);
}

/**
 * リプライメッセージを送信
 */
export async function replyMessage(replyToken: string, messages: (TextMessage | FlexMessage)[]) {
  try {
    return await client.replyMessage(replyToken, messages);
  } catch (error: any) {
    console.error('LINE API Error Details:', JSON.stringify(error.originalError?.response?.data, null, 2));
    throw error;
  }
}

/**
 * バス時刻表示用のFlexMessage作成（シンプル版）
 */
export function createBusScheduleMessage(
  direction: 'outbound' | 'inbound',
  departureStop: string,
  arrivalStop: string,
  buses: Array<{ departureTime: string; arrivalTime: string; gate?: string; isHoliday?: boolean }>
): FlexMessage {
  const isOutbound = direction === 'outbound';
  const title = isOutbound ? '行きのバス' : '帰りのバス';
  const icon = isOutbound ? '🚌' : '🏠';
  const headerColor = isOutbound ? '#06C755' : '#5B82DB';
  const subColor = isOutbound ? '#E8F5E9' : '#E3F2FD';
  const scheduleType = buses.length > 0 && buses[0].isHoliday ? '土日祝' : '平日';
  const route = `${departureStop} → ${arrivalStop}`;

  if (buses.length === 0) {
    return {
      type: 'flex',
      altText: '本日のバスは終了しました',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `${icon} ${title}`,
              color: '#ffffff',
              size: 'md',
              weight: 'bold',
              wrap: true,
            },
          ],
          backgroundColor: headerColor,
          paddingAll: 'md',
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: route,
              size: 'sm',
              color: '#666666',
              wrap: true,
            },
            {
              type: 'text',
              text: '本日のバスは終了しました',
              margin: 'md',
              size: 'sm',
              color: '#999999',
              align: 'center',
              wrap: true,
            },
          ],
          paddingAll: 'md',
        },
      },
    };
  }

  const busItems: FlexComponent[] = buses.map((bus, index) => {
    const isFirst = index === 0;
    const badgeColor = isFirst ? headerColor : '#AAAAAA';
    // index === 0: 先発, index === 1: 次発, index >= 2: 次々発
    let badgeText = '次々発';
    if (index === 0) badgeText = '先発';
    else if (index === 1) badgeText = '次発';
    
    // ゲート情報の色（北門は赤、それ以外は通常色）
    const isKitamon = bus.gate === '北門';
    const gateColor = isKitamon ? '#FF0000' : '#666666';
    
    // 上段: ゲート情報（バッジの右側に表示）
    const upperRow: FlexComponent[] = [
      {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: badgeText,
            size: 'xxs',
            color: '#ffffff',
            align: 'center',
          },
        ],
        backgroundColor: badgeColor,
        cornerRadius: 'sm',
        paddingAll: 'xs',
        width: '40px',
      } as FlexBox,
    ];
    
    // ゲート情報がある場合は上段に表示
    if (bus.gate) {
      upperRow.push({
        type: 'text',
        text: `🚏 ${bus.gate}`,
        size: 'sm',
        color: gateColor,
        weight: 'bold',
        margin: 'md',
        flex: 1,
      });
    }
    
    // 下段: 時刻情報
    const timeRow: FlexComponent = {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: bus.departureTime,
          size: 'lg',
          weight: 'bold',
          color: isFirst ? '#333333' : '#666666',
        },
        {
          type: 'text',
          text: '→',
          size: 'sm',
          color: '#999999',
          margin: 'sm',
        },
        {
          type: 'text',
          text: bus.arrivalTime,
          size: 'md',
          color: isFirst ? '#666666' : '#888888',
        },
      ],
      alignItems: 'center',
      paddingStart: '52px', // バッジ幅 + マージン分
      margin: 'xs',
    } as FlexBox;
    
    return {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: upperRow,
          alignItems: 'center',
        } as FlexBox,
        timeRow,
      ],
      backgroundColor: isFirst ? subColor : '#F5F5F5',
      cornerRadius: 'md',
      paddingAll: 'md',
      margin: index === 0 ? 'none' : 'sm',
    } as FlexBox;
  });

  return {
    type: 'flex',
    altText: `${icon} 次のバス: ${buses[0].departureTime}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'horizontal',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `${icon} ${title}`,
                color: '#ffffff',
                size: 'md',
                weight: 'bold',
                wrap: true,
              },
              {
                type: 'text',
                text: route,
                color: '#ffffff',
                size: 'xs',
                margin: 'xs',
                wrap: true,
              },
            ],
            flex: 3,
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: scheduleType,
                color: '#ffffff',
                size: 'xxs',
                align: 'center',
                weight: 'bold',
              },
            ],
            backgroundColor: '#00000033',
            cornerRadius: 'sm',
            paddingAll: 'xs',
            justifyContent: 'center',
          },
        ],
        backgroundColor: headerColor,
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: busItems,
        paddingAll: 'md',
        backgroundColor: '#ffffff',
      },
    },
  };
}

/**
 * バス停選択用のクイックリプライを作成（互換性のため残す）
 */
export function createBusStopQuickReply(
  stops: string[],
  action: string,
  direction: 'outbound' | 'inbound'
): QuickReply {
  // LINE APIは最大13個までしかクイックリプライを表示できない
  const limitedStops = stops.slice(0, 13);
  
  const items: QuickReplyItem[] = limitedStops.map((stop) => ({
    type: 'action',
    action: {
      type: 'postback',
      label: stop.length > 12 ? stop.substring(0, 12) : stop,
      data: `action=${action}&direction=${direction}&stop=${stop}`,
      displayText: stop,
    },
  }));

  return { items };
}

/**
 * バス停選択用のFlexMessage（制限なしで全バス停表示可能）
 */
export function createBusStopSelectMenu(
  stops: string[],
  action: string,
  promptText: string
): FlexMessage {
  const isOutbound = action.includes('outbound');
  const headerColor = isOutbound ? '#06C755' : '#5B82DB';
  
  // バス停ボタンを作成
  const stopButtons: FlexComponent[] = stops.map((stop) => ({
    type: 'button',
    action: {
      type: 'postback',
      label: stop,
      data: `action=${action}&stop=${stop}`,
      displayText: stop,
    },
    style: 'secondary',
    height: 'sm',
    margin: 'sm',
  }));

  return {
    type: 'flex',
    altText: promptText,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '⚙️ バス停を選択',
            color: '#ffffff',
            size: 'md',
            weight: 'bold',
          },
          {
            type: 'text',
            text: promptText,
            color: '#ffffffcc',
            size: 'xs',
            margin: 'sm',
          },
        ],
        backgroundColor: headerColor,
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: stopButtons,
        paddingAll: 'lg',
        spacing: 'none',
      },
    },
  };
}

/**
 * ウェルカムメッセージを作成
 */
export function createWelcomeMessage(): FlexMessage {
  return {
    type: 'flex',
    altText: 'バス時刻案内へようこそ！',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🚌 バス時刻案内',
            weight: 'bold',
            size: 'lg',
            align: 'center',
          },
          {
            type: 'text',
            text: 'ボタンを押してバス時刻を確認',
            size: 'xs',
            color: '#888888',
            align: 'center',
            margin: 'sm',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            spacing: 'md',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🚌 行き',
                  data: 'action=search&direction=outbound',
                  displayText: '行きのバス',
                },
                style: 'primary',
                color: '#06C755',
              },
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🏠 帰り',
                  data: 'action=search&direction=inbound',
                  displayText: '帰りのバス',
                },
                style: 'primary',
                color: '#5B82DB',
              },
            ],
          },
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '⚙️ 設定',
              data: 'action=settings',
              displayText: '設定',
            },
            style: 'secondary',
            margin: 'md',
          },
        ],
      },
    },
  };
}

/**
 * メインメニューを作成（ボタン付き）
 */
export function createMainMenu(): FlexMessage {
  return {
    type: 'flex',
    altText: 'メニュー',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🚌 どちらのバスを検索しますか？',
            weight: 'bold',
            size: 'sm',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'horizontal',
            margin: 'lg',
            spacing: 'md',
            contents: [
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🚌 行き',
                  data: 'action=search&direction=outbound',
                  displayText: '行きのバス',
                },
                style: 'primary',
                color: '#06C755',
              },
              {
                type: 'button',
                action: {
                  type: 'postback',
                  label: '🏠 帰り',
                  data: 'action=search&direction=inbound',
                  displayText: '帰りのバス',
                },
                style: 'primary',
                color: '#5B82DB',
              },
            ],
          },
        ],
      },
    },
  };
}

/**
 * 設定メニューを作成
 */
export function createSettingsMenu(): FlexMessage {
  return {
    type: 'flex',
    altText: '設定メニュー',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '⚙️ 設定',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: '変更したい項目を選んでください',
            size: 'sm',
            color: '#666666',
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '🚌 行きの乗車バス停を変更',
              data: 'action=change_stop&target=outbound_departure',
            },
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: '🏠 帰りの降車バス停を変更',
              data: 'action=change_stop&target=inbound_arrival',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '現在の設定を確認',
              data: 'action=show_settings',
            },
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '❓ ヘルプ',
              data: 'action=help',
            },
          },
        ],
      },
    },
  };
}

/**
 * メインメニューのクイックリプライ
 */
export function createMainQuickReply(): QuickReply {
  return {
    items: [
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '🚌 行く',
          data: 'action=search&direction=outbound',
        },
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '🏠 帰る',
          data: 'action=search&direction=inbound',
        },
      },
      {
        type: 'action',
        action: {
          type: 'postback',
          label: '⚙️ 設定',
          data: 'action=settings',
        },
      },
    ],
  };
}

/**
 * 時刻指定検索メニューを作成
 */
export function createTimeSearchMenu(): FlexMessage {
  return {
    type: 'flex',
    altText: '時刻指定検索',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '⏰ 日時指定検索',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: '到着したい日時を指定して検索できます',
            size: 'sm',
            color: '#666666',
            margin: 'md',
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '🔧 設定のバス停で検索',
            weight: 'bold',
            size: 'sm',
            margin: 'lg',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'datetimepicker',
              label: '🚌 行き（設定のバス停）',
              data: 'action=arrive_by&direction=outbound',
              mode: 'datetime',
            },
          },
          {
            type: 'button',
            style: 'primary',
            color: '#5B82DB',
            action: {
              type: 'datetimepicker',
              label: '🏠 帰り（設定のバス停）',
              data: 'action=arrive_by&direction=inbound',
              mode: 'datetime',
            },
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '📍 バス停を指定して検索',
              data: 'action=custom_search_menu',
            },
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '📢 リマインダー',
            weight: 'bold',
            margin: 'md',
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'datetimepicker',
              label: '🔔 リマインダーを設定',
              data: 'action=set_notification&direction=inbound',
              mode: 'datetime',
            },
          },
          {
            type: 'button',
            style: 'secondary',
            action: {
              type: 'postback',
              label: '📋 リマインダー一覧',
              data: 'action=list_notifications',
            },
          },
        ],
      },
    },
  };
}

/**
 * ヘルプメッセージを作成
 */
export function createHelpMessage(): FlexMessage {
  return {
    type: 'flex',
    altText: '使い方ガイド',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '❓ 使い方ガイド',
            color: '#ffffff',
            size: 'lg',
            weight: 'bold',
          },
        ],
        backgroundColor: '#667eea',
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📱 リッチメニュー',
            weight: 'bold',
            size: 'md',
          },
          {
            type: 'text',
            text: '• 行き：次の行きバスを表示\n• 帰り：次の帰りバスを表示\n• 時刻指定：到着時刻で検索\n• 設定：バス停変更など',
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'sm',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '💬 テキストでも操作可能',
            weight: 'bold',
            size: 'md',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '• 「行く」「出発」→ 行きバス\n• 「帰る」「帰り」→ 帰りバス\n• 「設定」→ 設定メニュー',
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'sm',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '🔔 リマインダー',
            weight: 'bold',
            size: 'md',
            margin: 'lg',
          },
          {
            type: 'text',
            text: '時刻指定メニューから設定した日時に通知を送信します。',
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'sm',
          },
        ],
        paddingAll: 'lg',
      },
    },
  };
}

/**
 * 通知一覧メニューを作成
 */
export function createNotificationListMenu(
  notifications: Array<{
    id: string;
    direction: string;
    notifyAt: Date;
    status: string;
  }>
): FlexMessage {
  const pendingNotifications = notifications.filter(n => n.status === 'pending');
  
  if (pendingNotifications.length === 0) {
    return {
      type: 'flex',
      altText: '通知一覧',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🔔 通知一覧',
              weight: 'bold',
              size: 'lg',
            },
            {
              type: 'text',
              text: '設定されている通知はありません',
              size: 'sm',
              color: '#666666',
              margin: 'lg',
            },
          ],
        },
      },
    };
  }

  const notificationItems: FlexComponent[] = pendingNotifications.map((n) => {
    const time = new Date(n.notifyAt).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dirLabel = n.direction === 'outbound' ? '🚌 行き' : '🏠 帰り';
    
    return {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: `${dirLabel} ${time}`,
          flex: 3,
        },
        {
          type: 'button',
          action: {
            type: 'postback',
            label: '削除',
            data: `action=delete_notification&id=${n.id}`,
          },
          style: 'secondary',
          height: 'sm',
          flex: 1,
        },
      ],
      margin: 'md',
    };
  });

  return {
    type: 'flex',
    altText: '通知一覧',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '🔔 通知一覧',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: '設定されている通知',
            size: 'sm',
            color: '#666666',
            margin: 'sm',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          ...notificationItems,
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'postback',
              label: '🗑️ すべて削除',
              data: 'action=delete_all_notifications',
            },
            style: 'secondary',
          },
        ],
      },
    },
  };
}

/**
 * カスタム検索メニュー（方向選択）を作成
 */
export function createCustomSearchMenu(): FlexMessage {
  return {
    type: 'flex',
    altText: 'バス停を指定して検索',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📍 バス停を指定して検索',
            weight: 'bold',
            size: 'lg',
          },
          {
            type: 'text',
            text: 'まず方向を選んでください',
            size: 'sm',
            color: '#666666',
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#06C755',
            action: {
              type: 'postback',
              label: '🚌 行き（出発駅を選択）',
              data: 'action=custom_outbound_departure',
            },
          },
          {
            type: 'button',
            style: 'primary',
            color: '#5B82DB',
            action: {
              type: 'postback',
              label: '🏠 帰り（到着駅を選択）',
              data: 'action=custom_inbound_arrival',
            },
          },
        ],
      },
    },
  };
}

/**
 * 行き用：乗車バス停選択メニュー（到着は会社固定、datetimepicker付き）
 */
export function createOutboundDepartureSelectMenu(
  stops: string[]
): FlexMessage {
  const headerColor = '#06C755';
  
  const stopButtons: FlexComponent[] = stops.map((stop) => ({
    type: 'button',
    action: {
      type: 'datetimepicker',
      label: stop,
      data: `action=custom_arrive_by&direction=outbound&departure=${encodeURIComponent(stop)}&arrival=${encodeURIComponent('会社')}`,
      mode: 'datetime',
    },
    style: 'secondary',
    height: 'sm',
    margin: 'sm',
  }));

  return {
    type: 'flex',
    altText: '乗車バス停を選択',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📍 乗車バス停を選択',
            color: '#ffffff',
            size: 'md',
            weight: 'bold',
          },
          {
            type: 'text',
            text: '到着: 会社（固定）',
            color: '#ffffffcc',
            size: 'xs',
            margin: 'sm',
          },
        ],
        backgroundColor: headerColor,
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: stopButtons,
        paddingAll: 'lg',
        spacing: 'none',
      },
    },
  };
}

/**
 * 帰り用：降車バス停選択メニュー（出発は会社固定、datetimepicker付き）
 */
export function createInboundArrivalSelectMenu(
  stops: string[]
): FlexMessage {
  const headerColor = '#5B82DB';
  
  const stopButtons: FlexComponent[] = stops.map((stop) => ({
    type: 'button',
    action: {
      type: 'datetimepicker',
      label: stop,
      data: `action=custom_arrive_by&direction=inbound&departure=${encodeURIComponent('会社')}&arrival=${encodeURIComponent(stop)}`,
      mode: 'datetime',
    },
    style: 'secondary',
    height: 'sm',
    margin: 'sm',
  }));

  return {
    type: 'flex',
    altText: '降車バス停を選択',
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📍 降車バス停を選択',
            color: '#ffffff',
            size: 'md',
            weight: 'bold',
          },
          {
            type: 'text',
            text: '乗車: 会社（固定）',
            color: '#ffffffcc',
            size: 'xs',
            margin: 'sm',
          },
        ],
        backgroundColor: headerColor,
        paddingAll: 'lg',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: stopButtons,
        paddingAll: 'lg',
        spacing: 'none',
      },
    },
  };
}

export { client };
