import { Client } from '@line/bot-sdk';
import sharp from 'sharp';
import { config } from '../config/env';

const client = new Client({
  channelAccessToken: config.lineChannelAccessToken,
});

// リッチメニュー用の画像をPNGで生成（2x2 = 4分割）
async function createRichMenuImage(): Promise<Buffer> {
  // 2500x1686のSVGを作成してPNGに変換（2段）
  const svg = `
    <svg width="2500" height="1686" xmlns="http://www.w3.org/2000/svg">
      <!-- 上段左: 行きボタン -->
      <rect x="0" y="0" width="1250" height="843" fill="#06C755"/>
      <text x="625" y="350" text-anchor="middle" fill="white" font-size="180" font-family="sans-serif">🚌</text>
      <text x="625" y="580" text-anchor="middle" fill="white" font-size="140" font-family="sans-serif" font-weight="bold">行き</text>
      
      <!-- 上段右: 帰りボタン -->
      <rect x="1250" y="0" width="1250" height="843" fill="#5B82DB"/>
      <text x="1875" y="350" text-anchor="middle" fill="white" font-size="180" font-family="sans-serif">🏠</text>
      <text x="1875" y="580" text-anchor="middle" fill="white" font-size="140" font-family="sans-serif" font-weight="bold">帰り</text>
      
      <!-- 下段左: 時刻指定ボタン -->
      <rect x="0" y="843" width="1250" height="843" fill="#FF6B35"/>
      <text x="625" y="1193" text-anchor="middle" fill="white" font-size="180" font-family="sans-serif">⏰</text>
      <text x="625" y="1423" text-anchor="middle" fill="white" font-size="120" font-family="sans-serif" font-weight="bold">時刻指定</text>
      
      <!-- 下段右: 設定ボタン -->
      <rect x="1250" y="843" width="1250" height="843" fill="#666666"/>
      <text x="1875" y="1193" text-anchor="middle" fill="white" font-size="180" font-family="sans-serif">⚙️</text>
      <text x="1875" y="1423" text-anchor="middle" fill="white" font-size="140" font-family="sans-serif" font-weight="bold">設定</text>
      
      <!-- 区切り線 -->
      <line x1="1250" y1="50" x2="1250" y2="793" stroke="white" stroke-width="3" opacity="0.5"/>
      <line x1="1250" y1="893" x2="1250" y2="1636" stroke="white" stroke-width="3" opacity="0.5"/>
      <line x1="50" y1="843" x2="2450" y2="843" stroke="white" stroke-width="3" opacity="0.3"/>
    </svg>
  `;
  
  return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function setupRichMenu() {
  try {
    // 既存のリッチメニューを削除
    const existingMenus = await client.getRichMenuList();
    for (const menu of existingMenus) {
      await client.deleteRichMenu(menu.richMenuId);
      console.log(`Deleted existing rich menu: ${menu.richMenuId}`);
    }

    // リッチメニューを作成（2x2 = 4分割）
    const richMenu = {
      size: {
        width: 2500,
        height: 1686,
      },
      selected: true,
      name: 'バス時刻メニュー',
      chatBarText: 'メニュー',
      areas: [
        {
          bounds: {
            x: 0,
            y: 0,
            width: 1250,
            height: 843,
          },
          action: {
            type: 'postback' as const,
            label: '行きのバス',
            data: 'action=search&direction=outbound',
            displayText: '行きのバス',
          },
        },
        {
          bounds: {
            x: 1250,
            y: 0,
            width: 1250,
            height: 843,
          },
          action: {
            type: 'postback' as const,
            label: '帰りのバス',
            data: 'action=search&direction=inbound',
            displayText: '帰りのバス',
          },
        },
        {
          bounds: {
            x: 0,
            y: 843,
            width: 1250,
            height: 843,
          },
          action: {
            type: 'postback' as const,
            label: '時刻指定',
            data: 'action=time_search_menu',
            displayText: '時刻指定検索',
          },
        },
        {
          bounds: {
            x: 1250,
            y: 843,
            width: 1250,
            height: 843,
          },
          action: {
            type: 'postback' as const,
            label: '設定',
            data: 'action=settings',
            displayText: '設定',
          },
        },
      ],
    };

    const richMenuId = await client.createRichMenu(richMenu);
    console.log(`Created rich menu: ${richMenuId}`);

    // PNG画像を生成してアップロード
    console.log('Generating PNG image...');
    const pngBuffer = await createRichMenuImage();
    console.log(`Image size: ${pngBuffer.length} bytes`);
    
    await client.setRichMenuImage(richMenuId, pngBuffer, 'image/png');
    console.log('Uploaded rich menu image (PNG)');

    // デフォルトのリッチメニューとして設定
    await client.setDefaultRichMenu(richMenuId);
    console.log('✅ リッチメニューをデフォルトに設定しました！');
    console.log('LINEアプリを再起動して確認してください。');

  } catch (error: any) {
    console.error('Error setting up rich menu:', error);
    if (error.originalError?.response?.data) {
      console.error('Details:', JSON.stringify(error.originalError.response.data, null, 2));
    }
  }
}

setupRichMenu();
