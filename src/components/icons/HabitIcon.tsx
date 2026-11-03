import React from 'react';
import { HabitIcons, HabitIconName } from './habitIcons';

type Props = { name: string; size?: number };

/** Старые записи хранили значок отдыха под ключом `lounge` —
 *  теперь это `palm`, но данные пользователя переписывать не нужно. */
const LEGACY_NAMES: Record<string, HabitIconName> = { lounge: 'palm' };

export const HabitIcon: React.FC<Props> = ({ name, size = 32 }) => {
  const key = (LEGACY_NAMES[name] ?? name) as HabitIconName;
  const Cmp = HabitIcons[key];
  if (!Cmp) return null;
  return <Cmp size={size} />;
};
