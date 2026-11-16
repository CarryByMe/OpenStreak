import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import palettes from '../palettes.json';
import {
  isThemeMode,
  moodScale,
  resolvePalette,
  resolveScheme,
  type Design,
  type Scheme,
} from '../palette';

const mockStore = new Map<string, string>();
jest.mock('../../services/storage', () => ({
  THEME_KEY: 'theme',
  storage: {
    getString: async (k: string) => mockStore.get(k),
    setString: async (k: string, v: string) => void mockStore.set(k, v),
  },
}));

const SCHEMES: Scheme[] = ['dark', 'light'];
const DESIGNS: Design[] = ['normal', 'minimal', 'auf'];
const ALL = DESIGNS.flatMap((d) => SCHEMES.map((s) => [s, d] as const));

describe('palette', () => {
  test('all six themes have the same keys, all hex', () => {
    const keys = Object.keys(resolvePalette('dark', 'auf')).sort();
    for (const [scheme, design] of ALL) {
      expect(Object.keys(resolvePalette(scheme, design)).sort()).toEqual(keys);
      for (const [key, value] of Object.entries(resolvePalette(scheme, design))) {
        expect([key, value]).toEqual([key, expect.stringMatching(/^#[0-9A-F]{6}$/)]);
      }
    }
  });

  test('every checked colour exists in every theme', () => {
    for (const [fg, bg] of palettes.checks) {
      for (const [scheme, design] of ALL) {
        expect(resolvePalette(scheme, design)).toHaveProperty(fg);
        expect(resolvePalette(scheme, design)).toHaveProperty(bg);
      }
    }
  });

  test('minimal design has one accent for action, selection and done; no shadow', () => {
    for (const scheme of SCHEMES) {
      const p = resolvePalette(scheme, 'minimal');
      expect(p.sun).toBe(p.teal);
      expect(p.sun).not.toBe(p.text);
      expect(p.shadow).toBe(p.bg);
    }
  });

  test('шкала лиц настроения: пять цветов заливки, каймы и черт в обеих темах', () => {
    for (const scheme of SCHEMES) {
      const m = moodScale(scheme);
      for (const part of [m.fill, m.ring, m.ink]) {
        expect(part).toHaveLength(5);
        for (const c of part) expect(c).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  test('scheme: explicit mode wins, system falls back to night', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', null)).toBe('dark');
  });

  test('guard rejects unknown values', () => {
    expect(isThemeMode('system')).toBe(true);
    expect(isThemeMode('night')).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
  });
});

describe('themeStore', () => {
  beforeEach(() => {
    mockStore.clear();
    jest.resetModules();
  });

  const load = async () => {
    // Свежий модуль на каждый тест: стор создаётся при импорте.
    const { useThemeStore } =
      jest.requireActual<typeof import('../../store/themeStore')>('../../store/themeStore');
    await useThemeStore.getState().loadTheme();
    return useThemeStore;
  };

  test('default follows the system', async () => {
    expect((await load()).getState().mode).toBe('system');
  });

  test('old saved light/dark value still works', async () => {
    mockStore.set('theme', 'light');
    const s = (await load()).getState();
    expect(s.scheme).toBe('light');
    expect(s.palette.bg).toBe(palettes.themes.normalLight.bg);
  });

  test('garbage in storage is ignored', async () => {
    mockStore.set('theme', 'night');
    expect((await load()).getState().mode).toBe('system');
  });

  test('setMode persists and recomputes the palette', async () => {
    const st = await load();
    await st.getState().setMode('dark');
    expect(mockStore.get('theme')).toBe('dark');
    expect(st.getState().palette.text).toBe(palettes.themes.normalDark.text);
    await st.getState().setMode('light');
    expect(st.getState().scheme).toBe('light');
    expect(st.getState().palette.bg).toBe(palettes.themes.normalLight.bg);
  });

  test('applyDesign switches the palette and the live metrics', async () => {
    const { RADIUS } = jest.requireActual<typeof import('../metrics')>('../metrics');
    const st = await load();
    await st.getState().setMode('light');
    expect(st.getState().design).toBe('normal');
    expect(RADIUS.md).toBe(14);
    st.getState().applyDesign('auf');
    expect(st.getState().palette.bg).toBe(palettes.themes.light.bg);
    expect(RADIUS.md).toBe(16);
    st.getState().applyDesign('minimal');
    expect(st.getState().palette.bg).toBe(palettes.themes.minimalLight.bg);
    expect(RADIUS.md).toBe(12);
    st.getState().applyDesign('normal');
    expect(st.getState().palette.bg).toBe(palettes.themes.normalLight.bg);
    expect(RADIUS.md).toBe(14);
  });
});
