import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

interface User {
  id: string;
  email: string;
  created_at?: string;
}

interface UserPreferences {
  defaultModel: string;
  messageDisplay: 'compact' | 'comfortable';
  autoSave: boolean;
  soundEnabled: boolean;
  keyboardShortcuts: boolean;
  theme: 'dark' | 'light';
}

interface ApiKeyStatus {
  hasKey: boolean;
  maskedKey: string | null;
}

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  token: string | null;
  isLoading: boolean;
  authError: string | null;
  isUserMenuOpen: boolean;
  
  openRouterApiKey: string;
  apiKeyStatus: ApiKeyStatus | null;
  userName: string;
  avatarUrl: string;
  preferences: UserPreferences;
  preferencesLoading: boolean;
  apiKeyLoading: boolean;
  
  setUserMenuOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearAuthError: () => void;
  createGuestSession: () => Promise<void>;
  
  saveApiKey: (key: string) => Promise<boolean>;
  loadApiKeyStatus: () => Promise<void>;
  deleteApiKey: () => Promise<boolean>;
  updateProfile: (updates: { userName?: string; avatarUrl?: string }) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  loadPreferences: () => Promise<void>;
  
  generateAvatar: (name: string) => string;
  authorizedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const defaultPreferences: UserPreferences = {
  defaultModel: 'openai/gpt-4o',
  messageDisplay: 'comfortable',
  autoSave: true,
  soundEnabled: false,
  keyboardShortcuts: true,
  theme: 'dark',
};

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('user-toast', { detail: { message, type } }));
  }
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isGuest: false,
  token: null,
  isLoading: true,
  authError: null,
  isUserMenuOpen: false,
  
  openRouterApiKey: '',
  apiKeyStatus: null,
  userName: '',
  avatarUrl: '',
  preferences: defaultPreferences,
  preferencesLoading: false,
  apiKeyLoading: false,

  setUserMenuOpen: (open) => {
    set({ isUserMenuOpen: open });
    if (!open) get().clearAuthError();
  },

  clearAuthError: () => set({ authError: null }),

  generateAvatar: (name) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
    const colorIndex = name.length % colors.length;
    const bgColor = colors[colorIndex];
    return `data:image/svg+xml,${encodeURIComponent(`<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="20" fill="${bgColor}"/><text x="20" y="25" text-anchor="middle" fill="white" font-size="14" font-weight="600" font-family="Arial">${initials}</text></svg>`)}`;
  },

  createGuestSession: async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/guest/session`, { method: 'POST' });
      const session = await response.json();

      if (session && session.access_token) {
        await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
        });
        set({
          token: session.access_token,
          isGuest: true,
          isAuthenticated: false,
          user: session.user,
        });
      }
    } catch (error) {
      console.error("Failed to create guest session:", error);
    }
  },

  checkAuthStatus: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session && session.user && !session.user.email?.endsWith('@temp.com')) {
        set({
          user: session.user,
          isAuthenticated: true,
          isGuest: false,
          token: session.access_token,
        });
        await Promise.all([get().loadPreferences(), get().loadApiKeyStatus()]);
      } else {
        await get().createGuestSession();
      }
    } catch (error) {
      console.error('Auth check/guest session creation failed:', error);
      await get().createGuestSession();
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, authError: null });
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      
      await get().checkAuthStatus(); 
      showToast('Successfully logged in!', 'success');
      return true;
    } catch (error: any) {
      const errorMsg = error.message || 'Login failed';
      set({ authError: errorMsg });
      showToast(errorMsg, 'error');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email, password) => {
    set({ isLoading: true, authError: null });
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      showToast('Account created! Please check your email to verify.', 'success');
      return true;
    } catch (error: any) {
      const errorMsg = error.message || 'Sign up failed.';
      set({ authError: errorMsg });
      showToast(errorMsg, 'error');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        set({
            user: null,
            isAuthenticated: false,
            isGuest: false,
            token: null,
            userName: '',
            avatarUrl: '',
            isUserMenuOpen: false,
            apiKeyStatus: null,
            preferences: defaultPreferences,
        });
        await get().createGuestSession();
        showToast('Successfully logged out', 'success');
    } catch (error: any) {
        showToast(error.message || 'Error logging out', 'error');
    } finally {
        set({ isLoading: false });
    }
  },

  authorizedFetch: async (url, options = {}) => {
    let token = get().token;
    if (!token) {
      await new Promise(resolve => setTimeout(resolve, 100));
      token = get().token;
      if (!token) throw new Error("No session token available.");
    }
    
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    options.headers = headers;

    return fetch(url, options);
  },

  saveApiKey: async (key: string): Promise<boolean> => {
    set({ apiKeyLoading: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await get().authorizedFetch(`${baseUrl}/user/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      if (!response.ok) throw new Error("Failed to save API key");
      await get().loadApiKeyStatus();
      showToast('API key saved successfully', 'success');
      return true;
    } catch (error) {
      showToast('Error saving API key', 'error');
      return false;
    } finally {
      set({ apiKeyLoading: false });
    }
  },

  loadApiKeyStatus: async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await get().authorizedFetch(`${baseUrl}/user/api-key`, {});
      if (response.ok) {
        const status = await response.json();
        set({ apiKeyStatus: status });
      }
    } catch (error) {
      console.error('Error loading API key status:', error);
    }
  },

  deleteApiKey: async (): Promise<boolean> => {
    set({ apiKeyLoading: true });
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await get().authorizedFetch(`${baseUrl}/user/api-key`, { method: 'DELETE' });
      if (!response.ok) throw new Error("Failed to delete API key");
      set({ apiKeyStatus: { hasKey: false, maskedKey: null } });
      showToast('API key deleted', 'success');
      return true;
    } catch (error) {
      showToast('Error deleting API key', 'error');
      return false;
    } finally {
      set({ apiKeyLoading: false });
    }
  },

  updateProfile: (updates) => {
    const { generateAvatar } = get();
    const newProfile: Partial<UserState> = { ...updates };
    if (updates.userName && !updates.avatarUrl) {
        newProfile.avatarUrl = generateAvatar(updates.userName);
    }
    set(newProfile);
    showToast('Profile updated', 'success');
  },

  updatePreferences: async (updates) => {
    set(state => ({ preferences: { ...state.preferences, ...updates } }));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await get().authorizedFetch(`${baseUrl}/user/preferences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: get().preferences }),
      });
      if (!response.ok) throw new Error("Failed to sync preferences");
      showToast('Preferences updated', 'success');
      return true;
    } catch (error) {
      showToast('Could not sync preferences', 'error');
      return false;
    }
  },

  loadPreferences: async () => {
    try {
        const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
        const response = await get().authorizedFetch(`${baseUrl}/user/preferences`, {});
        if (response.ok) {
            const backendPreferences = await response.json();
            if (Object.keys(backendPreferences).length > 0) {
              set(state => ({
                  preferences: { ...state.preferences, ...backendPreferences }
              }));
            }
        }
    } catch (error) {
        console.error('Error loading preferences from backend:', error);
    }
  },
}));

if (typeof window !== 'undefined') {
  useUserStore.getState().checkAuthStatus();
}