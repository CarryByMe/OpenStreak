import { describe, expect, test } from '@jest/globals';
import { LOCALES, pluralCategory, quoteCount, translate, type MessageKey } from '..';
import { en } from '../en';
import { es } from '../es';
import { GYM } from '../gym';
import { ru } from '../ru';
import type { Locale, Message } from '../types';

const DICTS: Record<Locale, Record<string, Message>> = { ru, en, es };

describe('pluralCategory ru', () => {
  test.each([
    [0, 'many'],
    [1, 'one'],
    [2, 'few'],
    [4, 'few'],
    [5, 'many'],
    [11, 'many'],
    [12, 'many'],
    [14, 'many'],
    [21, 'one'],
    [22, 'few'],
    [111, 'many'],
    [101, 'one'],
    [-3, 'few'],
    [1.5, 'other'],
  ])('%p → %s', (n, cat) => {
    expect(pluralCategory('ru', n)).toBe(cat);
  });
});

describe('pluralCategory en/es', () => {
  test.each(['en', 'es'] as const)('%s: one only for exactly 1', (locale) => {
    expect(pluralCategory(locale, 1)).toBe('one');
    expect(pluralCategory(locale, -1)).toBe('one');
    expect(pluralCategory(locale, 0)).toBe('other');
    expect(pluralCategory(locale, 2)).toBe('other');
    expect(pluralCategory(locale, 21)).toBe('other');
    expect(pluralCategory(locale, 1.5)).toBe('other');
  });
});

describe('translate', () => {
  test('plain string is the same in both tones', () => {
    expect(translate('ru', 'plain', 'tab.today')).toBe('Сегодня');
    expect(translate('ru', 'bro', 'tab.today')).toBe('Сегодня');
  });

  test('tone picks its own variant', () => {
    expect(translate('ru', 'plain', 'mark.slip')).toBe('срыв');
    expect(translate('ru', 'bro', 'mark.slip')).toBe('слив');
    expect(translate('en', 'bro', 'mark.slip')).toBe('bailed');
    expect(translate('es', 'plain', 'mark.slip')).toBe('fallo');
  });

  test('plural forms with count substitution in every language', () => {
    expect(translate('ru', 'bro', 'pack.with', { count: 1 })).toBe('с тобой 1 день');
    expect(translate('ru', 'bro', 'pack.with', { count: 3 })).toBe('с тобой 3 дня');
    expect(translate('ru', 'bro', 'pack.with', { count: 47 })).toBe('с тобой 47 дней');
    expect(translate('en', 'bro', 'pack.with', { count: 1 })).toBe('with you 1 day');
    expect(translate('en', 'bro', 'pack.with', { count: 47 })).toBe('with you 47 days');
    expect(translate('es', 'bro', 'pack.with', { count: 47 })).toBe('contigo 47 días');
  });

  test('«Качалка»: свои строки поверх обычных, остальное — как было', () => {
    expect(translate('ru', 'bro', 'rank.alpha', undefined, 'gym')).toBe('Босс качалки');
    expect(translate('ru', 'bro', 'rank.alpha')).toBe('Альфа');
    expect(translate('ru', 'bro', 'tab.pack', undefined, 'gym')).toBe('Зал');
    expect(translate('ru', 'bro', 'today.toFull', { count: 3 }, 'gym')).toBe(
      'до полного блина — 3'
    );
    expect(translate('ru', 'plain', 'widget.allDone', undefined, 'gym')).toBe('всё сделано');
    expect(translate('ru', 'bro', 'review.mood.5', undefined, 'gym')).toBe('Мощь');
    expect(translate('ru', 'bro', 'tab.today', undefined, 'gym')).toBe('Сегодня');
    expect(translate('en', 'bro', 'rank.leader', undefined, 'gym')).toBe('Dungeon master');
    expect(translate('ru', 'bro', 'tab.habits', undefined, 'gym')).toBe('Подходы');
    expect(translate('en', 'bro', 'quote.0', undefined, 'gym')).not.toBe(en['quote.0']);
  });

  test('unknown placeholders are left as is', () => {
    expect(translate('ru', 'bro', 'pack.with', { count: 2, other: 'x' })).toBe('с тобой 2 дня');
  });
});

describe('словари', () => {
  const ruKeys = Object.keys(ru).sort();

  test.each(LOCALES)('%s: те же ключи, что в ru', (locale) => {
    expect(Object.keys(DICTS[locale]).sort()).toEqual(ruKeys);
  });

  test.each(LOCALES)('%s: тон — оба варианта, формы — полный набор, строки не пустые', (locale) => {
    const forms = locale === 'ru' ? ['few', 'many', 'one', 'other'] : ['one', 'other'];
    for (const [key, msg] of Object.entries(DICTS[locale])) {
      const variants =
        typeof msg === 'object' && 'plain' in msg ? [msg.plain, msg.bro] : [msg as unknown];
      for (const v of variants) {
        if (typeof v === 'string') {
          expect([key, v.trim().length > 0]).toEqual([key, true]);
        } else {
          expect([key, Object.keys(v as object).sort()]).toEqual([key, forms]);
        }
      }
    }
  });

  test.each(['en', 'es'] as const)('%s: подстановки те же, что в ru', (locale) => {
    const holes = (m: Message) => [...new Set(JSON.stringify(m).match(/\{\w+\}/g) ?? [])].sort();
    for (const key of ruKeys) {
      expect([key, holes(DICTS[locale][key])]).toEqual([key, holes(ru[key as MessageKey])]);
    }
  });

  test('«Качалка»: ключи из словаря, подстановки те же, слов Босса столько же, сколько цитат', () => {
    for (const locale of LOCALES) {
      for (const [key, msg] of Object.entries(GYM[locale])) {
        expect([key, key in ru]).toEqual([key, true]);
        const holes = (m: unknown) =>
          [...new Set(JSON.stringify(m).match(/\{\w+\}/g) ?? [])].sort();
        expect([key, holes(msg)]).toEqual([key, holes(ru[key as MessageKey])]);
      }
    }
    for (const locale of LOCALES) {
      const gymQuotes = Object.keys(GYM[locale]).filter((k) => k.startsWith('quote.'));
      expect([locale, gymQuotes.length]).toEqual([locale, quoteCount(locale)]);
    }
  });

  test('цитат одинаково во всех языках', () => {
    expect(new Set(LOCALES.map((l) => quoteCount(l))).size).toBe(1);
  });
});
