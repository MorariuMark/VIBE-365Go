import fs from 'fs';

// Helper to parse date string like "2026-09-18 04:44:11 +0300"
export function parseAppleDate(str: string): Date {
  if (!str) return new Date();
  // Standardize "YYYY-MM-DD HH:mm:ss +0300" to ISO if needed
  const normalized = str.replace(' ', 'T').replace(' +', '+').replace(' -', '-');
  return new Date(normalized);
}

export function formatTime24(d: Date): string {
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
