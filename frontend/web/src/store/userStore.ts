import { create } from 'zustand';

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
  
  saveApiKey: (key: string) => Promise<boolean>;
  loadApiKeyStatus: () => Promise<void>;
  deleteApiKey: () => Promise<boolean>;
  updateProfile: (updates: { userName?: string; avatarUrl?: string }) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<boolean>;
  loadPreferences: () => Promise<void>;
  
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

const showToast = (message: string, type: 'success' | 'error' = 'success') => {
  console.log(`${type.toUpperCase()}: ${message}`);
  
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('user-toast', {
      detail: { message, type }
    });
    window.dispatchEvent(event);
  }
};

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authError: null,
  isUserMenuOpen: false,
  
  openRouterApiKey: '',
  apiKeyStatus: null,
  userName: '',
  avatarUrl: '',
  preferences: defaultPreferences,
  preferencesLoading: false,
  apiKeyLoading: false,

  setUserMenuOpen: (open: boolean) => {
    console.log('Setting user menu open:', open);
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
    console.log('Login attempt for:', email);
    set({ isLoading: true, authError: null });
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      console.log('Making request to:', `${baseUrl}/login`);
      
      const response = await fetch(`${baseUrl}/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);
      const result = await response.json();
      console.log('Login response:', result);

      if (response.ok && result.message === 'Login successful') {
        await get().checkAuthStatus();
        // Load user preferences and API key status after login
        await Promise.all([
          get().loadPreferences(),
          get().loadApiKeyStatus()
        ]);
        showToast('Successfully logged in!', 'success');
        return true;
      } else {
        const errorMsg = result.error || 'Login failed';
        console.error('Login failed:', errorMsg);
        set({ authError: errorMsg });
        showToast(errorMsg, 'error');
        return false;
      }
    } catch (error) {
      console.error('Login network error:', error);
      const errorMsg = 'Network error. Please check if the backend is running.';
      set({ authError: errorMsg });
      showToast(errorMsg, 'error');
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async (email: string, password: string): Promise<boolean> => {
    console.log('Signup attempt for:', email);
    set({ isLoading: true, authError: null });
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      console.log('Making request to:', `${baseUrl}/signup`);
      
      const response = await fetch(`${baseUrl}/signup`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Signup response status:', response.status);
      const result = await response.json();
      console.log('Signup response:', result);

      if (response.ok && result) {
        const namePart = email.split('@')[0];
        const displayName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        
        set({ 
          userName: displayName,
          avatarUrl: get().generateAvatar(displayName)
        });
        
        showToast('Account created! Please check your email to verify.', 'success');
        return true;
      } else {
        const errorMsg = result.error || 'Sign up failed. Please try again.';
        console.error('Signup failed:', errorMsg);
        set({ authError: errorMsg });
        showToast(errorMsg, 'error');
        return false;
      }
    } catch (error) {
      console.error('Signup network error:', error);
      const errorMsg = 'Network error. Please check if the backend is running.';
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
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      await fetch(`${baseUrl}/logout`);
      
      set({
        user: null,
        isAuthenticated: false,
        userName: '',
        avatarUrl: '',
        isUserMenuOpen: false,
        apiKeyStatus: null,
        preferences: defaultPreferences,
      });
      
      showToast('Successfully logged out', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      showToast('Error logging out', 'error');
    } finally {
      set({ isLoading: false });
    }
  },

  checkAuthStatus: async () => {
    console.log('Checking auth status...');
    set({ isLoading: true });
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/login_status`);
      
      console.log('Auth status response:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Auth status result:', result);

        if (result && result.user) {
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
          
          // Load user preferences and API key status
          await Promise.all([
            get().loadPreferences(),
            get().loadApiKeyStatus()
          ]);
          
          console.log('User is authenticated:', user.email);
        } else {
          console.log('User is not authenticated');
          set({ 
            user: null, 
            isAuthenticated: false 
          });
        }
      } else {
        console.log('Auth check failed with status:', response.status);
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

  saveApiKey: async (key: string): Promise<boolean> => {
    set({ apiKeyLoading: true });
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/user/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key.trim() }),
      });

      if (response.ok) {
        // Update local state and reload status
        set({ openRouterApiKey: key });
        await get().loadApiKeyStatus();
        
        if (typeof window !== 'undefined') {
          localStorage.setItem('q2-chat-api-key', key);
        }
        
        showToast('API key saved successfully', 'success');
        return true;
      } else {
        const error = await response.json();
        showToast(error.detail || 'Failed to save API key', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error saving API key:', error);
      showToast('Network error while saving API key', 'error');
      return false;
    } finally {
      set({ apiKeyLoading: false });
    }
  },

  loadApiKeyStatus: async () => {
    if (!get().isAuthenticated) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/user/api-key`);

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
      const response = await fetch(`${baseUrl}/user/api-key`, {
        method: 'DELETE',
      });

      if (response.ok) {
        set({ 
          openRouterApiKey: '',
          apiKeyStatus: { hasKey: false, maskedKey: null }
        });
        
        if (typeof window !== 'undefined') {
          localStorage.removeItem('q2-chat-api-key');
        }
        
        showToast('API key deleted successfully', 'success');
        return true;
      } else {
        const error = await response.json();
        showToast(error.detail || 'Failed to delete API key', 'error');
        return false;
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
      showToast('Network error while deleting API key', 'error');
      return false;
    } finally {
      set({ apiKeyLoading: false });
    }
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
    showToast('Profile updated successfully', 'success');
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('q2-chat-profile', JSON.stringify(newState));
    }
  },

  updatePreferences: async (updates: Partial<UserPreferences>): Promise<boolean> => {
    const { isAuthenticated } = get();
    
    // Update local state immediately
    set(state => ({
      preferences: { ...state.preferences, ...updates }
    }));
    
    const newPreferences = { ...get().preferences, ...updates };
    
    // Save to localStorage immediately
    if (typeof window !== 'undefined') {
      localStorage.setItem('q2-chat-preferences', JSON.stringify(newPreferences));
    }
    
    // Sync to backend for authenticated users
    if (isAuthenticated) {
      set({ preferencesLoading: true });
      
      try {
        const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/user/preferences`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ preferences: newPreferences }),
        });

        if (response.ok) {
          showToast('Preferences updated', 'success');
          return true;
        } else {
          const error = await response.json();
          showToast(error.detail || 'Failed to sync preferences', 'error');
          return false;
        }
      } catch (error) {
        console.error('Error syncing preferences:', error);
        showToast('Network error while syncing preferences', 'error');
        return false;
      } finally {
        set({ preferencesLoading: false });
      }
    } else {
      showToast('Preferences updated locally', 'success');
      return true;
    }
  },

  loadPreferences: async () => {
    if (!get().isAuthenticated) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/user/preferences`);

      if (response.ok) {
        const backendPreferences = await response.json();
        set(state => ({
          preferences: { ...defaultPreferences, ...backendPreferences }
        }));
        
        // Also save to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('q2-chat-preferences', JSON.stringify(backendPreferences));
        }
      }
    } catch (error) {
      console.error('Error loading preferences from backend:', error);
    }
  },
}));

// Load from localStorage on initialization
if (typeof window !== 'undefined') {
  const savedApiKey = localStorage.getItem('q2-chat-api-key');
  const savedProfile = localStorage.getItem('q2-chat-profile');
  const savedPreferences = localStorage.getItem('q2-chat-preferences');
  
  if (savedApiKey) {
    useUserStore.setState({ openRouterApiKey: savedApiKey });
  }
  
  if (savedProfile) {
    try {
      const profile = JSON.parse(savedProfile);
      useUserStore.setState(profile);
    } catch (e) {
      console.error('Error loading saved profile:', e);
    }
  }
  
  if (savedPreferences) {
    try {
      const preferences = JSON.parse(savedPreferences);
      useUserStore.setState({ preferences: { ...defaultPreferences, ...preferences } });
    } catch (e) {
      console.error('Error loading saved preferences:', e);
    }
  }
}