import { useState } from 'react';
import { Todo, Priority } from '../types';
import {
  CheckCircle2,
  Circle,
  Calendar,
  Trash2,
  AlertCircle,
  Clock,
  Briefcase,
  User,
  Activity,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TodoListProps {
  todos: Todo[];
  onToggleComplete: (todoId: string, currentCompleted: boolean) => Promise<void>;
  onDelete: (todoId: string) => Promise<void>;
  onUpdatePriority: (todoId: string, priority: Priority) => Promise<void>;
  onSelectTodo?: (todoId: string | null) => void;
  selectedTodoId?: string | null;
}

const CATEGORIES = ['All', 'Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Education', 'Other'];

export default function TodoList({
  todos,
  onToggleComplete,
  onDelete,
  onUpdatePriority,
  onSelectTodo,
  selectedTodoId,
}: TodoListProps) {
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPriority, setFilterPriority] = useState('All');
  const [sortBy, setSortBy] = useState<'deadline' | 'priority' | 'createdAt'>('deadline');
  const [showCompleted, setShowCompleted] = useState(true);

  // Filter logic
  const filteredTodos = todos.filter((todo) => {
    // Completion filter and fold-away
    if (!showCompleted && todo.completed) return false;

    // Category filter
    if (filterCategory !== 'All' && todo.category !== filterCategory) return false;

    // Priority filter
    if (filterPriority !== 'All' && todo.priority !== filterPriority) return false;

    return true;
  });

  // Sort logic
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sortBy === 'deadline') {
      // Prioritize overdue items, then items with deadlines soonest. Put items with no deadline at the bottom.
      if (!a.deadlineTime) return 1;
      if (!b.deadlineTime) return -1;
      return new Date(a.deadlineTime).getTime() - new Date(b.deadlineTime).getTime();
    }

    if (sortBy === 'priority') {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const weightA = priorityWeight[a.priority];
      const weightB = priorityWeight[b.priority];
      if (weightA !== weightB) {
        return weightB - weightA; // Descending weight
      }
      return b.createdAt - a.createdAt;
    }

    // Default: Sort by date created (newest first)
    const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
    const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
    return timeB - timeA;
  });

  // Calculate friendly statistics for the visual gauge
  const totalCount = todos.length;
  const completedCount = todos.filter((t) => t.completed).length;
  const overdueCount = todos.filter((t) => {
    if (t.completed || !t.deadlineTime) return false;
    return new Date(t.deadlineTime).getTime() < Date.now();
  }).length;

  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6" id="todo-list-container">
      {/* Dynamic Statistics Bar Component */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium font-sans">Completion Rate</span>
            <h5 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 font-sans mt-0.5">{progressPercent}%</h5>
          </div>
          <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
            <Activity className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Tasks</span>
            <h5 className="text-xl font-bold text-slate-700 dark:text-slate-200 mt-0.5">{totalCount - completedCount} / {totalCount}</h5>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100/80 dark:border-slate-700 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Overdue Alerts</span>
            <h5 className={`text-xl font-bold mt-0.5 ${overdueCount > 0 ? 'text-rose-600 dark:text-rose-450 animate-pulse' : 'text-slate-500 dark:text-slate-400'}`}>
              {overdueCount}
            </h5>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${overdueCount > 0 ? 'bg-rose-50 dark:bg-rose-950/45 text-rose-600 dark:text-rose-300' : 'bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters and Sorters Section */}
      <div className="bg-white dark:bg-slate-800/80 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-3.5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span className="text-xs font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest">Filter & Arrange</span>
          </div>

          <div className="flex select-none items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed task state:</label>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className={`px-3 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                showCompleted ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-350 border border-slate-200 dark:border-slate-650'
              }`}
              id="btn-toggle-completed-visibility"
            >
              {showCompleted ? 'Showing Completed' : 'Hiding Completed'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category Filter selector */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">By Category</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
              id="filter-category"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="dark:bg-slate-900 dark:text-slate-300">
                  {cat === 'All' ? 'All Categories' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter selector */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">By Priority</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 font-medium bg-white dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
              id="filter-priority"
            >
              <option value="All" className="dark:bg-slate-900 dark:text-slate-303">All Priorities</option>
              <option value="low" className="dark:bg-slate-900 dark:text-slate-303">Low Priority</option>
              <option value="medium" className="dark:bg-slate-900 dark:text-slate-303">Medium Priority</option>
              <option value="high" className="dark:bg-slate-900 dark:text-slate-303">High Priority</option>
            </select>
          </div>

          {/* Sorter Selector */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Sort Order</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setSortBy('deadline')}
                className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer ${
                  sortBy === 'deadline' ? 'border-indigo-550 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Sort by nearest deadline"
              >
                Deadline
              </button>
              <button
                onClick={() => setSortBy('priority')}
                className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer ${
                  sortBy === 'priority' ? 'border-indigo-550 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Sort by priority rating"
              >
                Priority
              </button>
              <button
                onClick={() => setSortBy('createdAt')}
                className={`flex-1 py-1.5 rounded-lg border text-center text-xs font-semibold cursor-pointer ${
                  sortBy === 'createdAt' ? 'border-indigo-550 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
                title="Sort by creation date"
              >
                Newest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Tasks list */}
      <div className="space-y-2.5">
        <AnimatePresence mode="popLayout">
          {sortedTodos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 px-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-400 dark:text-slate-550 space-y-2 bg-slate-50/20 dark:bg-slate-900/10"
              id="empty-todos-visual"
            >
              <CheckCircle2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">You are all caught up!</p>
              <p className="text-xs text-slate-400 dark:text-slate-550 max-w-sm mx-auto">
                No active tasks match your filters. Create a new task or adjust filters to begin.
              </p>
            </motion.div>
          ) : (
            sortedTodos.map((todo) => {
              const deadlineDate = todo.deadlineTime ? new Date(todo.deadlineTime) : null;
              const isOverdue = deadlineDate && !todo.completed && deadlineDate.getTime() < Date.now();
              
              // Colors based on priority
              const priorityBorder = {
                high: 'border-l-rose-500',
                medium: 'border-l-amber-500',
                low: 'border-l-emerald-500',
              };

              // Badges based on priority
              const priorityBadge = {
                high: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/40 dark:text-rose-303 dark:border-rose-900/50',
                medium: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-303 dark:border-amber-900/50',
                low: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-303 dark:border-emerald-900/50',
              };

              return (
                <motion.div
                  key={todo.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -15 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 35,
                    opacity: { duration: 0.18 },
                  }}
                  className={`w-full bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-755 border-l-4 ${priorityBorder[todo.priority]} p-4 sm:p-5 flex items-start gap-4 hover:shadow-sm hover:border-slate-205 dark:hover:border-slate-705 transition-all select-none cursor-pointer ${
                    selectedTodoId === todo.id ? 'bg-blue-50/20 dark:bg-blue-950/20 ring-2 ring-blue-100 dark:ring-blue-900/50 border-blue-200 dark:border-blue-800' : ''
                  }`}
                  id={`todo-item-${todo.id}`}
                  onClick={() => onSelectTodo?.(todo.id)}
                >
                  {/* Completion SwitchCheckbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete(todo.id, todo.completed);
                    }}
                    className="pt-0.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer shrink-0"
                    id={`btn-complete-${todo.id}`}
                  >
                    {todo.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 fill-indigo-50 dark:fill-indigo-950/20 animate-bounce" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* Task Content Details */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap pb-0.5">
                      <span
                        className={`font-semibold text-sm truncate ${
                          todo.completed ? 'text-slate-400 dark:text-slate-550 line-through' : 'text-slate-800 dark:text-slate-100'
                        }`}
                      >
                        {todo.title}
                      </span>

                      {/* Priority pill */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize shrink-0 ${priorityBadge[todo.priority]}`}>
                        {todo.priority}
                      </span>

                      {/* Category label */}
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-350 border border-slate-200 dark:border-slate-755 shrink-0">
                        {todo.category}
                      </span>
                    </div>

                    {todo.description && (
                      <p className={`text-xs ${todo.completed ? 'text-slate-350 dark:text-slate-550 line-through' : 'text-slate-500 dark:text-slate-450'} break-words whitespace-pre-wrap`}>
                        {todo.description}
                      </p>
                    )}

                    {/* Deadline & Overdue alarms */}
                    {todo.deadlineTime && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-450 flex-wrap pt-0.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-550 shrink-0" />
                        <span className={isOverdue ? 'text-rose-600 dark:text-rose-405 font-semibold' : ''}>
                          {deadlineDate?.toLocaleString()}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-1 leading-none shrink-0 animate-pulse">
                            <Clock className="w-2.5 h-2.5" /> OVERDUE
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right Hand Action Controllers */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Inline Priority Cycle Selector */}
                    <div className="hidden sm:flex flex-col gap-0.5 object-cover select-none">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdatePriority(todo.id, todo.priority === 'low' ? 'medium' : todo.priority === 'medium' ? 'high' : 'low');
                        }}
                        className="text-[10px] hover:bg-slate-50 dark:hover:bg-slate-750 border border-slate-100 dark:border-slate-700 rounded-md px-1.5 py-1 font-semibold text-slate-500 dark:text-slate-400 cursor-pointer bg-transparent"
                        title="Cycle priority"
                      >
                        Priority ↑
                      </button>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(todo.id);
                      }}
                      className="p-1.5 text-slate-405 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                      title="Delete task permanently"
                      id={`btn-delete-${todo.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );

            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
