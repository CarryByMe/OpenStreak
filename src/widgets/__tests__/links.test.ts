import { describe, expect, test } from '@jest/globals';
import { parseWidgetLink, WIDGET_LINKS } from '../links';

describe('ссылки виджета', () => {
  test('свои ссылки разбираются', () => {
    expect(parseWidgetLink(WIDGET_LINKS.add)).toBe('add');
    expect(parseWidgetLink(WIDGET_LINKS.review)).toBe('review');
    expect(parseWidgetLink('openstreak://widget/add/')).toBe('add');
    expect(parseWidgetLink('OPENSTREAK://widget/review?x=1')).toBe('review');
  });

  test('чужие и пустые — нет', () => {
    expect(parseWidgetLink(null)).toBeNull();
    expect(parseWidgetLink('')).toBeNull();
    expect(parseWidgetLink('https://example.com/widget/add')).toBeNull();
    expect(parseWidgetLink('openstreak://widget/delete')).toBeNull();
    expect(parseWidgetLink('openstreak://other/add')).toBeNull();
  });
});
