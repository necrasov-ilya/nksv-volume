import { LOCALE } from './constants/ui.js';
import { strings } from './constants/i18n.js';

const SIZE_UNITS: ReadonlyArray<[number, string]> = [
  [1024 ** 3, strings.units.gb],
  [1024 ** 2, strings.units.mb],
  [1024, strings.units.kb],
  [0, strings.units.bytes],
];

function formatRuNumber(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace('.', ',');
}

export function formatSize(bytes: number = 0): string {
  const safe = Math.max(0, bytes);
  for (const [threshold, unit] of SIZE_UNITS) {
    if (safe >= threshold) {
      const scaled = threshold === 0 ? safe : safe / threshold;
      const digits = unit === strings.units.gb ? 2 : 1;
      return `${formatRuNumber(scaled, digits)} ${unit}`;
    }
  }
  return `${safe} ${strings.units.bytes}`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const time = date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `${strings.date.todayPrefix}${time}`;
  return `${date.toLocaleDateString(LOCALE)}${strings.common.separator}${time}`;
}
