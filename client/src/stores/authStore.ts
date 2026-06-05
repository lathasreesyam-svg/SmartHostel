import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/api';

export interface User {
  id: string;
  email: string;
  role: 'STUDENT' | 'COMMITTEE' | 'ADMIN' | 'WARDEN';
  primaryRole: 'STUDENT' | 'COMMITTEE' | 'ADMIN' | 'WARDEN'; // Original base role
  isEmailVerified: boolean;
  profile?: {
    id: string;
    name: string;
    rollNumber: string;
    department: string;
    year: number;
    gender: string;
    phone?: string;
    profilePicture?: string;
    blockId?: string;
    roomNumber?: string;
  } | null;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  refreshAccessToken: () => Promise<boolean>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user, accessToken, refreshToken) => {
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      setUser: (user) => set({ user }),

      setLoading: (loading) => set({ isLoading: loading }),

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;

        try {
          const res = await api.post('/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = res.data.data;
          set({ accessToken, refreshToken: newRefreshToken });
          return true;
        } catch {
          get().logout();
          return false;
        }
      },
    }),
    {
      name: 'hostel-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
