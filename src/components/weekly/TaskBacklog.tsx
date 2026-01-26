'use client';

import { useDroppable } from '@dnd-kit/core';
import { Task } from '@/types';
import { TaskCard } from '@/components/tasks/TaskCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface TaskBacklogProps {
  tasks: Task[];
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
}

export function TaskBacklog({
  tasks,
  onEditTask,
  onDeleteTask,
  onTaskClick,
}: TaskBacklogProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'backlog',
    data: { type: 'backlog' },
  });

  return (
    <ScrollArea className="flex-1">
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-full space-y-2 p-3',
          isOver && 'bg-primary/5'
        )}
      >
        {tasks.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            백로그가 비어있습니다
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onClick={onTaskClick}
              compact
            />
          ))
        )}
      </div>
    </ScrollArea>
  );
}
