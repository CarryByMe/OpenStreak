import { QUOTES, Quote } from '../constants/quotes';

export function quoteOfDay(dateStr: string): Quote {
  const d = new Date(dateStr + 'T00:00');
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const idx = diff % QUOTES.length;
  return QUOTES[idx];
}
