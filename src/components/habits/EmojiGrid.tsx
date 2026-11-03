import React from 'react';
import { IconGrid } from '../icons/IconGrid';

type Props = { selected: string; onSelect: (key: string) => void };

/** Выбор иконки привычки. Раскладка и размеры — в icons/IconGrid. */
export const EmojiGrid: React.FC<Props> = ({ selected, onSelect }) => (
  <IconGrid selected={selected} onSelect={onSelect} />
);
