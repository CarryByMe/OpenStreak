import React from 'react';
import { View } from 'react-native';
import { TaskRow } from './TaskRow';
import { Task } from '../../types/models';

type Props = {
  tasks: Task[];
};

export const TaskList: React.FC<Props> = ({ tasks }) => {
  if (!tasks.length) return null;

  return (
    <View>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </View>
  );
};
