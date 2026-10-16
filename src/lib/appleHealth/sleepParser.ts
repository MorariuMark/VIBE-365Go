import { SleepLog } from '@/types';

export interface AppleHealthRawEntry {
  source?: string;
  start?: string;
  startDate?: string;
  end?: string;
  endDate?: string;
  qty?: number;
  date?: string;
  value?: string; // "Core" | "Deep" | "REM" | "Awake" | "In Bed"
}

export interface AppleHealthSleepSession {
  dateISO: string;
  bedtimeDate: Date;
  wakeTimeDate: Date;
  bedtime: string; // "HH:mm"
  wakeTime: string; // "HH:mm"
  totalSleepHours: number;
  coreHours: number;
  deepHours: number;
  remHours: number;
  awakeHours: number;
  inBedHours: number;
  entriesCount: number;
}

function parseDate(str?: string): Date | null {
  if (!str) return null;
  const normalized = str.trim().replace(' ', 'T').replace(' +', '+').replace(' -', '-');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatHHmm(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDurationHhMm(hours: number): string {
  const totalMin = Math.round(hours * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}

/**
 * Extracts raw sleep items from various potential JSON wrappers
 */
export function extractSleepItems(raw: any): AppleHealthRawEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;

  // Pattern: { data: { metrics: [ { name: "sleep_analysis", data: [...] } ] } }
  if (raw.data?.metrics && Array.isArray(raw.data.metrics)) {
    for (const m of raw.data.metrics) {
      if (m.name === 'sleep_analysis' && Array.isArray(m.data)) {
        return m.data;
      }
      if (Array.isArray(m.data)) {
        return m.data;
      }
    }
  }

  // Pattern: { metrics: [ { data: [...] } ] }
  if (raw.metrics && Array.isArray(raw.metrics)) {
    for (const m of raw.metrics) {
      if (Array.isArray(m.data)) return m.data;
    }
  }

  // Pattern: { data: [...] }
  if (Array.isArray(raw.data)) {
    return raw.data;
  }

  // Pattern: { sleep_analysis: [...] }
  if (Array.isArray(raw.sleep_analysis)) {
    return raw.sleep_analysis;
  }

  return [];
}

/**
 * Calculates a 1-100 recovery/quality score from sleep duration and stage distribution
 */
export function calculateSleepQualityScore(
  sleepHours: number,
  deepHours: number,
  remHours: number,
  awakeHours: number,
  targetHours: number = 8.0
): number {
  if (sleepHours <= 0) return 50;

  // 1. Duration score (max 50 points)
  // 100% of target gives 50 points, decreasing if under or significantly over
  const durationRatio = sleepHours / targetHours;
  let durationPoints = 50;
  if (durationRatio < 1.0) {
    durationPoints = Math.max(10, Math.round(50 * Math.pow(durationRatio, 1.2)));
  } else if (durationRatio > 1.3) {
    durationPoints = Math.max(35, Math.round(50 - (durationRatio - 1.3) * 25));
  }

  // 2. Deep Sleep Score (ideal 15% - 25% of sleep, max 20 points)
  const deepRatio = sleepHours > 0 ? deepHours / sleepHours : 0;
  let deepPoints = 15;
  if (deepRatio >= 0.15 && deepRatio <= 0.25) {
    deepPoints = 20;
  } else if (deepRatio > 0.08 && deepRatio < 0.15) {
    deepPoints = 16;
  } else if (deepRatio > 0.25) {
    deepPoints = 18;
  } else {
    deepPoints = Math.max(5, Math.round(deepRatio * 100));
  }

  // 3. REM Sleep Score (ideal 20% - 25% of sleep, max 20 points)
  const remRatio = sleepHours > 0 ? remHours / sleepHours : 0;
  let remPoints = 15;
  if (remRatio >= 0.18 && remRatio <= 0.28) {
    remPoints = 20;
  } else if (remRatio > 0.10 && remRatio < 0.18) {
    remPoints = 15;
  } else {
    deepPoints = Math.max(5, Math.round(remRatio * 80));
  }

  // 4. Awake / Interruption penalty (max 10 points)
  const awakePenalty = Math.min(10, Math.round(awakeHours * 10));
  const awakePoints = Math.max(0, 10 - awakePenalty);

  const totalScore = Math.min(100, Math.max(20, durationPoints + deepPoints + remPoints + awakePoints));
  return totalScore;
}

/**
 * Parses Apple Health sleep export into dictionary of VIBE-365 SleepLog entries
 */
export function parseAppleHealthSleepJSON(
  rawJson: any,
  targetHours: number = 8.0
): Record<string, SleepLog> {
  let parsedObject = rawJson;
  if (typeof rawJson === 'string') {
    try {
      parsedObject = JSON.parse(rawJson);
    } catch (e) {
      console.error('[SleepParser] Invalid JSON string provided', e);
      return {};
    }
  }

  // If already in VIBE-365 sleepLogs format
  if (parsedObject?.sleepLogs && typeof parsedObject.sleepLogs === 'object') {
    return parsedObject.sleepLogs;
  }

  const items = extractSleepItems(parsedObject);
  if (!items || items.length === 0) {
    return {};
  }

  // Filter valid items and sort chronologically
  interface ValidItem {
    startDate: Date;
    endDate: Date;
    value: string;
    qtyHours: number;
  }

  const validItems: ValidItem[] = [];
  for (const item of items) {
    const s = parseDate(item.start || item.startDate);
    const e = parseDate(item.end || item.endDate);
    if (!s || !e) continue;
    const durMs = e.getTime() - s.getTime();
    const durHours = item.qty !== undefined && item.qty > 0 ? item.qty : Math.max(0, durMs / (1000 * 3600));
    validItems.push({
      startDate: s,
      endDate: e,
      value: (item.value || '').trim(),
      qtyHours: durHours,
    });
  }

  validItems.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  if (validItems.length === 0) return {};

  // Group into sleep sessions (gaps > 4.5 hours indicate separate sleep sessions / days)
  const sessions: ValidItem[][] = [];
  let currentGroup: ValidItem[] = [];

  for (const item of validItems) {
    if (currentGroup.length === 0) {
      currentGroup.push(item);
      continue;
    }

    const lastEnd = currentGroup[currentGroup.length - 1].endDate;
    const gapMs = item.startDate.getTime() - lastEnd.getTime();
    const gapHours = gapMs / (1000 * 3600);

    // If gap between end of last interval and start of this interval is > 4.5 hours, it's a new session
    if (gapHours > 4.5) {
      sessions.push(currentGroup);
      currentGroup = [item];
    } else {
      currentGroup.push(item);
    }
  }
  if (currentGroup.length > 0) {
    sessions.push(currentGroup);
  }

  const resultLogs: Record<string, SleepLog> = {};

  for (const session of sessions) {
    if (session.length === 0) continue;

    // Earliest start and latest end
    const sessionStart = session.reduce((min, cur) => (cur.startDate < min ? cur.startDate : min), session[0].startDate);
    const sessionEnd = session.reduce((max, cur) => (cur.endDate > max ? cur.endDate : max), session[0].endDate);

    let coreHours = 0;
    let deepHours = 0;
    let remHours = 0;
    let awakeHours = 0;
    let inBedHours = 0;

    for (const item of session) {
      const v = item.value.toLowerCase();
      if (v === 'core') coreHours += item.qtyHours;
      else if (v === 'deep') deepHours += item.qtyHours;
      else if (v === 'rem') remHours += item.qtyHours;
      else if (v === 'awake') awakeHours += item.qtyHours;
      else if (v === 'in bed') inBedHours += item.qtyHours;
    }

    const stageSleepHours = coreHours + deepHours + remHours;
    let totalSleepDurationHours = stageSleepHours;

    // If no stage breakdown was provided, fall back to inBed or total span minus awake
    if (totalSleepDurationHours <= 0) {
      if (inBedHours > 0) {
        totalSleepDurationHours = Math.max(0, inBedHours - awakeHours);
      } else {
        const totalSpan = (sessionEnd.getTime() - sessionStart.getTime()) / (1000 * 3600);
        totalSleepDurationHours = Math.max(0, totalSpan - awakeHours);
      }
    }

    // Ignore noise (< 30 minutes total)
    if (totalSleepDurationHours < 0.5 && inBedHours < 0.5) {
      continue;
    }

    // Determine the wake-up date (morning date for the session)
    const dateISO = formatDateISO(sessionEnd);

    const totalMinutes = Math.round(totalSleepDurationHours * 60);
    const durH = Math.floor(totalMinutes / 60);
    const durM = totalMinutes % 60;
    const durationTime = `${pad(durH)}:${pad(durM)}`;
    const floatHours = Number((totalMinutes / 60).toFixed(2));

    const bedtime = formatHHmm(sessionStart);
    const wakeTime = formatHHmm(sessionEnd);

    const quality = calculateSleepQualityScore(
      floatHours,
      deepHours,
      remHours,
      awakeHours,
      targetHours
    );

    // Build rich stage notes
    const notesParts: string[] = ['Apple Watch'];
    if (deepHours > 0) notesParts.push(`Deep: ${formatDurationHhMm(deepHours)}`);
    if (remHours > 0) notesParts.push(`REM: ${formatDurationHhMm(remHours)}`);
    if (coreHours > 0) notesParts.push(`Core: ${formatDurationHhMm(coreHours)}`);
    if (awakeHours > 0) notesParts.push(`Awake: ${formatDurationHhMm(awakeHours)}`);

    const log: SleepLog = {
      dateISO,
      durationHours: floatHours,
      durationMinutesTotal: totalMinutes,
      durationTime,
      bedtime,
      wakeTime,
      qualityScore: quality,
      notes: notesParts.join(' • '),
      photoIds: [],
      updatedAt: new Date().toISOString(),
    };

    resultLogs[dateISO] = log;
  }

  return resultLogs;
}
