/**
 * Строки интерфейса. Логика и компоненты берут текст только по ключу:
 * `const t = useT(); t('tab.today')`, вне React — `translate(...)`.
 */
import { pickForm } from './plural';
import { en } from './en';
import { es } from './es';
import { GYM } from './gym';
import { ru, type MessageKey } from './ru';
import type { Flavor, Locale, Message, Tone, Variant } from './types';

export type { Flavor, Locale, MessageKey, Tone };
export { pluralCategory } from './plural';

const DICTS: Record<Locale, Record<MessageKey, Message>> = { ru, en, es };

/** Языки в порядке выбора в настройках. */
export const LOCALES: readonly Locale[] = ['ru', 'en', 'es'];

export type Params = Record<string, string | number> & { count?: number };

function isToned(m: Message): m is { plain: Variant; bro: Variant } {
  return typeof m === 'object' && 'plain' in m;
}

/** Строка оформления (`flavor`, см. `gym.ts`), если она есть, иначе обычная. */
function lookup(locale: Locale, key: MessageKey, flavor: Flavor): Message {
  return (flavor === 'gym' ? GYM[locale][key] : undefined) ?? DICTS[locale][key];
}

export function translate(
  locale: Locale,
  tone: Tone,
  key: MessageKey,
  params?: Params,
  flavor: Flavor = null
): string {
  const msg = lookup(locale, key, flavor);
  const variant = isToned(msg) ? msg[tone] : msg;
  const text =
    typeof variant === 'string' ? variant : pickForm(locale, variant, params?.count ?? 0);
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole
  );
}

/** Сколько цитат волка в словаре (ключи `quote.0`, `quote.1`, …). */
export function quoteCount(locale: Locale): number {
  let n = 0;
  while (`quote.${n}` in DICTS[locale]) n++;
  return n;
}
