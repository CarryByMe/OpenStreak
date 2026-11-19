/**
 * Шкала текста «Мульта» (design/mult): Unbounded — заголовки и числа, Rubik — всё остальное.
 * Подписи обычным регистром, цифры табличные. Цвет не задаётся: его берут из палитры.
 */
import type { TextStyle } from 'react-native';
import { currentDesign } from './design';
import type { Design } from './palette';
import { FONT } from './fonts';

type Variant = Pick<
  TextStyle,
  'fontFamily' | 'fontSize' | 'lineHeight' | 'letterSpacing' | 'fontVariant'
>;

function make(family: string, size: number, lh: number, tracking: number): Variant {
  return {
    fontFamily: family,
    fontSize: size,
    lineHeight: Math.round(size * lh),
    letterSpacing: Math.round(size * tracking * 100) / 100,
    fontVariant: ['tabular-nums'],
  };
}

/** Unbounded: заголовки, числа, главная кнопка. */
const display = (size: number, weight: keyof typeof FONT.unbounded, lh = 1.15, tracking = 0) =>
  make(FONT.unbounded[weight], size, lh, tracking);

/** Rubik: текст. */
const text = (size: number, weight: keyof typeof FONT.rubik, lh = 1.3) =>
  make(FONT.rubik[weight], size, lh, 0);

const TYPE_AUF = {
  /** «День закрыт.» */
  display: display(40, 'extrabold', 1.05, -0.02),
  /** счёт дня: «3 / 8» */
  numberXL: display(44, 'extrabold', 1.05, -0.02),
  /** вторая часть счёта: « / 8» */
  numberXLLight: display(44, 'semibold', 1.05, -0.02),
  /** счёт на карточке привычки: «60 / 100» */
  numberScore: display(34, 'extrabold', 1.05, -0.02),
  numberScoreLight: display(34, 'semibold', 1.05, -0.02),
  /** заголовок экрана: «Привычки» */
  title: display(30, 'extrabold', 1.15, -0.02),
  /** звание: «Волк» */
  rank: display(32, 'extrabold', 1.1),
  /** число на наклейке: «47», «23» */
  numberL: display(28, 'extrabold', 1.1),
  /** число в строке: серия «14», «−3» */
  numberM: display(20, 'extrabold', 1.15),
  /** заголовок наклейки и шторки: «Пробежать полумарафон», «Новое» */
  heading: display(22, 'extrabold', 1.2),
  /** главная кнопка: «Записать» */
  button: display(17, 'bold', 1.25),
  /** дата-плашка в шапке «Сегодня» */
  dateLine: display(15, 'bold', 1.3),
  /** бейдж: «+30 очков», «60/100» */
  badge: display(13, 'bold', 1.3),
  /** главное поле шторки */
  input: text(20, 'semibold', 1.3),
  /** выделенное: название привычки */
  itemStrong: text(17, 'semibold', 1.3),
  /** дело или привычка в строке */
  item: text(16, 'medium', 1.3),
  /** цитата волка */
  quote: text(15, 'medium', 1.35),
  /** строка настроек: «Пацанский тон» */
  row: text(15, 'medium', 1.3),
  /** основной текст, поля ввода */
  body: text(15, 'regular', 1.45),
  /** чипы, сегменты, кнопки второго плана */
  control: text(15, 'semibold', 1.25),
  /** плашка-заголовок: «Осталось · 4» */
  label: text(14, 'bold', 1.3),
  /** пояснение под счётом: «до полнолуния — 5» */
  note: text(14, 'regular', 1.35),
  /** пометка в журнале: «зачёт», «слив» */
  mark: text(13, 'semibold', 1.3),
  /** подпись под строкой, время */
  meta: text(13, 'regular', 1.35),
  /** подпись цитаты: «— волк» */
  caption: text(12, 'regular', 1.3),
  /** вкладка таб-бара */
  tab: text(11, 'medium', 1.25),
  /** подпись дня под луной */
  tiny: text(11, 'regular', 1.2),
} as const satisfies Record<string, Variant>;

export type TypeVariant = keyof typeof TYPE_AUF;

