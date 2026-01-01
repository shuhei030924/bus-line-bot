/**
 * 自然言語から時刻を抽出
 * 例: 「9時に着きたい」→ "09:00"
 *     「18時30分に会社を出たい」→ "18:30"
 */
export function extractTime(text: string): string | null {
  // パターン1: 「9時」「9時30分」「9:30」
  const patterns = [
    /(\d{1,2})時(\d{1,2})分/,  // 9時30分
    /(\d{1,2}):(\d{1,2})/,     // 9:30
    /(\d{1,2})時半/,           // 9時半 → 9:30
    /(\d{1,2})時/,             // 9時 → 9:00
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let hours = parseInt(match[1], 10);
      let minutes = 0;

      if (pattern.source.includes('時半')) {
        minutes = 30;
      } else if (match[2]) {
        minutes = parseInt(match[2], 10);
      }

      // 24時間形式に正規化
      if (hours < 24) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
    }
  }

  return null;
}

/**
 * テキストから意図を判定
 */
export type Intent = 
  | { type: 'search_outbound' }
  | { type: 'search_inbound' }
  | { type: 'arrive_by'; time: string; direction: 'outbound' | 'inbound' }
  | { type: 'depart_at'; time: string; direction: 'outbound' | 'inbound' }
  | { type: 'settings' }
  | { type: 'notification'; time: string }
  | { type: 'help' }
  | { type: 'unknown' };

export function parseIntent(text: string): Intent {
  const normalizedText = text.trim().toLowerCase();

  // 行く
  if (/^(行く|いく|出発|しゅっぱつ)$/.test(normalizedText)) {
    return { type: 'search_outbound' };
  }

  // 帰る
  if (/^(帰る|かえる|帰り|かえり)$/.test(normalizedText)) {
    return { type: 'search_inbound' };
  }

  // 設定
  if (/^(設定|せってい|変更|へんこう)$/.test(normalizedText)) {
    return { type: 'settings' };
  }

  // ヘルプ
  if (/^(ヘルプ|へるぷ|help|使い方|つかいかた|操作|そうさ|\?)$/.test(normalizedText)) {
    return { type: 'help' };
  }

  // 到着時刻指定（行き）
  if (/(会社|着|つ).*たい/.test(text) || /に(間に合|まにあ)/.test(text)) {
    const time = extractTime(text);
    if (time) {
      // 会社に着きたい → 行き
      if (/会社/.test(text)) {
        return { type: 'arrive_by', time, direction: 'outbound' };
      }
      // 家に着きたい、帰りたい → 帰り
      if (/(家|いえ|自宅|帰|かえ)/.test(text)) {
        return { type: 'arrive_by', time, direction: 'inbound' };
      }
      // デフォルトは行き
      return { type: 'arrive_by', time, direction: 'outbound' };
    }
  }

  // 出発時刻指定
  if (/(出|で).*たい/.test(text)) {
    const time = extractTime(text);
    if (time) {
      // 会社を出たい → 帰り
      if (/会社/.test(text)) {
        return { type: 'depart_at', time, direction: 'inbound' };
      }
      // デフォルトは行き
      return { type: 'depart_at', time, direction: 'outbound' };
    }
  }

  // 通知設定
  if (/(通知|つうち|リマインド|教えて|おしえて)/.test(text)) {
    const time = extractTime(text);
    if (time) {
      return { type: 'notification', time };
    }
  }

  return { type: 'unknown' };
}
