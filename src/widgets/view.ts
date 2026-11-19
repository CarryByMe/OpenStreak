/**
 * Вид виджета «Сегодня»: готовые тексты (на языке и в тоне настроек), цвета одной темы и строки.
 * Всё сериализуется в JSON — виджет рисуется вне интерфейса приложения (фоновая задача на Android,
 * отдельный процесс на iOS), поэтому ему нельзя полагаться ни на сторы, ни на хуки.
 */
import { weekday } from '../core/dates';
import type { ISODate, Snapshot } from '../core/model';
import { effectiveSettings, flavorOf } from '../core/settings';
import { todayWidgetModel, type WidgetState } from '../core/widget';
import { translate, type MessageKey } from '../i18n';
import { isSticker, resolvePalette, type Design, type Scheme } from '../theme/palette';
import { FONT } from '../theme/fonts';
import { SCHEME, WIDGET_LINKS } from './links';
import { ensureContrast } from '../theme/readable';

/** «Обычный» и «Минималистичный» — мягкая карточка; «АУФ» и «Качалка» — наклейка «Мульта». */
export type WidgetLook = 'soft' | 'mult';

export type WidgetColors = {
  surface: string;
  text: string;
  muted: string;
  /** кольца отметок и луны */
  ring: string;
  /** обводка наклейки и жёсткая тень («Мульт») */
  line: string;
  shadow: string;
  divider: string;
  /** тёмная сторона луны, дорожка дуги прогресса */
  track: string;
  /** акцент: дуга и кнопка (в «Мульте» — луна и главное действие) */
  accent: string;
  onAccent: string;
  /** «сделано» */
  ok: string;
  onOk: string;
  /** долг */
  red: string;
  onRed: string;
  /** плашка с датой («Мульт») */
  tag: string;
  crater: string;
  craterRed: string;
};

/** Шрифты виджета: имя файла без расширения (шрифты кладёт в сборку config plugin, см. app.json). */
export type WidgetFonts = { text: string; strong: string; num: string };

export function fontsOf(design: Design): WidgetFonts {
  switch (design) {
    case 'auf':
      return { text: FONT.rubik.medium, strong: FONT.rubik.bold, num: FONT.unbounded.bold };
    case 'gym':
      return { text: FONT.golos.medium, strong: FONT.golos.bold, num: FONT.oswald.bold };
    case 'minimal':
      return { text: FONT.inter.medium, strong: FONT.inter.bold, num: FONT.inter.bold };
    default:
      return { text: FONT.golos.medium, strong: FONT.golos.bold, num: FONT.manrope.extrabold };
  }
}

export type WidgetRowView = {
  id: string;
  kind: 'task' | 'habit';
  title: string;
  /** 0…1 */
  fraction: number;
  debt: boolean;
  bad: boolean;
  /** у дела есть пункты: нажатие на отметку открывает приложение, а не закрывает дело */
  hasItems: boolean;
  /** цвет отметки (сфера или привычка), уже с нужным контрастом; в «Мульте» не используется */
  color: string;
  /** подпись справа: «60/100», «19:00», «9 дн», «долг»; пустая — нет */
  meta: string;
  /** «Отметить: …» — для чтения с экрана и подсказки нажатия на отметку */
  markLabel: string;
  /** только что отмечена: строка показывается «защёлкнутой» перед тем, как уйти из списка */
  done?: boolean;
};

/** Ссылки, которые открывает виджет: приложение, «+» и «Закрыть день». */
export type WidgetLinkSet = { open: string; add: string; review: string };

export type TodayWidgetView = {
  look: WidgetLook;
  scheme: Scheme;
  colors: WidgetColors;
  fonts: WidgetFonts;
  state: WidgetState;
  /** «Пн, 16 ноября» */
  date: string;
  /** «день 47 · серия 14» */
  sub: string;
  done: number;
  total: number;
  /** фаза луны дня 0…1 */
  phase: number;
  /** «Сделано 5 из 8» — для чтения с экрана */
  progressLabel: string;
  /** «осталось 3» */
  restLabel: string;
  /** подпись под счётом, когда всё сделано: «всё сделано» / «полнолуние!» */
  fullCaption: string;
  /** текст рядом с кнопкой «Закрыть день» или итог закрытого дня */
  message: string;
  closeLabel: string;
  /** «Сделано · 5»; null — пока ничего не сделано */
  doneLabel: string | null;
  addLabel: string;
  openLabel: string;
  links: WidgetLinkSet;
  /** все «ближайшие» строки; сколько поместится — решает размер виджета */
  rows: WidgetRowView[];
};

