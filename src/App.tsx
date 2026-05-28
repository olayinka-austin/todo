/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType, testConnection } from './firebase';
import { Todo, Priority } from './types';
import AddTodoForm from './components/AddTodoForm';
import TodoList from './components/TodoList';
import DeadlineReminderBanner from './components/DeadlineReminderBanner';
import { CheckSquare, LogOut, LogIn, BellRing, RefreshCw, UserCheck, HelpCircle, Inbox, Calendar, Clock, Laptop, Smartphone, Watch, Trash2, ChevronRight, X, Sparkles, Plus, Menu, Sun, Moon } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbSubmitting, setDbSubmitting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [activeView, setActiveView] = useState<'inbox' | 'today' | 'upcoming'>('inbox');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null);
  const [addFormOpen, setAddFormOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme-preference');
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Keep dark/light class in sync with darkMode preference state
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme-preference', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme-preference', 'light');
    }
  }, [darkMode]);

  // Listen to Firebase Auth state and handle browser connectivity events
  useEffect(() => {
    testConnection();
    
    const handleOnline = () => {
      setSyncStatus(navigator.onLine ? 'synced' : 'offline');
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (currentUser) {
        setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
      } else {
        setTodos([]);
        setSyncStatus('offline');
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Listen to Firestore real-time todos sync (only when user is logged in)
  useEffect(() => {
    if (!user) return;

    setSyncStatus(navigator.onLine ? 'syncing' : 'offline');
    const todosPath = 'todos';
    const q = query(collection(db, todosPath), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Todo[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title,
            description: data.description,
            completed: data.completed,
            deadlineTime: data.deadlineTime,
            userId: data.userId,
            priority: data.priority,
            category: data.category,
            reminded: data.reminded ?? false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Todo);
        });
        setTodos(list);
        
        // Evaluate dynamic online/offline caching status
        if (!navigator.onLine) {
          setSyncStatus('offline');
        } else if (snapshot.metadata.fromCache) {
          setSyncStatus('syncing');
        } else {
          setSyncStatus('synced');
        }
      },
      (error) => {
        setSyncStatus('offline');
        handleFirestoreError(error, OperationType.LIST, todosPath);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Google popup authentication sign-in
  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  };

  // Add Todo helper
  const handleAddTodo = async (fields: {
    title: string;
    description: string;
    priority: Priority;
    category: string;
    deadlineTime?: string;
  }) => {
    if (!user) return;
    setDbSubmitting(true);
    const path = 'todos';
    try {
      // Create alphanumeric document ID
      const newDocId = `todo_${Math.random().toString(36).substring(2, 15)}`;
      const docRef = doc(db, path, newDocId);
      
      await setDoc(docRef, {
        title: fields.title,
        description: fields.description,
        completed: false,
        priority: fields.priority,
        category: fields.category,
        deadlineTime: fields.deadlineTime || '',
        userId: user.uid,
        reminded: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${path}/${user.uid}`);
    } finally {
      setDbSubmitting(false);
    }
  };

  // Toggle Complete status helper
  const handleToggleComplete = async (todoId: string, currentCompleted: boolean) => {
    const path = `todos/${todoId}`;
    try {
      const docRef = doc(db, 'todos', todoId);
      await updateDoc(docRef, {
        completed: !currentCompleted,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Permanent Delete helper
  const handleDeleteTodo = async (todoId: string) => {
    const path = `todos/${todoId}`;
    try {
      const docRef = doc(db, 'todos', todoId);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  // Inline Priority Changer helper
  const handleUpdatePriority = async (todoId: string, priority: Priority) => {
    const path = `todos/${todoId}`;
    try {
      const docRef = doc(db, 'todos', todoId);
      await updateDoc(docRef, {
        priority,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Dismiss upcoming deadline alert helper (sets reminded key to true in document)
  const handleDismissReminder = async (todoId: string) => {
    const path = `todos/${todoId}`;
    try {
      const docRef = doc(db, 'todos', todoId);
      await updateDoc(docRef, {
        reminded: true,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Render authenticating progress
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col justify-center items-center gap-3">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <span className="text-xs font-semibold text-slate-550 uppercase tracking-widest">Loading Sync State...</span>
      </div>
    );
  }

  // Render Login screen if user is unauthenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50/30 via-slate-50 to-indigo-50/20 flex flex-col justify-between p-6">
        <div className="flex justify-between items-center max-w-4xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-indigo-600" />
            <span className="font-bold text-slate-800 text-sm tracking-tight">Sync Todo</span>
          </div>
          <span className="text-[10px] uppercase tracking-widest bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-100">
            Realtime DB Active
          </span>
        </div>

        <div className="max-w-md w-full mx-auto my-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner">
            <CheckSquare className="w-8 h-8 stroke-1.5" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-sans">
              Sync Across All Devices
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed font-sans max-w-xs mx-auto">
              A streamlined todo application with real-time Firestore syncing and automatic upcoming deadline reminders.
            </p>
          </div>

          <button
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
            id="btn-google-login"
          >
            <LogIn className="w-4 h-4" />
            Sign In with Google
          </button>

          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 w-full text-left">
            <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
            <p className="text-[10px] text-slate-500 leading-normal font-sans">
              Google pop-up logs you in securely via Firebase Auth. Only verified credentials can make database changes.
            </p>
          </div>
        </div>

        <footer className="max-w-4xl w-full mx-auto text-center text-[10px] text-slate-400 font-medium">
          Powered by Google Cloud &bull; Spark Firestore Enterprise Active &bull; 2026
        </footer>
      </div>
    );
  }

  // Main Core application view for authenticated users
  const selectedTodo = todos.find(t => t.id === selectedTodoId);

  // Filter the actual todo list based on selected view & category from sidebar
  const itemsForView = todos.filter(todo => {
    // Apply Category Filter from Sidebar
    if (selectedCategory !== 'All' && todo.category !== selectedCategory) {
      return false;
    }

    // Apply Tab Views Filter from Sidebar
    if (activeView === 'today') {
      if (!todo.deadlineTime) return false;
      const d = new Date(todo.deadlineTime);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    }

    if (activeView === 'upcoming') {
      if (!todo.deadlineTime) return false;
      return new Date(todo.deadlineTime).getTime() > Date.now();
    }

    return true; // 'inbox' (All)
  });

  const activeCount = todos.filter(t => !t.completed).length;
  const todayCount = todos.filter(t => {
    if (t.completed || !t.deadlineTime) return false;
    const d = new Date(t.deadlineTime);
    const today = new Date();
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  }).length;
  const upcomingCount = todos.filter(t => {
    if (t.completed || !t.deadlineTime) return false;
    return new Date(t.deadlineTime).getTime() > Date.now();
  }).length;

  return (
    <div className="w-full h-screen bg-slate-50 dark:bg-slate-950 flex font-sans text-slate-900 dark:text-slate-100 overflow-hidden relative transition-colors duration-300">
      
      {/* Sidebar background backdrop for mobile screens */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* 1. Left Navigation Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:static lg:flex lg:translate-x-0
        transition-transform duration-300 ease-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0
      `}>
        <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold font-display shadow-lg shadow-blue-105">
              S
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 font-display">SyncFlow</span>
          </div>
          <span 
            className={`w-2.5 h-2.5 rounded-full ${
              syncStatus === 'synced' 
                ? 'bg-emerald-500 animate-pulse' 
                : syncStatus === 'offline' 
                  ? 'bg-rose-500' 
                  : 'bg-amber-400'
            }`} 
            title={
              syncStatus === 'synced' 
                ? 'Real-time Linked' 
                : syncStatus === 'offline' 
                  ? 'Offline Access Enabled' 
                  : 'Syncing Data'
            } 
          />
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
          {/* Views sub-header */}
          <div className="p-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Views</div>
          
          <button
            onClick={() => { setActiveView('inbox'); setSelectedTodoId(null); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
              activeView === 'inbox' 
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4" />
              <span>Inbox</span>
            </div>
            {activeCount > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeView === 'inbox' ? 'bg-blue-100/80 dark:bg-blue-900/55 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-805 text-slate-500 dark:text-slate-400'}`}>
                {activeCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveView('today'); setSelectedTodoId(null); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
              activeView === 'today' 
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Clock className="w-4 h-4" />
              <span>Today</span>
            </div>
            {todayCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                {todayCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveView('upcoming'); setSelectedTodoId(null); setIsMobileSidebarOpen(false); }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
              activeView === 'upcoming' 
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/80 dark:hover:bg-slate-800 hover:text-slate-850 dark:hover:text-slate-205'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4" />
              <span>Upcoming</span>
            </div>
            {upcomingCount > 0 && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${activeView === 'upcoming' ? 'bg-blue-100/80 dark:bg-blue-900/55 text-blue-800 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-805 text-slate-505 dark:text-slate-400'}`}>
                {upcomingCount}
              </span>
            )}
          </button>

          {/* Projects sub-header */}
          <div className="p-2 text-[10px] font-bold text-slate-404 dark:text-slate-500 uppercase tracking-widest pt-5">Projects</div>
          {['All', 'Work', 'Personal', 'Shopping', 'Health', 'Finance', 'Education', 'Other'].map((cat, idx) => {
            // Distinct bullet colors based on category
            const colors = [
              'bg-blue-500', 'bg-emerald-400', 'bg-purple-400', 
              'bg-amber-400', 'bg-rose-400', 'bg-cyan-400', 
              'bg-indigo-400', 'bg-slate-400'
            ];
            const catCount = todos.filter(t => !t.completed && (cat === 'All' || t.category === cat)).length;

            return (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSelectedTodoId(null); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold select-none transition-all cursor-pointer ${
                  selectedCategory === cat 
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border-l-2 border-slate-700 dark:border-slate-505 font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${colors[idx % colors.length]}`} />
                  <span>{cat}</span>
                </div>
                {catCount > 0 && (
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-1.5 py-0.5">
                    {catCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync Status slot and User Identity controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3 shrink-0">
          <div className="flex items-center gap-2 px-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 select-none">
            {syncStatus === 'offline' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-600 dark:text-rose-400 font-bold">Offline (Cached Local Mode)</span>
              </>
            ) : syncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span className="text-blue-600 dark:text-blue-400 font-bold">Synchronizing Cloud...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                <span className="text-emerald-700 dark:text-emerald-400 font-bold">Cloud Live (Synced offline cache)</span>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-1 p-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="flex items-center gap-2 px-1 py-1 max-w-[150px] overflow-hidden select-none">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Me'}
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-lg border border-slate-100 dark:border-slate-700"
                />
              ) : (
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-center text-xs">
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <div className="text-left font-sans truncate">
                <p className="text-[11px] font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                  {user.displayName}
                </p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-none truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-0.5 px-1">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-xl transition-all cursor-pointer mr-0.5"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                id="btn-sidebar-theme-toggle"
              >
                {darkMode ? <Sun className="w-4 h-4 text-amber-500 animate-spin-once" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-405 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
                title="Sign Out"
                id="btn-sidebar-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Main Task Panel View */}
      <main className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 relative overflow-hidden transition-colors duration-300">
        <header className="h-20 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              title="Open Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base sm:text-xl font-bold text-slate-900 dark:text-slate-105 font-sans tracking-tight capitalize truncate max-w-[150px] sm:max-w-none">
                {activeView === 'inbox' ? `${selectedCategory} Inbox` : activeView === 'today' ? 'Due Today' : 'Upcoming Tasks'}
              </h1>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setAddFormOpen(!addFormOpen)}
            className="bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-semibold shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer text-xs"
            id="btn-header-new-task"
          >
            <Plus className="w-4 h-4" />
            {addFormOpen ? 'Close Panel' : 'New Task'}
          </button>
        </header>

        {/* Scrollable Tasks Body Container */}
        <div className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
          {/* Upcoming or Overdue reminder banner alert elements */}
          <DeadlineReminderBanner
            todos={todos}
            onDismissReminder={handleDismissReminder}
            onToggleComplete={handleToggleComplete}
          />

          {/* New Task Inline creation Form drawer */}
          {addFormOpen && (
            <AddTodoForm 
              onAdd={async (fields) => {
                await handleAddTodo(fields);
                setAddFormOpen(false);
              }} 
              isSubmitting={dbSubmitting} 
            />
          )}

          {/* Primary filterable list view */}
          <TodoList
            todos={itemsForView}
            onToggleComplete={handleToggleComplete}
            onDelete={async (id) => {
              await handleDeleteTodo(id);
              if (selectedTodoId === id) setSelectedTodoId(null);
            }}
            onUpdatePriority={handleUpdatePriority}
            onSelectTodo={(id) => setSelectedTodoId(id)}
            selectedTodoId={selectedTodoId}
          />
        </div>
      </main>

      {/* Detail sidebar backdrop for mobile screen sizes */}
      {selectedTodo && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSelectedTodoId(null)}
        />
      )}

      {/* 3. Detail Sidebar panel */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 lg:static lg:flex
        transition-transform duration-300 ease-out
        ${selectedTodo ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        w-80 bg-slate-50 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0
        ${!selectedTodo ? 'hidden lg:flex' : 'flex'}
      `}>
        {selectedTodo ? (
          <div className="p-6 h-full flex flex-col justify-between" id="side-selected-todo-detail">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Task Details</h2>
                <button 
                  onClick={() => setSelectedTodoId(null)} 
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-650 dark:hover:text-slate-300 cursor-pointer p-1 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Custom Title Details */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Title</label>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mt-1">{selectedTodo.title}</h4>
                  {selectedTodo.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 max-h-[140px] overflow-y-auto">
                      {selectedTodo.description}
                    </p>
                  )}
                </div>

                {/* Deadline options */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Deadline Specifications</label>
                  <div className="flex items-center gap-3 mt-2 text-slate-700 dark:text-slate-300">
                    <Calendar className="w-4 h-4 text-blue-500" />
                    <span className="text-xs font-semibold">
                      {selectedTodo.deadlineTime ? new Date(selectedTodo.deadlineTime).toLocaleString() : 'No deadline active'}
                    </span>
                  </div>
                </div>

                {/* Category specifications */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Category Tag</label>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-lg font-bold">
                      {selectedTodo.category}
                    </span>
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-lg border capitalize ${
                      selectedTodo.priority === 'high' ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-150 dark:border-rose-900/50' : selectedTodo.priority === 'medium' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-305 border-amber-100 dark:border-amber-900/50' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/50'
                    }`}>
                      {selectedTodo.priority} Priority
                    </span>
                  </div>
                </div>

                {/* Reminders Toggle status */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-xs border border-slate-200/80 dark:border-slate-700/80">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Upcoming Alerts</label>
                  <ul className="mt-2 space-y-2.5">
                    <li className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">24-hour notifications</span>
                      <div className="w-8 h-4 bg-blue-600 rounded-full relative">
                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                      </div>
                    </li>
                    <li className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">Dismissed alert on sync</span>
                      <div className={`w-8 h-4 ${selectedTodo.reminded ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'} rounded-full relative transition-colors`}>
                        <div className={`absolute ${selectedTodo.reminded ? 'right-0.5' : 'left-0.5'} top-0.5 w-3 h-3 bg-white rounded-full transition-all`}></div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="p-1">
              <button
                onClick={async () => {
                  await handleDeleteTodo(selectedTodo.id);
                  setSelectedTodoId(null);
                }}
                className="w-full py-3 text-xs font-bold text-rose-500 hover:text-white border border-rose-200 dark:border-rose-900/55 hover:bg-rose-600 dark:hover:bg-rose-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Task Permanently
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 h-full flex flex-col justify-between" id="side-selected-todo-empty">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest font-sans">Task Details</h2>
              </div>
              
              <div className="p-4 bg-white/50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-850 text-center py-12 space-y-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/80 flex items-center justify-center text-slate-400 dark:text-slate-505 mx-auto">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-2 font-sans">No Task Selected</p>
                <p className="text-[10.5px] text-slate-405 dark:text-slate-500 text-slate-400 max-w-[180px] leading-relaxed mx-auto">
                  Click on any task card within your inbox to show custom deadlines, sync details, and priority trackers.
                </p>
              </div>
            </div>

            {/* Sync summary widget */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-250/25 border-slate-100 dark:border-slate-755 shadow-sm space-y-3 font-sans">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block tracking-wider">Sync Details</label>
              <div className="flex items-center gap-2 select-none">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px]" title="Laptop Slot Sync">💻</div>
                  <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-950 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px]" title="Mobile Slot Sync">📱</div>
                  <div className="w-7 h-7 rounded-full bg-purple-50 dark:bg-purple-950 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[10px]" title="Watch Slot Sync">⌚</div>
                </div>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 ml-1">Connected on 3 Devices</span>
              </div>
              <p className="text-[9.5px] text-slate-404 dark:text-slate-500 leading-normal">
                Changes made here immediately synchronize to your phone and watch with real-time Firebase streams.
              </p>
            </div>
          </div>
        )}
      </aside>

    </div>
  );
}

