/**
 * Строки «Качалки» (design/gachi) поверх обычного словаря: Босс качалки вместо волка, звания
 * зала, блин от штанги вместо луны. Ключей, которых здесь нет, оформление не меняет.
 * Голос Босса — короткие фразы про зал и подходы, без пошлости; свой персонаж, не реальный человек.
 * Цитаты — только по-русски; в en и es показываются обычные.
 */
import type { MessageKey } from './ru';
import type { Locale, Message } from './types';

type Overrides = Partial<Record<MessageKey, Message>>;

const ru: Overrides = {
  'tab.pack': 'Зал',

  'wolf.smirk': 'Босс качалки в деле',
  'wolf.proud': 'Босс качалки доволен',
  'wolf.meh': 'Босс качалки недоволен, но верит',
  'wolf.signature': '— Босс качалки ♂',

  'today.toFull': 'до полного блина — {count}',
  'today.fullMoon': 'полный блин',
  'today.closed': 'полный блин. День закрыт.',
  'widget.allDone': { plain: 'всё сделано', bro: 'полный блин!' },

  'settings.quotes': 'Слова Босса',

  'rank.pup': 'Новичок в зале',
  'rank.cub': 'Парень по соседству',
  'rank.wolf': 'Качок',
  'rank.leader': 'Мастер подземелья',
  'rank.alpha': 'Босс качалки',

  'review.mood.1': { plain: 'Плохо', bro: 'Слил' },
  'review.mood.2': { plain: 'Так себе', bro: 'Разминка' },
  'review.mood.3': { plain: 'Нормально', bro: 'Рабочий вес' },
  'review.mood.4': { plain: 'Хорошо', bro: 'Крепко' },
  'review.mood.5': { plain: 'Отлично', bro: 'Мощь' },

  'closed.title': 'День закрыт ♂',

  // Слова Босса — одна фраза в день, вместо цитат волка (столько же, сколько цитат волка)
  'quote.0': 'Боль уходит, серия остаётся. Ещё один подход.',
  'quote.1': 'Слабость выходит с потом. Потей.',
  'quote.2': 'В этом зале один босс. Сегодня — ты.',
  'quote.3': 'Диван не жмёт. Поэтому на нём и не растут.',
  'quote.4': 'Нет настроения — есть план тренировки.',
  'quote.5': 'Долг — это недожатый вес. Дожми.',
  'quote.6': 'Сначала подход, потом разговоры.',
  'quote.7': 'Серия — это не цифра. Это мозоли.',
  'quote.8': 'Лёгкий вес никого не сделал мастером.',
  'quote.9': 'Кожа скрипит, гриф гнётся, дело делается.',
  'quote.10': 'Не жди понедельника. Жми сегодня.',
  'quote.11': 'Слил подход — не беда. Бросил зал — беда.',
  'quote.12': 'Мотивация — разминка. Привычка — рабочий вес.',
  'quote.13': 'В подземелье не ноют. В подземелье делают.',
  'quote.14': 'Каждый блин на штанге кто-то повесил сам.',
  'quote.15': 'Хочешь как вчера — жми как вчера. Хочешь больше — вешай ещё.',
  'quote.16': 'Боль временна. Галочка навсегда.',
  'quote.17': 'Тихо зашёл, отработал, ушёл. Пусть говорит результат.',
  'quote.18': 'Устал? Отлично. Значит, работаешь.',
  'quote.19': 'Сорвался — встань и добери повторы.',
  'quote.20': 'Отдых — тоже подход. Но не весь день.',
  'quote.21': 'Мастером подземелья не рождаются. Им отрабатывают.',
  'quote.22': 'Пропустил день — завтра без жалоб и без пропуска.',
  'quote.23': 'Список дел — твой план тренировки. Открой его.',
  'quote.24': 'Крепкий день собирается по одному повтору.',
  'quote.25': 'Не сравнивай веса. Сравнивай себя со вчерашним.',
  'quote.26': 'Хочешь уважения в зале — закрой день.',
  'quote.27': 'Ещё один подход, салага. Потом ещё один.',
  'quote.28': 'Сила не в мышцах. Сила в том, что ты пришёл.',
};

const en: Overrides = {
  'tab.pack': 'Gym',

  'wolf.smirk': 'The gym boss is on it',
  'wolf.proud': 'The gym boss is pleased',
  'wolf.meh': 'The gym boss is not happy, but believes in you',
  'wolf.signature': '— the gym boss ♂',

  'today.toFull': '{count} to a full plate',
  'today.fullMoon': 'full plate',
  'today.closed': 'full plate. Day closed.',
  'widget.allDone': { plain: 'all done', bro: 'full plate!' },

  'settings.quotes': 'Boss quotes',

  'rank.pup': 'Gym rookie',
  'rank.cub': 'Boy next door',
  'rank.wolf': 'Lifter',
  'rank.leader': 'Dungeon master',
  'rank.alpha': 'Gym boss',

  'closed.title': 'Day closed ♂',
};

const es: Overrides = {
  'tab.pack': 'Gimnasio',

  'wolf.smirk': 'El jefe del gimnasio está en ello',
  'wolf.proud': 'El jefe del gimnasio está contento',
  'wolf.meh': 'El jefe del gimnasio no está contento, pero cree en ti',
  'wolf.signature': '— el jefe del gimnasio ♂',

  'today.toFull': '{count} para el disco completo',
  'today.fullMoon': 'disco completo',
  'today.closed': 'disco completo. Día cerrado.',
  'widget.allDone': { plain: 'todo hecho', bro: '¡disco completo!' },

  'settings.quotes': 'Frases del jefe',

  'rank.pup': 'Novato del gimnasio',
  'rank.cub': 'El chico de al lado',
  'rank.wolf': 'Musculitos',
  'rank.leader': 'Amo de la mazmorra',
  'rank.alpha': 'Jefe del gimnasio',

  'closed.title': 'Día cerrado ♂',
};

export const GYM: Record<Locale, Overrides> = { ru, en, es };
