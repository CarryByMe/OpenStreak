/**
 * Палитра «Мульта»: «День» (light) и «Вечерний мульт» (dark).
 * Цвета берутся только из `palettes.json` — там же список пар для проверки контраста.
 */
import palettes from './palettes.json';

export type Scheme = 'light' | 'dark';
/**
 * Оформление: «Обычный» (`normal`, как в монолите CoolTick: мягкие карточки, синий акцент),
 * «Минималистичный» (`minimal`, строгий: линии и один акцент), «АУФ» (`auf`, мульт с волком)
 * или «Качалка» (`gym`, design/gachi: те же наклейки, но кожа, сталь и латунь, блин вместо луны,
 * Босс качалки вместо волка).
 */
export type Design = 'normal' | 'minimal' | 'auf' | 'gym';
export const DESIGNS: readonly Design[] = ['normal', 'minimal', 'auf', 'gym'];

export function isDesign(v: unknown): v is Design {
  return (DESIGNS as readonly unknown[]).includes(v);
}

/**
 * Оформление с наклейками, луной (блином), персонажем, цитатами и званиями: «АУФ» и «Качалка».
 * Остальные — «простые» (`usePlain`).
 */
export function isSticker(d: Design): boolean {
  return d === 'auf' || d === 'gym';
}
/** Что выбрал пользователь: конкретная тема или «как в системе». */
export type ThemeMode = Scheme | 'system';

export const THEME_MODES: readonly ThemeMode[] = ['dark', 'light', 'system'];

export type Palette = {
  /** фон экрана */
  bg: string;
  /** наклейка: карточки, поля, шторка, таб-бар */
  surface: string;
  /** основной текст */
  text: string;
  /** подписи и второй текст */
  muted: string;
  /** обводка наклеек */
  line: string;
  /** жёсткая тень наклеек */
  shadow: string;
  /** луна и главное действие */
  sun: string;
  onSun: string;
  /** зачёт, «включено» */
  teal: string;
  onTeal: string;
  /** только слив и долги */
  red: string;
  onRed: string;
  /** флажок и подпись приоритета задачи: низкий, средний (высокий — `red`) */
  prioLow: string;
  prioMid: string;
  /** значок карточки «лучшая серия» в «Итогах» */
  violet: string;
  /** плашки, пузырь цитаты, выбранная плитка */
  tag: string;
  /** плитки иконок привычек */
  sky: string;
  /** пунктир между строками в наклейке */
  divider: string;
  /** тёмная сторона луны, дорожки (прогресс, выключенный переключатель) */
  track: string;
  /** кольцо луны */
  ring: string;
  crater: string;
  craterRed: string;
  /** тост — инверсия к теме */
  toast: string;
  onToast: string;
  /** затемнение под шторкой (с прозрачностью из metrics) */
  scrim: string;
  knobOff: string;
  knobOn: string;
  /** рисунок волка и звёзды — декоративные, в проверку контраста не входят */
  fur: string;
  furShade: string;
  muzzle: string;
  ear: string;
  eye: string;
  tongue: string;
  drop: string;
  star: string;
};

type ThemeKey =
  Scheme | 'minimalLight' | 'minimalDark' | 'normalLight' | 'normalDark' | 'gymLight' | 'gymDark';
const themes = palettes.themes as Record<ThemeKey, Palette>;

export function themeKey(scheme: Scheme, design: Design): ThemeKey {
  if (design === 'auf') return scheme;
  const prefix = design === 'normal' ? 'normal' : design === 'gym' ? 'gym' : 'minimal';
  return `${prefix}${scheme === 'dark' ? 'Dark' : 'Light'}`;
}

export function resolvePalette(scheme: Scheme, design: Design = 'auf'): Palette {
  return themes[themeKey(scheme, design)];
}

/** Лица оценки дня 1…5 («Обычный»): заливка, кайма и черты каждого. */
export type MoodScale = { fill: string[]; ring: string[]; ink: string[] };

export function moodScale(scheme: Scheme): MoodScale {
  return palettes.mood[scheme];
}

/** Тема, которая реально показывается. `system` — null, если система не сообщила свою. */
export function resolveScheme(mode: ThemeMode, system: Scheme | null | undefined): Scheme {
  if (mode === 'system') return system ?? 'dark';
  return mode;
}

export function isThemeMode(v: unknown): v is ThemeMode {
  return typeof v === 'string' && (THEME_MODES as readonly string[]).includes(v);
}
