import React from 'react';
import { IconGrid } from '../icons/IconGrid';

type Props = { selectedIcon: string; onSelect: (icon: string) => void };

/** Выбор иконки сферы. Раскладка и размеры — в icons/IconGrid. */
export const IconPicker: React.FC<Props> = ({ selectedIcon, onSelect }) => (
  <IconGrid selected={selectedIcon} onSelect={onSelect} />
);
