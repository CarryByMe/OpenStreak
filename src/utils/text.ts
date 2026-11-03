// Реэкспорт дат-утилит для удобства: можно импортировать из text.ts или dates.ts
export {
  p2,
  dstr,
  todayStr,
  addDays,
  human,
  rel,
  last7,
  monthTitle,
  DAYN,
  DAYN2,
  MON,
  MON_NOM,
} from './dates';

export function plural(n: number, a: string, b: string, c: string): string {
  n = Math.abs(n) % 100;
  const x = n % 10;
  if (n > 10 && n < 20) return c;
  if (x > 1 && x < 5) return b;
  if (x === 1) return a;
  return c;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function esc(s: string): string {
  return String(s);
}
