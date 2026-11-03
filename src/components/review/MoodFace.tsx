import React from 'react';
import { FaceIcon } from '../icons/FaceIcon';
import { MoodType } from '../icons/faceIcons';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Props = { mood: number; size?: Size };

const MOOD_TO_TYPE: Record<number, MoodType> = {
  1: 'sad',
  2: 'angry',
  3: 'neutral',
  4: 'smile',
  5: 'laugh',
};

export const MoodFace: React.FC<Props> = ({ mood, size = 'md' }) => {
  const type = MOOD_TO_TYPE[mood] ?? 'neutral';
  return <FaceIcon type={type} sizeClass={size} />;
};
