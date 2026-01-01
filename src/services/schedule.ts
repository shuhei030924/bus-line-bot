import * as fs from 'fs';
import * as path from 'path';

interface BusSchedule {
  id: number;
  gate?: string;
  stops: Record<string, string>;
}

interface DirectionData {
  name: string;
  stops: string[];
  schedules: BusSchedule[];
}

interface DayTypeSchedule {
  outbound: DirectionData;
  inbound: DirectionData;
}

interface ScheduleData {
  weekday: DayTypeSchedule;
  holiday: DayTypeSchedule;
}

// 日本の祝日リスト（2024-2030年の主要な祝日）
const japaneseHolidays: string[] = [
  // 2024年
  '2024-01-01', '2024-01-08', '2024-02-11', '2024-02-12', '2024-02-23',
  '2024-03-20', '2024-04-29', '2024-05-03', '2024-05-04', '2024-05-05',
  '2024-05-06', '2024-07-15', '2024-08-11', '2024-08-12', '2024-09-16',
  '2024-09-22', '2024-09-23', '2024-10-14', '2024-11-03', '2024-11-04',
  '2024-11-23', '2024-12-31',
  // 2025年
  '2025-01-01', '2025-01-13', '2025-02-11', '2025-02-23', '2025-02-24',
  '2025-03-20', '2025-04-29', '2025-05-03', '2025-05-04', '2025-05-05',
  '2025-05-06', '2025-07-21', '2025-08-11', '2025-09-15', '2025-09-23',
  '2025-10-13', '2025-11-03', '2025-11-23', '2025-11-24', '2025-12-31',
  // 2026年
  '2026-01-01', '2026-01-12', '2026-02-11', '2026-02-23', '2026-03-20',
  '2026-04-29', '2026-05-03', '2026-05-04', '2026-05-05', '2026-05-06',
  '2026-07-20', '2026-08-11', '2026-09-21', '2026-09-22', '2026-09-23',
  '2026-10-12', '2026-11-03', '2026-11-23', '2026-12-31',
  // 2027年
  '2027-01-01', '2027-01-11', '2027-02-11', '2027-02-23', '2027-03-21',
  '2027-03-22', '2027-04-29', '2027-05-03', '2027-05-04', '2027-05-05',
  '2027-07-19', '2027-08-11', '2027-09-20', '2027-09-23', '2027-10-11',
  '2027-11-03', '2027-11-23', '2027-12-31',
  // 2028年
  '2028-01-01', '2028-01-10', '2028-02-11', '2028-02-23', '2028-03-20',
  '2028-04-29', '2028-05-03', '2028-05-04', '2028-05-05', '2028-07-17',
  '2028-08-11', '2028-09-18', '2028-09-22', '2028-10-09', '2028-11-03',
  '2028-11-23', '2028-12-31',
  // 2029年
  '2029-01-01', '2029-01-08', '2029-02-11', '2029-02-12', '2029-02-23',
  '2029-03-20', '2029-04-29', '2029-04-30', '2029-05-03', '2029-05-04',
  '2029-05-05', '2029-07-16', '2029-08-11', '2029-09-17', '2029-09-23',
  '2029-09-24', '2029-10-08', '2029-11-03', '2029-11-23', '2029-12-31',
  // 2030年
  '2030-01-01', '2030-01-14', '2030-02-11', '2030-02-23', '2030-03-20',
  '2030-04-29', '2030-05-03', '2030-05-04', '2030-05-05', '2030-05-06',
  '2030-07-15', '2030-08-11', '2030-08-12', '2030-09-16', '2030-09-23',
  '2030-10-14', '2030-11-03', '2030-11-04', '2030-11-23', '2030-12-31',
];

// 時刻表データの読み込み
const schedulePath = path.join(__dirname, '../../data/schedules.json');
const scheduleData: ScheduleData = JSON.parse(fs.readFileSync(schedulePath, 'utf-8'));

/**
 * 土日祝日かどうかを判定
 */
export function isHoliday(date: Date = new Date()): boolean {
  const dayOfWeek = date.getDay();
  // 土曜(6)または日曜(0)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return true;
  }
  // 祝日チェック
  const dateStr = date.toISOString().split('T')[0];
  return japaneseHolidays.includes(dateStr);
}

/**
 * 現在の曜日タイプに応じた時刻表を取得
 */
function getScheduleForToday(): DayTypeSchedule {
  return isHoliday() ? scheduleData.holiday : scheduleData.weekday;
}

