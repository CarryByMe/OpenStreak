import React from 'react';
import { FaceIcons, MoodType } from './faceIcons';

type SizeClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Props = { type?: MoodType; sizeClass?: SizeClass; mood?: number };

const MOOD_TO_TYPE: Record<number, MoodType> = {
  1: 'sad',
  2: 'angry',
  3: 'neutral',
  4: 'smile',
  5: 'laugh',
};

/** `type` необязателен: если передан `mood`, лицо берётся из него. */
export const FaceIcon: React.FC<Props> = ({ type = 'neutral', sizeClass, mood }) => {
  const t = (mood && MOOD_TO_TYPE[mood]) || type;
  return <FaceIcons type={t} sizeClass={sizeClass} />;
};
