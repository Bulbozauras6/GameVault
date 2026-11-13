import { isAxiosError } from "axios";
import { create } from "zustand";
import {
  fetchCurrentUser,
  changeUserPassword,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
  type AuthUser,
  type LoginInput,
  type PasswordChangeInput,
  type ProfileUpdateInput,
  type RegistrationInput,
} from "../api/auth";

interface AuthState {
  user: AuthUser | null;
  initialized: boolean;
  initializing: boolean;
  loggingOut: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  register: (input: RegistrationInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  updateProfile: (input: ProfileUpdateInput) => Promise<void>;
  changePassword: (input: PasswordChangeInput) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function errorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? "The authentication service is unavailable. Please try again.";
  }

  return "The authentication service is unavailable. Please try again.";
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  initialized: false,
  initializing: false,
  loggingOut: false,
  error: null,

  async initialize() {
    if (get().initialized || get().initializing) return;
    set({ initializing: true, error: null });

    try {
      const user = await fetchCurrentUser();
      set({ user });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        set({ user: null });
      } else {
        set({ user: null, error: errorMessage(error) });
      }
    } finally {
      set({ initialized: true, initializing: false });
    }
  },

  async register(input) {
    set({ error: null });
    const user = await registerUser(input);
    set({ user, initialized: true });
  },

  async login(input) {
    set({ error: null });
    const user = await loginUser(input);
    set({ user, initialized: true });
  },

  async updateProfile(input) {
    set({ error: null });
    const user = await updateUserProfile(input);
    set({ user, initialized: true });
  },

  async changePassword(input) {
    set({ error: null });
    await changeUserPassword(input);
  },

  async logout() {
    set({ loggingOut: true, error: null });

    try {
      await logoutUser();
      set({ user: null });
    } catch (error) {
      set({ error: errorMessage(error) });
      throw error;
    } finally {
      set({ loggingOut: false });
    }
  },

  clearError() {
    set({ error: null });
  },
}));
