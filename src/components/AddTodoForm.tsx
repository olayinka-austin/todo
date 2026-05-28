import React, { useState } from 'react';
import { Plus, Calendar, Flag, Tag, AlertCircle } from 'lucide-react';
import { Priority } from '../types';

interface AddTodoFormProps {
  onAdd: (todo: {
    title: string;
    description: string;
    priority: Priority;
    category: string;
    deadlineTime?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
}

const CATEGORIES = ['Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Education', 'Other'];

export default function AddTodoForm({ onAdd, isSubmitting }: AddTodoFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState('Personal');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (title.length > 120) {
      setError('Title must be 120 characters or less');
      return;
    }
    if (description.length > 1000) {
      setError('Description must be 1000 characters or less');
      return;
    }

    try {
      setError('');
      await onAdd({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        deadlineTime: deadline ? new Date(deadline).toISOString() : undefined,
      });
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setCategory('Personal');
      setDeadline('');
      setIsOpen(false);
    } catch (err: any) {
      setError('Failed to create task. Check if your email is verified or refresh.');
      console.error(err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-6 py-4 flex items-center justify-between text-left text-slate-500 hover:text-slate-800 hover:bg-slate-50/50 transition-colors group"
          id="btn-add-todo"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-600">Add a new task...</span>
          </div>
          <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-full text-slate-500">Ctrl + N</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4" id="form-todo">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">New Task</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Task Title</label>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 placeholder-slate-400 font-medium text-sm transition-all"
              required
              maxLength={120}
              id="input-todo-title"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block font-sans">Description (Optional)</label>
            <textarea
              placeholder="Add details, links, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-800 placeholder-slate-400 text-sm min-h-[70px] transition-all"
              maxLength={1000}
              id="input-todo-desc"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Priority Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 shadow-none pb-1">
                <Flag className="w-3.5 h-3.5 text-slate-400" />
                Priority
              </label>
              <div className="flex gap-1.5">
                {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border text-center transition-all capitalize cursor-pointer ${
                      priority === p
                        ? p === 'high'
                          ? 'border-rose-500 bg-rose-50 text-rose-700 font-semibold'
                          : p === 'medium'
                          ? 'border-amber-500 bg-amber-50 text-amber-700 font-semibold'
                          : 'border-emerald-500 bg-emerald-50 text-emerald-700 font-semibold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-medium text-slate-700 bg-white"
                id="select-todo-category"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs text-slate-600 bg-white"
                id="input-todo-deadline"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              id="btn-submit-todo"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
