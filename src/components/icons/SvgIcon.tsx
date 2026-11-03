import React from 'react';
import { Icons, SystemIconName } from './systemIcons';

type Props = { name: SystemIconName; size?: number; color?: string };

export const SvgIcon: React.FC<Props> = ({ name, size = 24, color = '#7c8698' }) => {
  const Cmp = Icons[name];
  if (!Cmp) return null;
  return <Cmp size={size} color={color} />;
};
