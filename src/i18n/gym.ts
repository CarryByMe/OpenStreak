/**
 * Строки «Качалки» (design/gachi) поверх обычного словаря: Босс качалки вместо волка, звания
 * зала, блин от штанги вместо луны. Ключей, которых здесь нет, оформление не меняет.
 * Голос Босса — короткие фразы про зал и подходы, без пошлости; свой персонаж, не реальный человек.
 */
import type { MessageKey } from './ru';
import type { Locale, Message } from './types';

type Overrides = Partial<Record<MessageKey, Message>>;

const ru: Overrides = {
  'tab.habits': 'Подходы',
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
  'tab.habits': 'Sets',
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

  // Boss quotes — one a day, instead of the wolf quotes
  'quote.0': 'Pain leaves, the streak stays. One more set.',
  'quote.1': 'Weakness leaves with the sweat. Sweat.',
  'quote.2': 'This gym has one boss. Today it is you.',
  'quote.3': 'The couch never lifts. That is why nobody grows on it.',
  'quote.4': 'No mood? You have a training plan.',
  'quote.5': 'A debt is a rep you did not finish. Finish it.',
  'quote.6': 'Set first, talk later.',
  'quote.7': 'A streak is not a number. It is calluses.',
  'quote.8': 'Light weight never made anyone a master.',
  'quote.9': 'Leather creaks, the bar bends, the work gets done.',
  'quote.10': 'Do not wait for Monday. Lift today.',
  'quote.11': 'Missed a set — fine. Quit the gym — not fine.',
  'quote.12': 'Motivation is the warm-up. Habit is the working weight.',
  'quote.13': 'Nobody whines in the dungeon. In the dungeon we work.',
  'quote.14': 'Every plate on the bar was loaded by hand.',
  'quote.15': 'Want yesterday? Lift like yesterday. Want more? Add weight.',
  'quote.16': 'Pain is temporary. The check mark is forever.',
  'quote.17': 'Walk in quiet, put in the work, walk out. Let the results talk.',
  'quote.18': 'Tired? Good. That means you are working.',
  'quote.19': 'Slipped? Get up and finish the reps.',
  'quote.20': 'Rest is a set too. Just not all day.',
  'quote.21': 'Nobody is born a dungeon master. You earn it rep by rep.',
  'quote.22': 'Missed a day? Tomorrow — no excuses, no skipping.',
  'quote.23': 'Your to-do list is your training plan. Open it.',
  'quote.24': 'A strong day is built one rep at a time.',
  'quote.25': 'Do not compare weights. Compare yourself to yesterday.',
  'quote.26': 'Want respect in this gym? Close the day.',
  'quote.27': 'One more set, rookie. Then one more.',
  'quote.28': 'Strength is not in the muscles. It is in showing up.',
};

const es: Overrides = {
  'tab.habits': 'Series',
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

  // Frases del jefe — una al día, en lugar de las del lobo
  'quote.0': 'El dolor se va, la racha se queda. Una serie más.',
  'quote.1': 'La debilidad se va con el sudor. Suda.',
  'quote.2': 'Este gimnasio tiene un jefe. Hoy eres tú.',
  'quote.3': 'El sofá no levanta pesas. Por eso nadie crece en él.',
  'quote.4': '¿Sin ganas? Tienes un plan de entrenamiento.',
  'quote.5': 'Una deuda es una repetición sin terminar. Termínala.',
  'quote.6': 'Primero la serie, luego la charla.',
  'quote.7': 'Una racha no es un número. Son callos.',
  'quote.8': 'El peso ligero no hizo maestro a nadie.',
  'quote.9': 'El cuero cruje, la barra se dobla, el trabajo se hace.',
  'quote.10': 'No esperes al lunes. Levanta hoy.',
  'quote.11': '¿Fallaste una serie? Pasa. ¿Dejaste el gimnasio? Eso no.',
  'quote.12': 'La motivación es el calentamiento. El hábito es el peso de trabajo.',
  'quote.13': 'En la mazmorra nadie se queja. En la mazmorra se trabaja.',
  'quote.14': 'Cada disco de la barra lo puso alguien con sus manos.',
  'quote.15': '¿Quieres lo de ayer? Levanta como ayer. ¿Quieres más? Pon más peso.',
  'quote.16': 'El dolor es temporal. La marca es para siempre.',
  'quote.17': 'Entra en silencio, trabaja, sal. Que hablen los resultados.',
  'quote.18': '¿Cansado? Bien. Significa que estás trabajando.',
  'quote.19': '¿Fallaste? Levántate y termina las repeticiones.',
  'quote.20': 'Descansar también es una serie. Pero no todo el día.',
  'quote.21': 'Nadie nace amo de la mazmorra. Se gana repetición a repetición.',
  'quote.22': '¿Perdiste un día? Mañana, sin excusas y sin faltar.',
  'quote.23': 'Tu lista de tareas es tu plan de entrenamiento. Ábrela.',
  'quote.24': 'Un día fuerte se construye repetición a repetición.',
  'quote.25': 'No compares pesos. Compárate con el de ayer.',
  'quote.26': '¿Quieres respeto en el gimnasio? Cierra el día.',
  'quote.27': 'Una serie más, novato. Y luego otra.',
  'quote.28': 'La fuerza no está en los músculos. Está en venir.',
};

export const GYM: Record<Locale, Overrides> = { ru, en, es };
