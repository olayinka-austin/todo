export type Priority = 'low' | 'medium' | 'high';

export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  deadlineTime?: string; // ISO string
  userId: string;
  priority: Priority;
  category: string;
  reminded: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}
