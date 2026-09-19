import type { AppLocale } from '@runner/shared';
import { DEFAULT_LOCALE } from '@runner/shared';
import { create } from 'zustand';

interface AppState {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
}

export const useAppStore = create<AppState>((set) => ({
  locale: DEFAULT_LOCALE,
  setLocale: (locale) => set({ locale }),
}));

interface AuthState {
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
}));

interface RunnerState {
  isOnline: boolean;
  toggleOnline: () => void;
}

export const useRunnerStore = create<RunnerState>((set) => ({
  isOnline: false,
  toggleOnline: () => set((s) => ({ isOnline: !s.isOnline })),
}));
