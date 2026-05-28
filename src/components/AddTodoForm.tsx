import React, { useState, useEffect } from 'react';
import { Plus, Calendar, Flag, Tag, AlertCircle, Mic, MicOff, Radio } from 'lucide-react';
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

  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const [recognitionInstance, setRecognitionInstance] = useState<any | null>(null);

  // Stop recording when form is closed or component unmounts
  useEffect(() => {
    if (!isOpen) {
      stopRecording();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.abort();
        } catch (e) {
          // ignore error
        }
      }
    };
  }, [recognitionInstance]);

  const startRecording = () => {
    setVoiceError('');
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setVoiceError('Speech Recognition is not supported on this browser (use Chrome/Safari/Edge).');
      return;
    }

    try {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        setIsRecording(true);
      };

      rec.onresult = (event: any) => {
        let currentSessionText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            currentSessionText += event.results[i][0].transcript + ' ';
          }
        }
        if (currentSessionText) {
          setDescription((prev) => {
            const currentBase = prev.endsWith(' ') ? prev : (prev ? prev + ' ' : '');
            return currentBase + currentSessionText.trim();
          });
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        if (event.error === 'not-allowed') {
          setVoiceError('Microphone permission blocked. Please check site permissions.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech detected. Speak clearly.');
        } else {
          setVoiceError(`Voice Error: ${event.error}`);
        }
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      rec.start();
      setRecognitionInstance(rec);
    } catch (e: any) {
      console.error(e);
      setVoiceError('Could not start microphone feed.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch (err) {
        // ignore
      }
      setIsRecording(false);
    }
  };

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
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden mb-6 transition-all duration-300">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="w-full px-6 py-4 flex items-center justify-between text-left text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-205 hover:bg-slate-50/50 dark:hover:bg-slate-750/30 transition-colors group"
          id="btn-add-todo"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors">
              <Plus className="w-5 h-5" />
            </div>
            <span className="font-medium text-slate-600 dark:text-slate-300">Add a new task...</span>
          </div>
          <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-full text-slate-500 dark:text-slate-400">Ctrl + N</span>
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4" id="form-todo">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-700">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">New Task</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Task Title</label>
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-750 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 focus:border-indigo-505 dark:focus:border-indigo-500 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 font-medium text-sm transition-all bg-white dark:bg-slate-900"
              required
              maxLength={120}
              id="input-todo-title"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between pb-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block font-sans">Description (Optional)</label>
              <div className="flex items-center gap-2">
                {isRecording && (
                  <span className="flex items-center gap-1.5 text-[11px] text-rose-500 font-bold animate-pulse">
                    <Radio className="w-3 h-3 fill-rose-500" />
                    Listening...
                  </span>
                )}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
                    isRecording
                      ? 'bg-rose-50 dark:bg-rose-955/20 text-rose-750 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 hover:bg-rose-100 dark:hover:bg-rose-950/40 ring-4 ring-rose-100 dark:ring-rose-950/20'
                      : 'bg-indigo-50 dark:bg-indigo-950/45 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-100 dark:hover:bg-indigo-950/80'
                  }`}
                  title={isRecording ? 'Stop Recording Voice' : 'Record voice note'}
                  id="btn-voice-dictate"
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-3 h-3 text-rose-600 dark:text-rose-450" />
                      <span>Stop Dictation</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3 h-3 text-indigo-650 dark:text-indigo-400" />
                      <span>Dictate Note</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            <textarea
              placeholder="Add details, links, or context. Or click 'Dictate Note' to speak..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-205 dark:border-slate-750 focus:outline-none focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/50 focus:border-indigo-505 dark:focus:border-indigo-500 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm min-h-[70px] transition-all bg-white dark:bg-slate-900"
              maxLength={1000}
              id="input-todo-desc"
            />
            {voiceError && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] font-semibold text-rose-605 dark:text-rose-400 animate-pulse">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{voiceError}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Priority Selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1.5 shadow-none pb-1">
                <Flag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
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
                          ? 'border-rose-500 dark:border-rose-800 bg-rose-50 dark:bg-rose-955/35 text-rose-700 dark:text-rose-300 font-semibold'
                          : p === 'medium'
                          ? 'border-amber-500 dark:border-amber-800 bg-amber-50 dark:bg-amber-955/35 text-amber-700 dark:text-amber-300 font-semibold'
                          : 'border-emerald-500 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-955/35 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-400 bg-transparent'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-505 dark:focus:border-indigo-500 text-xs font-medium text-slate-700 dark:text-slate-355 bg-white dark:bg-slate-900"
                id="select-todo-category"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="dark:bg-slate-900 dark:text-slate-300">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Deadline */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wider flex items-center gap-1.5 pb-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Deadline
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-202 dark:border-slate-700 focus:outline-none focus:border-indigo-505 dark:focus:border-indigo-550 text-xs text-slate-600 dark:text-slate-355 bg-white dark:bg-slate-900"
                id="input-todo-deadline"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-50 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-650 dark:hover:bg-indigo-550 text-white rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
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