/** Вес Inter для варианта «Мульта»: Unbounded шире и жирнее, поэтому веса на ступень мягче. */
function plainFamily(family: string): string {
  if (family.startsWith('Unbounded')) {
    return family.includes('SemiBold') ? FONT.inter.medium : FONT.inter.semibold;
  }
  if (family.includes('Regular')) return FONT.inter.regular;
  if (family.includes('Medium')) return FONT.inter.medium;
  return FONT.inter.semibold;
}

/** Шкала «Минималистичного» (design/serious): тот же набор вариантов, но Inter и плотный трекинг у крупных. */
function plainVariant(v: Variant): Variant {
  const size = v.fontSize ?? 15;
  const big = size >= 28;
  return {
    ...v,
    fontFamily: plainFamily(v.fontFamily ?? ''),
    fontSize: v.fontSize === 30 ? 34 : v.fontSize,
    lineHeight: v.fontSize === 30 ? 38 : v.lineHeight,
    letterSpacing: big ? Math.round(size * -0.03 * 100) / 100 : 0,
  };
}

const TYPE_PLAIN = Object.fromEntries(
  Object.entries(TYPE_AUF).map(([k, v]) => [k, plainVariant(v)])
) as Record<TypeVariant, Variant>;

/** Шрифт «Обычного» (монолит): Manrope вместо Unbounded, Golos Text вместо Rubik. */
function normalFamily(family: string): string {
  if (family.startsWith('Unbounded')) {
    return family.includes('SemiBold') ? FONT.manrope.bold : FONT.manrope.extrabold;
  }
  if (family.includes('Regular')) return FONT.golos.regular;
  if (family.includes('Medium')) return FONT.golos.medium;
  if (family.includes('Bold') && !family.includes('Semi')) return FONT.golos.bold;
  return FONT.golos.semibold;
}

/** Шкала «Обычного»: те же варианты, шрифты монолита, плотный трекинг у крупных. */
function normalVariant(v: Variant): Variant {
  const size = v.fontSize ?? 15;
  return {
    ...v,
    fontFamily: normalFamily(v.fontFamily ?? ''),
    letterSpacing: size >= 28 ? Math.round(size * -0.02 * 100) / 100 : 0,
  };
}

const TYPE_NORMAL = Object.fromEntries(
  Object.entries(TYPE_AUF).map(([k, v]) => [k, normalVariant(v)])
) as Record<TypeVariant, Variant>;

/**
 * Шкала «Качалки» (design/gachi): Russo One — заголовки, кнопки и звание; узкий Oswald — числа,
 * метки и вкладки (он уже, поэтому числа на ступень крупнее); текст — Golos Text, как в «Обычном».
 */
const russo = (size: number, lh = 1.15) => make(FONT.russo.regular, size, lh, 0);
const oswald = (size: number, weight: keyof typeof FONT.oswald, lh = 1.15, tracking = 0) =>
  make(FONT.oswald[weight], size, lh, tracking);

const TYPE_GYM: Record<TypeVariant, Variant> = {
  ...TYPE_NORMAL,
  display: russo(36, 1.1),
  numberXL: oswald(50, 'bold', 1.05),
  numberXLLight: oswald(50, 'medium', 1.05),
  numberScore: oswald(38, 'bold', 1.05),
  numberScoreLight: oswald(38, 'medium', 1.05),
  title: russo(28, 1.15),
  rank: russo(28, 1.15),
  numberL: oswald(32, 'bold', 1.1),
  numberM: oswald(22, 'bold', 1.15),
  heading: russo(20, 1.2),
  button: russo(17, 1.25),
  dateLine: oswald(16, 'bold', 1.3, 0.06),
  badge: oswald(14, 'bold', 1.3, 0.04),
  label: oswald(15, 'medium', 1.3, 0.06),
  tab: oswald(12, 'medium', 1.25, 0.06),
};

const BY_DESIGN: Record<Design, Record<TypeVariant, Variant>> = {
  auf: TYPE_AUF,
  normal: TYPE_NORMAL,
  minimal: TYPE_PLAIN,
  gym: TYPE_GYM,
};

/** Шкала текста текущего оформления (читается в момент отрисовки). */
export const TYPE: Record<TypeVariant, Variant> = new Proxy(
  TYPE_AUF as Record<TypeVariant, Variant>,
  { get: (_t, key) => BY_DESIGN[currentDesign()][key as TypeVariant] }
);