/**
 * 今日の曜日タイプを取得
 */
export function getDayType(): 'weekday' | 'holiday' {
  return isHoliday() ? 'holiday' : 'weekday';
}

/**
 * 時刻文字列を分単位に変換
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * 現在時刻以降のバスを検索
 */
export function findNextBuses(
  direction: 'outbound' | 'inbound',
  departureStop: string,
  arrivalStop: string,
  count: number = 2
): Array<{ departureTime: string; arrivalTime: string; gate?: string; isHoliday: boolean }> {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySchedule = getScheduleForToday();
  const holiday = isHoliday();

  const data = direction === 'outbound' ? todaySchedule.outbound : todaySchedule.inbound;

  const results: Array<{ departureTime: string; arrivalTime: string; gate?: string; isHoliday: boolean }> = [];

  for (const schedule of data.schedules) {
    const departureTime = schedule.stops[departureStop];
    const arrivalTime = schedule.stops[arrivalStop];

    // 両方のバス停に停車する便のみ
    if (departureTime && arrivalTime) {
      const depMinutes = timeToMinutes(departureTime);

      // 現在時刻以降のバス
      if (depMinutes >= currentMinutes) {
        results.push({
          departureTime,
          arrivalTime,
          gate: schedule.gate,
          isHoliday: holiday,
        });

        if (results.length >= count) {
          break;
        }
      }
    }
  }

  return results;
}

/**
 * 指定日の時刻表を取得
 */
function getScheduleForDate(date: Date): DayTypeSchedule {
  return isHoliday(date) ? scheduleData.holiday : scheduleData.weekday;
}

/**
 * 指定日時までに到着するバスを検索（到着時刻に近い順）
 */
export function findBusesToArriveBy(
  direction: 'outbound' | 'inbound',
  departureStop: string,
  arrivalStop: string,
  targetArrivalTime: string,
  targetDate: Date,
  count: number = 2
): Array<{ departureTime: string; arrivalTime: string; gate?: string; isHoliday: boolean }> {
  const targetMinutes = timeToMinutes(targetArrivalTime);
  const now = new Date();
  const isToday = targetDate.toDateString() === now.toDateString();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todaySchedule = getScheduleForDate(targetDate);
  const holiday = isHoliday(targetDate);

  const data = direction === 'outbound' ? todaySchedule.outbound : todaySchedule.inbound;

  const candidates: Array<{ departureTime: string; arrivalTime: string; gate?: string; isHoliday: boolean; arrMinutes: number }> = [];

  // 条件に合うバスを全て収集
  for (const schedule of data.schedules) {
    const departureTime = schedule.stops[departureStop];
    const arrivalTime = schedule.stops[arrivalStop];

    if (departureTime && arrivalTime) {
      const depMinutes = timeToMinutes(departureTime);
      const arrMinutes = timeToMinutes(arrivalTime);

      // 目標時刻までに到着するバス
      // 今日の場合のみ現在時刻以降のバスに絞る
      const isValidDeparture = isToday ? depMinutes >= currentMinutes : true;
      
      if (arrMinutes <= targetMinutes && isValidDeparture) {
        candidates.push({
          departureTime,
          arrivalTime,
          gate: schedule.gate,
          isHoliday: holiday,
          arrMinutes,
        });
      }
    }
  }

  // 到着時刻が指定時刻に近い順（降順）でソート
  candidates.sort((a, b) => b.arrMinutes - a.arrMinutes);

  // 上位count件を返す（arrMinutesは除去）
  return candidates.slice(0, count).map(({ arrMinutes, ...rest }) => rest);
}

/**
 * バス停一覧を取得
 */
export function getBusStops(direction: 'outbound' | 'inbound'): string[] {
  const todaySchedule = getScheduleForToday();
  return direction === 'outbound' ? todaySchedule.outbound.stops : todaySchedule.inbound.stops;
}

/**
 * 全てのバス停一覧を取得（平日・休日両方）
 */
export function getAllBusStops(direction: 'outbound' | 'inbound'): string[] {
  const weekdayStops = direction === 'outbound' 
    ? scheduleData.weekday.outbound.stops 
    : scheduleData.weekday.inbound.stops;
  const holidayStops = direction === 'outbound' 
    ? scheduleData.holiday.outbound.stops 
    : scheduleData.holiday.inbound.stops;
  
  // 重複を除いて結合
  return [...new Set([...weekdayStops, ...holidayStops])];
}
