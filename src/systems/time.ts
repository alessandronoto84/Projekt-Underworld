import { DAY_END, type GameState } from './state';

export const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const WEEKDAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/** Echtzeit-Sekunden pro Spielminute (10 Spielminuten ≈ 7 Sekunden). */
export const REAL_SECONDS_PER_MINUTE = 0.7;

export function weekday(day: number): number { return (day - 1) % 7; }

export function formatClock(minute: number): string {
  const m = minute % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm - (mm % 10)).padStart(2, '0')}`;
}

/** 0 = Tag, 1 = tiefe Nacht. Weicher Übergang für die Beleuchtung. */
export function darkness(minute: number): number {
  const h = minute / 60;
  if (h < 6) return 1;
  if (h < 7.5) return 1 - (h - 6) / 1.5;
  if (h < 17.5) return 0;
  if (h < 20.5) return (h - 17.5) / 3;
  return 1;
}

export function isNight(minute: number): boolean { return minute >= 20 * 60 || minute < 6 * 60; }

export function isOpen(minute: number, open: number, close: number): boolean {
  return minute >= open && minute < close;
}

/** Gibt true zurück, wenn das Tagesende erreicht wurde (Spieler bricht zusammen). */
export function advanceMinutes(s: GameState, minutes: number): boolean {
  s.time.minute += minutes;
  if (s.time.minute >= DAY_END) { s.time.minute = DAY_END; return true; }
  return false;
}

export function formatDuration(mins: number): string {
  const m = Math.max(0, Math.ceil(mins));
  const h = Math.floor(m / 60), r = m % 60;
  if (h === 0) return `${r} Min.`;
  return r === 0 ? `${h} Std.` : `${h} Std. ${r} Min.`;
}
