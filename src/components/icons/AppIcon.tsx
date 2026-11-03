import React from 'react';
import { AppIcons, AppIconName } from './appIcons';

type SizeClass = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Props = { name: AppIconName; sizeClass?: SizeClass; size?: number };

/** Реэкспорт, чтобы экраны могли типизировать `emoji: AppIconName`. */
export type { AppIconName };

export const AppIcon: React.FC<Props> = ({ name, sizeClass = 'md', size }) => {
  const Cmp = AppIcons[name];
  if (!Cmp) return null;
  return <Cmp sizeClass={sizeClass} size={size} />;
};
