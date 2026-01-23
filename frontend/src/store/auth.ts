import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  identifier: string;
  role: 'parent' | 'admin';
  vip_expire_at?: string; // ISO Date string
}

interface AuthState {
  token: string | null;
  user: User | null;
  currentChildId: number | null;
  setAuth: (token: string, user: User) => void;
  setCurrentChildId: (id: number | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      currentChildId: null,
      setAuth: (token, user) => set({ token, user }),
      setCurrentChildId: (id) => set({ currentChildId: id }),
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, currentChildId: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        token: state.token, 
        user: state.user,
        currentChildId: state.currentChildId 
      }),
    }
  )
);
