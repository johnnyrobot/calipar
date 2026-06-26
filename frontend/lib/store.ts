/**
 * Zustand store for global state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  department_id?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'calipar-auth',
      // Persist only non-sensitive, stable fields. The bearer `token` must NOT be
      // written to localStorage (XSS-exfiltration risk) — it is re-obtained from
      // Firebase on load. `_hasHydrated` is a runtime flag, reset via onRehydrateStorage.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

interface Review {
  id: string;
  org_id: string;
  author_id: string;
  cycle_year: string;
  review_type: string;
  status: string;
  content: object;
  created_at: string;
  updated_at: string;
}

interface ReviewsState {
  reviews: Review[];
  currentReview: Review | null;
  isLoading: boolean;
  setReviews: (reviews: Review[]) => void;
  setCurrentReview: (review: Review | null) => void;
  setLoading: (loading: boolean) => void;
  updateReview: (id: string, updates: Partial<Review>) => void;
}

export const useReviewsStore = create<ReviewsState>()((set) => ({
  reviews: [],
  currentReview: null,
  isLoading: false,
  setReviews: (reviews) => set({ reviews }),
  setCurrentReview: (review) => set({ currentReview: review }),
  setLoading: (isLoading) => set({ isLoading }),
  updateReview: (id, updates) =>
    set((state) => ({
      reviews: state.reviews.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      currentReview:
        state.currentReview?.id === id
          ? { ...state.currentReview, ...updates }
          : state.currentReview,
    })),
}));

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Array<{ source: string; page?: number; text: string }>;
  timestamp: Date;
}

interface ChatState {
  messages: ChatMessage[];
  isOpen: boolean;
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  messages: [],
  isOpen: false,
  isLoading: false,
  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  clearMessages: () => set({ messages: [] }),
  setOpen: (isOpen) => set({ isOpen }),
  setLoading: (isLoading) => set({ isLoading }),
}));
