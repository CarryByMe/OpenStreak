import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

type P = { size?: number; color?: string };
const base = (size = 24, color = '#000') => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: color,
});

export const Icons = {
  check: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M4.5 12.5l5 5L19.5 7" />
    </Svg>
  ),
  star: ({ size = 24, color = '#000' }: P) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </Svg>
  ),
  x: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={3} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  plus: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M12 5v14M5 12h14" />
    </Svg>
  ),
  trash: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round">
      <Path d="M4 7h16M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2m3 0l-.8 12a2 2 0 01-2 1.9H8.8a2 2 0 01-2-1.9L6 7" />
    </Svg>
  ),
  flag: ({ size = 24, color = '#000' }: P) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 3a1 1 0 011 1v1h9.6a1 1 0 01.9 1.45L15.6 10l1.9 3.55a1 1 0 01-.9 1.45H7v4a1 1 0 11-2 0V4a1 1 0 011-1z" />
    </Svg>
  ),
  cal: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round">
      <Rect x={4} y={5} width={16} height={16} rx={3} />
      <Path d="M4 10h16M8 3v4M16 3v4" />
    </Svg>
  ),
  repeat: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 12a8 8 0 10-2.3 5.6M20 12v-5M20 12h-5" />
    </Svg>
  ),
  note: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round">
      <Path d="M5 6h14M5 12h14M5 18h8" />
    </Svg>
  ),
  chev: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9l6 6 6-6" />
    </Svg>
  ),
  chevl: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M15 6l-6 6 6 6" />
    </Svg>
  ),
  chevr: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M9 6l6 6-6 6" />
    </Svg>
  ),
  sun: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={4.4} />
      <Path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5 5l1.7 1.7M17.3 17.3L19 19M19 5l-1.7 1.7M6.7 17.3L5 19" />
    </Svg>
  ),
  moon: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20.6 14.2A8.6 8.6 0 019.8 3.4a8.6 8.6 0 1010.8 10.8z" />
    </Svg>
  ),
  dl: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 4v10M8 10l4 4 4-4M5 20h14" />
    </Svg>
  ),
  ul: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 20V10M8 14l4-4 4 4M5 4h14" />
    </Svg>
  ),
  /** Копирование: два наложенных листа. */
  copy: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={9} y={9} width={11} height={11} rx={2.5} />
      <Path d="M15 6.5V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2h.5" />
    </Svg>
  ),
  layers: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M12 3.5l8.5 4.7L12 12.9 3.5 8.2z" />
      <Path d="M3.5 12.5l8.5 4.7 8.5-4.7" />
      <Path d="M3.5 16.5l8.5 4.7 8.5-4.7" />
    </Svg>
  ),
  bell: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6 9.5a6 6 0 0112 0c0 4 1.5 5.5 1.5 5.5h-15S6 13.5 6 9.5z" />
      <Path d="M10 18.5a2.2 2.2 0 004 0" />
    </Svg>
  ),
  search: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round">
      <Circle cx={11} cy={11} r={7} />
      <Path d="M20 20l-3.5-3.5" />
    </Svg>
  ),
  close: ({ size = 24, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.4} strokeLinecap="round">
      <Path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  ),
  nToday: ({ size = 28, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round">
      <Circle cx={12} cy={12} r={8.5} />
      <Path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </Svg>
  ),
  nTasks: ({ size = 28, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round">
      <Path d="M4 6.5l1.5 1.5L8 5.5M11 7h9M4 12.5l1.5 1.5L8 11.5M11 13h9M4 18.5l1.5 1.5L8 17.5M11 19h9" />
    </Svg>
  ),
  nHab: ({ size = 28, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M20 12a8 8 0 10-2.3 5.6M20 12v-5M20 12h-5" />
    </Svg>
  ),
  nCount: ({ size = 28, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M6.5 3h11M6.5 21h11M8 3v2.8L12 9.5l4-3.7V3M8 21v-2.8l4-3.7 4 3.7V21" />
    </Svg>
  ),
  nStats: ({ size = 28, color = '#000' }: P) => (
    <Svg {...base(size, color)} strokeWidth={2.2} strokeLinecap="round">
      <Path d="M5 20v-7M12 20V5M19 20v-10" />
    </Svg>
  ),
};

export type SystemIconName = keyof typeof Icons;
