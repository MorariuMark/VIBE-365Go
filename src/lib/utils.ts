import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDatePretty(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getWeekDays(referenceDate: Date = new Date()): Date[] {
  const d = new Date(referenceDate);
  const day = d.getDay();
  // Monday as start of week: 0 is Sunday -> diff = -6, 1 is Monday -> diff = 0
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));

  const week: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const nextDay = new Date(monday);
    nextDay.setDate(monday.getDate() + i);
    week.push(nextDay);
  }
  return week;
}

export function toDateISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface ParsedSleepDuration {
  hours: number;
  minutes: number;
  totalMinutes: number;
  timeStr: string; // "HH:mm" for input[type="time"]
  floatHours: number;
  displayStr: string; // e.g. "5h 45m"
}

export function parseSleepDuration(val: number | string | undefined | null): ParsedSleepDuration {
  if (!val) {
    return {
      hours: 8,
      minutes: 0,
      totalMinutes: 480,
      timeStr: '08:00',
      floatHours: 8.0,
      displayStr: '8h 0m',
    };
  }

  if (typeof val === 'string' && val.includes(':')) {
    const [hRaw, mRaw] = val.split(':').map(Number);
    const h = isNaN(hRaw) ? 0 : Math.max(0, hRaw);
    const m = isNaN(mRaw) ? 0 : Math.max(0, Math.min(59, mRaw));
    const totalMinutes = h * 60 + m;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    return {
      hours: h,
      minutes: m,
      totalMinutes,
      timeStr,
      floatHours: Number((totalMinutes / 60).toFixed(2)),
      displayStr: `${h}h ${m}m`,
    };
  }

  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    return {
      hours: 8,
      minutes: 0,
      totalMinutes: 480,
      timeStr: '08:00',
      floatHours: 8.0,
      displayStr: '8h 0m',
    };
  }

  // If > 24, assume it's already total minutes, otherwise decimal hours (e.g. 5.75)
  const totalMinutes = num > 24 ? Math.round(num) : Math.round(num * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return {
    hours: h,
    minutes: m,
    totalMinutes,
    timeStr,
    floatHours: Number((totalMinutes / 60).toFixed(2)),
    displayStr: `${h}h ${m}m`,
  };
}

export function calculateDurationFromBedWake(bed: string, wake: string): ParsedSleepDuration {
  try {
    const [bH, bM] = bed.split(':').map(Number);
    const [wH, wM] = wake.split(':').map(Number);
    if (isNaN(bH) || isNaN(bM) || isNaN(wH) || isNaN(wM)) {
      return parseSleepDuration('08:00');
    }

    const bedMinutes = bH * 60 + bM;
    let wakeMinutes = wH * 60 + wM;

    if (wakeMinutes <= bedMinutes) {
      // Midnight crossing
      wakeMinutes += 24 * 60;
    }

    const diffMinutes = wakeMinutes - bedMinutes;
    return parseSleepDuration(diffMinutes);
  } catch {
    return parseSleepDuration('08:00');
  }
}

export function formatSleepDisplay(
  durationHours?: number,
  durationMinutesTotal?: number,
  durationTime?: string
): string {
  if (durationTime && durationTime.includes(':')) {
    const [h, m] = durationTime.split(':').map(Number);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (durationMinutesTotal !== undefined && durationMinutesTotal > 0) {
    const h = Math.floor(durationMinutesTotal / 60);
    const m = durationMinutesTotal % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (durationHours !== undefined && durationHours > 0) {
    const totalMin = Math.round(durationHours * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return '8h';
}
