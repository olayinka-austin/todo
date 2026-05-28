import { Bell, AlertTriangle, Clock, CheckCircle2, Volume2 } from 'lucide-react';
import { Todo } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface DeadlineReminderBannerProps {
  todos: Todo[];
  onDismissReminder: (todoId: string) => Promise<void>;
  onToggleComplete: (todoId: string, currentCompleted: boolean) => Promise<void>;
}

export default function DeadlineReminderBanner({
  todos,
  onDismissReminder,
  onToggleComplete,
}: DeadlineReminderBannerProps) {
  // Filter active (uncompleted) todos with upcoming deadlines that have not been dismissed as reminded
  const activeReminders = todos.filter((todo) => {
    if (todo.completed || !todo.deadlineTime || todo.reminded) return false;
    
    const deadline = new Date(todo.deadlineTime).getTime();
    const now = Date.now();
    const diffMs = deadline - now;
    
    // Show reminders if overdue, or if due within 24 hours (86400000 ms)
    return diffMs < 86400000;
  });

  if (activeReminders.length === 0) return null;

  return (
    <div className="mb-6 space-y-3" id="reminders-banner-section">
      <div className="flex items-center gap-2 px-1">
        <Bell className="w-4 h-4 text-indigo-500 dark:text-indigo-400 animate-bounce" />
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Active Reminders ({activeReminders.length})
        </h4>
      </div>

      <AnimatePresence>
        {activeReminders.map((todo) => {
          const deadlineDate = new Date(todo.deadlineTime!);
          const now = Date.now();
          const remainsMs = deadlineDate.getTime() - now;
          const isOverdue = remainsMs < 0;
          
          let alertColor = 'border-amber-100 bg-amber-50/70 text-amber-955 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200';
          let badgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:border dark:border-amber-900/40';
          let icon = <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />;
          let label = 'Due Soon';

          if (isOverdue) {
            alertColor = 'border-rose-100 bg-rose-50/70 text-rose-955 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200';
            badgeColor = 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 dark:border dark:border-rose-900/40';
            icon = <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />;
            label = 'Overdue';
          } else if (remainsMs < 3600000) { // 1 hr
            alertColor = 'border-amber-200 bg-amber-100/70 text-amber-955 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-200';
            badgeColor = 'bg-red-200 text-red-900 dark:bg-rose-950 dark:text-rose-300 dark:border dark:border-rose-900/40';
            icon = <Clock className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />;
            label = 'Urgent: Due in < 1 hr';
          }

          // Generate friendly descriptive hours remaining label
          let timeLabel = '';
          if (isOverdue) {
            const overdueMin = Math.round(Math.abs(remainsMs) / 60000);
            if (overdueMin < 60) {
              timeLabel = `${overdueMin}m overdue`;
            } else {
              const overdueHrs = Math.round(overdueMin / 60);
              timeLabel = `${overdueHrs}h overdue`;
            }
          } else {
            const remainMin = Math.round(remainsMs / 60000);
            if (remainMin < 60) {
              timeLabel = `due in ${remainMin}m`;
            } else {
              const remainHrs = Math.round(remainMin / 60);
              timeLabel = `due in ${remainHrs}h`;
            }
          }

          return (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm backdrop-blur-sm ${alertColor}`}
              id={`reminder-${todo.id}`}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">{icon}</div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">
                      {todo.title}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColor}`}>
                      {label}
                    </span>
                    <span className="text-[10px] bg-white/80 text-slate-500 dark:bg-slate-900/70 dark:text-slate-300 dark:border-slate-800 font-medium px-2 py-0.5 rounded-full border border-slate-100 flex items-center gap-1">
                      {todo.category}
                    </span>
                  </div>
                  {todo.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {todo.description}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium italic">
                    Deadline: {deadlineDate.toLocaleString()} ({timeLabel})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => onToggleComplete(todo.id, todo.completed)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                  id={`btn-rem-complete-${todo.id}`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                </button>
                <button
                  onClick={() => onDismissReminder(todo.id)}
                  className="px-3 py-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-600 hover:text-slate-850 dark:bg-slate-800/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white text-xs font-medium border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                  id={`btn-rem-dismiss-${todo.id}`}
                  title="Dismiss alert on all synchronized devices"
                >
                  Mute / Dismiss
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
