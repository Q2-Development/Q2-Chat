import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import toast from 'react-hot-toast';

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

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  isUserMenuOpen: boolean;
  
  openRouterApiKey: string;
  userName: string;
  avatarUrl: string;
  preferences: UserPreferences;
  
  setUserMenuOpen: (open: boolean) => void;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearAuthError: () => void;
  
  saveApiKey: (key: string) => void;
  updateProfile: (updates: { userName?: string; avatarUrl?: string }) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;
  
  generateAvatar: (name: string) => string;
}

const defaultPreferences: UserPreferences = {
  defaultModel: 'openai/gpt-4o',
  messageDisplay: 'comfortable',
  autoSave: true,
  soundEnabled: false,
  keyboardShortcuts: true,
  theme: 'dark',
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      isUserMenuOpen: false,
      
      openRouterApiKey: '',
      userName: '',
      avatarUrl: '',
      preferences: defaultPreferences,

      setUserMenuOpen: (open: boolean) => {
        set({ isUserMenuOpen: open });
        if (!open) {
          get().clearAuthError();
        }
      },

      clearAuthError: () => set({ authError: null }),

      generateAvatar: (name: string) => {
        const initials = name
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];
        const colorIndex = name.length % colors.length;
        const bgColor = colors[colorIndex];
        
        return `data:image/svg+xml,${encodeURIComponent(`
          <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="20" fill="${bgColor}"/>
            <text x="20" y="25" text-anchor="middle" fill="white" font-size="14" font-weight="600" font-family="Arial">${initials}</text>
          </svg>
        `)}`;
      },

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, authError: null });
        
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const result = await response.json();

          if (response.ok && result.message === 'Login successful') {
            await get().checkAuthStatus();
            toast.success('Successfully logged in!');
            return true;
          } else {
            set({ authError: result.error || 'Login failed' });
            return false;
          }
        } catch (error) {
          console.error('Login error:', error);
          set({ authError: 'Network error. Please try again.' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true, authError: null });
        
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          const result = await response.json();

          if (response.ok && result) {
            const namePart = email.split('@')[0];
            const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
            
            set({ 
              userName: displayName,
              avatarUrl: get().generateAvatar(displayName)
            });
            
            toast.success('Account created! Please check your email to verify.');
            return true;
          } else {
            set({ authError: 'Sign up failed. Please try again.' });
            return false;
          }
        } catch (error) {
          console.error('Signup error:', error);
          set({ authError: 'Network error. Please try again.' });
          return false;
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/logout`);
          
          set({
            user: null,
            isAuthenticated: false,
            userName: '',
            avatarUrl: '',
            isUserMenuOpen: false,
          });
          
          toast.success('Successfully logged out');
        } catch (error) {
          console.error('Logout error:', error);
          toast.error('Error logging out');
        } finally {
          set({ isLoading: false });
        }
      },

      checkAuthStatus: async () => {
        set({ isLoading: true });
        
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/login_status`);
          const result = await response.json();

          if (response.ok && result.user) {
            const user = result.user;
            set({ 
              user,
              isAuthenticated: true,
            });

            if (!get().userName) {
              const namePart = user.email.split('@')[0];
              const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
              set({ 
                userName: displayName,
                avatarUrl: get().generateAvatar(displayName)
              });
            }
          } else {
            set({ 
              user: null, 
              isAuthenticated: false 
            });
          }
        } catch (error) {
          console.error('Auth check error:', error);
          set({ 
            user: null, 
            isAuthenticated: false 
          });
        } finally {
          set({ isLoading: false });
        }
      },

      saveApiKey: (key: string) => {
        set({ openRouterApiKey: key });
        toast.success('API key saved successfully');
      },

      updateProfile: (updates: { userName?: string; avatarUrl?: string }) => {
        const currentState = get();
        const newState: any = {};
        
        if (updates.userName !== undefined) {
          newState.userName = updates.userName;
          if (!updates.avatarUrl) {
            newState.avatarUrl = currentState.generateAvatar(updates.userName);
          }
        }
        
        if (updates.avatarUrl !== undefined) {
          newState.avatarUrl = updates.avatarUrl;
        }
        
        set(newState);
        toast.success('Profile updated successfully');
      },

      updatePreferences: (updates: Partial<UserPreferences>) => {
        set(state => ({
          preferences: { ...state.preferences, ...updates }
        }));
        toast.success('Preferences updated');
      },
    }),
    {
      name: 'q2-chat-user-storage',
      partialize: (state) => ({
        openRouterApiKey: state.openRouterApiKey,
        userName: state.userName,
        avatarUrl: state.avatarUrl,
        preferences: state.preferences,
      }),
    }
  )
);