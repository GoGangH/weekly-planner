'use client';

import { useEffect, useState, useMemo } from 'react';
import { useTaskStore } from '@/stores/taskStore';
import { Task, TaskFormData, TaskStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TaskForm } from '@/components/tasks/TaskForm';
import { Plus, Clock, Trash2, Edit2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/stores/settingsStore';

type TabType = 'all' | 'backlog' | 'scheduled' | 'completed';

export default function TasksPage() {
  const { tasks, fetchTasks, addTask, updateTask, deleteTask } = useTaskStore();
  const { categories } = useSettingsStore();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleFormSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
    setIsFormOpen(false);
    setEditingTask(null);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleDelete = (taskId: string) => {
    if (confirm('이 할 일을 삭제할까요?')) {
      deleteTask(taskId);
    }
  };

  const filteredTasks = useMemo(() => {
    if (activeTab === 'all') return tasks;
    return tasks.filter((t) => t.status === activeTab);
  }, [tasks, activeTab]);

  const taskCounts = useMemo(() => ({
    all: tasks.length,
    backlog: tasks.filter((t) => t.status === 'backlog').length,
    scheduled: tasks.filter((t) => t.status === 'scheduled').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }), [tasks]);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'backlog', label: '백로그' },
    { key: 'scheduled', label: '예정' },
    { key: 'completed', label: '완료' },
  ];

  const getCategoryIcon = (category?: string) => {
    return categories.find(c => c.value === category)?.icon || '📌';
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">할 일</h1>
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center justify-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-lg"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-5 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {tab.label}
              <span className={cn(
                'text-xs',
                activeTab === tab.key ? 'text-primary-foreground/80' : 'text-muted-foreground/60'
              )}>
                {taskCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>
      </header>

      {/* Task List */}
      <ScrollArea className="flex-1">
        <div className="px-5 py-4 space-y-2">
          {filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-muted p-4 mb-4">
                <TaskIcon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">
                {activeTab === 'all' ? '할 일이 없어요' : `${tabs.find(t => t.key === activeTab)?.label} 할 일이 없어요`}
              </p>
              {activeTab === 'all' && (
                <button
                  onClick={() => setIsFormOpen(true)}
                  className="text-primary text-sm mt-2"
                >
                  첫 할 일 만들기
                </button>
              )}
            </div>
          ) : (
            filteredTasks.map((task, index) => (
              <div
                key={task.id}
                className="group relative rounded-2xl bg-card p-4 shadow-sm animate-slide-up"
                style={{
                  animationDelay: `${index * 30}ms`,
                  borderLeft: `4px solid ${task.color}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">{getCategoryIcon(task.category)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium',
                      task.status === 'completed' && 'line-through text-muted-foreground'
                    )}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDuration(task.estimatedMinutes)}
                      </span>
                      {task.isRecurring && (
                        <span className="bg-muted px-2 py-0.5 rounded-full">반복</span>
                      )}
                      <span className={cn(
                        'px-2 py-0.5 rounded-full',
                        task.status === 'backlog' && 'bg-muted',
                        task.status === 'scheduled' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                        task.status === 'completed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      )}>
                        {task.status === 'backlog' && '백로그'}
                        {task.status === 'scheduled' && '예정'}
                        {task.status === 'completed' && '완료'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(task)}
                      className="rounded-full p-2 hover:bg-muted text-muted-foreground"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="rounded-full p-2 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Task Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) setEditingTask(null);
      }}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingTask ? '할 일 수정' : '새 할 일'}</DialogTitle>
          </DialogHeader>
          <TaskForm
            initialData={editingTask || undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingTask(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
