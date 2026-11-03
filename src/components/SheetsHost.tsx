import React from 'react';
import { TaskSheet } from './tasks/TaskSheet';
import { HabitSheet } from './habits/HabitSheet';
import { ProgressSheet } from './habits/ProgressSheet';
import { RestSheet } from './habits/RestSheet';
import { AreaSheet } from './areas/AreaSheet';
import { AreaEditSheet } from './areas/AreaEditSheet';
import { GoalSheet } from './goals/GoalSheet';
import { GoalDetailSheet } from './goals/GoalDetailSheet';
import { ReviewSheet } from './review/ReviewSheet';
import { ReviewHistorySheet } from './review/ReviewHistorySheet';

export const SheetsHost: React.FC = () => (
  <>
    <TaskSheet />
    <HabitSheet />
    <ProgressSheet />
    <RestSheet />
    <AreaSheet />
    <AreaEditSheet />
    <GoalSheet />
    <GoalDetailSheet />
    <ReviewSheet />
    <ReviewHistorySheet />
  </>
);