export function lookOf(design: Design): WidgetLook {
  return isSticker(design) ? 'mult' : 'soft';
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function colorsOf(design: Design, scheme: Scheme): WidgetColors {
  const p = resolvePalette(scheme, design);
  return {
    surface: p.surface,
    text: p.text,
    muted: p.muted,
    ring: p.ring,
    line: p.line,
    shadow: p.shadow,
    divider: p.divider,
    track: p.track,
    accent: p.sun,
    onAccent: p.onSun,
    ok: p.teal,
    onOk: p.onTeal,
    red: p.red,
    onRed: p.onRed,
    tag: p.tag,
    crater: p.crater,
    craterRed: p.craterRed,
  };
}

/**
 * Виджет «Сегодня» для одной темы. Данные — снимок и «сегодня» из стора; тема, оформление,
 * язык и тон — из настроек в данных.
 */
export function buildTodayView(snap: Snapshot, today: ISODate, scheme: Scheme): TodayWidgetView {
  const settings = effectiveSettings(snap);
  const design = settings.design;
  const look = lookOf(design);
  const t = (key: MessageKey, params?: Parameters<typeof translate>[3]) =>
    translate(settings.locale, settings.tone, key, params, flavorOf(settings));

  const m = todayWidgetModel(snap, today);
  const colors = colorsOf(design, scheme);

  const rows = m.rows.map((r): WidgetRowView => {
    const meta = (() => {
      switch (r.meta.kind) {
        case 'debt':
          return t('widget.debt');
        case 'numeric':
          return t('row.numeric', { value: r.meta.value, target: r.meta.target });
        case 'subtasks':
          return t('row.numeric', { value: r.meta.done, target: r.meta.total });
        case 'time':
          return r.meta.time;
        case 'streak':
          return t('row.streakShort', { count: r.meta.days });
        default:
          return '';
      }
    })();
    return {
      id: r.id,
      kind: r.kind,
      title: r.title,
      fraction: r.fraction,
      debt: r.debt,
      bad: r.bad,
      hasItems: r.hasItems,
      color:
        look === 'soft'
          ? ensureContrast(r.color ?? colors.accent, [colors.surface], 3)
          : colors.ring,
      meta,
      markLabel: t('a11y.check', { title: r.title }),
    };
  });

  const message =
    m.state === 'ready'
      ? t('widget.ready', { points: t('today.points', { count: m.closeBonus }) })
      : m.state === 'closed'
        ? t('widget.closed')
        : m.state === 'empty'
          ? t('widget.empty')
          : '';

  return {
    look,
    scheme,
    colors,
    fonts: fontsOf(design),
    state: m.state,
    date: t('widget.date', {
      weekday: capitalize(t(`day.short.${weekday(today)}` as MessageKey)),
      day: Number(today.slice(8, 10)),
      month: t(`date.month.${Number(today.slice(5, 7)) - 1}` as MessageKey),
    }),
    sub: t(m.streak > 0 ? 'today.meta' : 'today.metaFirst', {
      day: m.number,
      streak: m.streak,
    }),
    done: m.done,
    total: m.total,
    phase: m.phase,
    progressLabel: t('today.progress', { done: m.done, total: m.total }),
    restLabel: t('today.restCount', { count: m.rest }),
    fullCaption: t(m.state === 'closed' ? 'widget.closedCaption' : 'widget.allDone'),
    message,
    closeLabel: t('review.close'),
    doneLabel: m.done > 0 ? t('widget.doneCount', { count: m.done }) : null,
    addLabel: t('widget.add'),
    openLabel: t('widget.openApp'),
    links: { open: `${SCHEME}://`, add: WIDGET_LINKS.add, review: WIDGET_LINKS.review },
    rows,
  };
}

/**
 * Виды для светлой и тёмной темы системы (виджет сам выбирает по системной теме). Если в настройках
 * выбрана конкретная тема («День» или «Вечер»), обе системные получают её — как выбрано.
 */
export function buildTodayViews(snap: Snapshot, today: ISODate): Record<Scheme, TodayWidgetView> {
  const mode = effectiveSettings(snap).theme;
  const pick = (system: Scheme): Scheme => (mode === 'system' ? system : mode);
  return {
    light: buildTodayView(snap, today, pick('light')),
    dark: buildTodayView(snap, today, pick('dark')),
  };
}

/** Строка, которую только что отметили, и её место в списке — по виду каждой темы. */
export type WidgetGhost = Record<Scheme, { index: number; row: WidgetRowView }>;

/** Найти строку в видах до отметки; null — в виджете такой строки не было (он устарел). */
export function ghostOf(
  before: Record<Scheme, TodayWidgetView>,
  target: { kind: 'task' | 'habit'; id: string }
): WidgetGhost | null {
  const find = (view: TodayWidgetView) => {
    const index = view.rows.findIndex((r) => r.kind === target.kind && r.id === target.id);
    return index < 0 ? null : { index, row: view.rows[index] };
  };
  const light = find(before.light);
  const dark = find(before.dark);
  return light && dark ? { light, dark } : null;
}

/**
 * Вид после отметки с «призраком» отмеченной строки на прежнем месте: Android-виджет не умеет
 * анимацию, поэтому показываем два кадра — «защёлкнулось» и итог без строки.
 */
export function applyGhost(
  views: Record<Scheme, TodayWidgetView>,
  ghost: WidgetGhost
): Record<Scheme, TodayWidgetView> {
  const apply = (scheme: Scheme): TodayWidgetView => {
    const view = views[scheme];
    const rows = view.rows.slice();
    const { index, row } = ghost[scheme];
    rows.splice(Math.min(index, rows.length), 0, { ...row, done: true, meta: '' });
    return { ...view, rows };
  };
  return { light: apply('light'), dark: apply('dark') };
}
