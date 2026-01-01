import dotenv from 'dotenv';
dotenv.config();

export const config = {
  // LINE
  lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
  lineChannelSecret: process.env.LINE_CHANNEL_SECRET || '',

  // Server
  port: parseInt(process.env.PORT || '3000', 10),

  // Bus stops
  busStops: {
    outbound: ['西条駅', '中央公園前', '西条昭和町', '石ヶ瀬橋', '西条小学校', '江熊', '図書館前', 'ががら口', '東中郷', '会社'],
    inbound: ['会社', '東中郷', 'ががら口', '図書館前', '江熊', '西条小学校', '石ヶ瀬橋', '西条昭和町', '中央公園前', '西条駅'],
  },

  // Default settings
  defaults: {
    outboundDeparture: '西条駅',
    outboundArrival: '会社',
    inboundDeparture: '会社',
    inboundArrival: '西条駅',
  },
};
