import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

interface UserState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  isLoading: boolean;
  authError: string | null;
  isUserMenuOpen: boolean;
  
  // API Key related
  openRouterApiKey: string;
  apiKeyStatus: { hasKey: boolean; maskedKey?: string } | null;
  apiKeyLoading: boolean;
  

  
  initializeSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, apiKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
  setUserMenuOpen: (open: boolean) => void;
  updateApiKey: (apiKey: string) => Promise<boolean>;

  saveApiKey: (apiKey: string) => Promise<boolean>;
  deleteApiKey: () => Promise<boolean>;
  loadApiKeyStatus: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
  isLoading: false,
  authError: null,
  isUserMenuOpen: false,
  
  // API Key related
  openRouterApiKey: '',
  apiKeyStatus: null,
  apiKeyLoading: false,
  


  initializeSession: async () => {
    if (get().isInitialized) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user && !session.user.is_anonymous) {
        set({
          user: session.user,
          isAuthenticated: true,
          isInitialized: true,
        });
      } else {
        set({
          user: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
      set({ isInitialized: true });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, authError: null });
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();
      
      if (response.ok && data.session) {
        // Set the session in Supabase client using the tokens from backend
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (!sessionError) {
          // Create user object from backend response
          const user = {
            id: data.session.user.id,
            email: data.session.user.email,
            is_anonymous: data.session.user.is_anonymous,
            aud: 'authenticated',
            role: 'authenticated',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            app_metadata: {},
            user_metadata: {},
          };

          set({
            user: user as any,
            isAuthenticated: true,
            isLoading: false,
            isUserMenuOpen: false,
          });
          return true;
        } else {
          set({ authError: 'Failed to establish session', isLoading: false });
          return false;
        }
      } else {
        set({ authError: data.error || 'Login failed', isLoading: false });
        return false;
      }
    } catch (error) {
      set({ authError: 'Network error', isLoading: false });
      return false;
    }
    
    return false;
  },

  signup: async (email: string, password: string, apiKey: string) => {
    set({ isLoading: true, authError: null });
    
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email, 
            password, 
            openrouter_api_key: apiKey 
          }),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        set({ isLoading: false });
        // Dispatch a custom event for toast notification
        window.dispatchEvent(new CustomEvent('user-toast', { 
          detail: { 
            message: 'Account created! Please check your email to verify.', 
            type: 'success' 
          } 
        }));
        return true;
      } else {
        set({ authError: data.detail || 'Signup failed', isLoading: false });
        return false;
      }
    } catch (error) {
      set({ authError: 'Network error', isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await supabase.auth.signOut();
      set({
        user: null,
        isAuthenticated: false,
        isUserMenuOpen: false,
      });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  clearAuthError: () => set({ authError: null }),
  setUserMenuOpen: (open: boolean) => set({ isUserMenuOpen: open }),

  saveApiKey: async (apiKey: string) => {
    set({ apiKeyLoading: true });
    const success = await get().updateApiKey(apiKey);
    if (success) {
      set({ openRouterApiKey: apiKey });
      await get().loadApiKeyStatus();
    }
    set({ apiKeyLoading: false });
    return success;
  },

  deleteApiKey: async () => {
    set({ apiKeyLoading: true });
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/user/api-key`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        set({ openRouterApiKey: '', apiKeyStatus: null });
        window.dispatchEvent(new CustomEvent('user-toast', { 
          detail: { 
            message: 'API key deleted successfully!', 
            type: 'success' 
          } 
        }));
        return true;
      } else {
        throw new Error('Failed to delete API key');
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('user-toast', { 
        detail: { 
          message: 'Failed to delete API key', 
          type: 'error' 
        } 
      }));
      return false;
    } finally {
      set({ apiKeyLoading: false });
    }
  },

  loadApiKeyStatus: async () => {
    if (!get().isAuthenticated) return;
    
    set({ apiKeyLoading: true });
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/user/api-key-status`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        set({ 
          apiKeyStatus: { 
            hasKey: data.has_api_key,
            maskedKey: data.masked_key
          }
        });
      }
    } catch (error) {
      console.error('Failed to load API key status:', error);
    } finally {
      set({ apiKeyLoading: false });
    }
  },

  updateApiKey: async (apiKey: string) => {
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000'}/user/api-key`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ api_key: apiKey }),
        }
      );

      if (response.ok) {
        window.dispatchEvent(new CustomEvent('user-toast', { 
          detail: { 
            message: 'API key updated successfully!', 
            type: 'success' 
          } 
        }));
        return true;
      } else {
        const data = await response.json();
        window.dispatchEvent(new CustomEvent('user-toast', { 
          detail: { 
            message: data.detail || 'Failed to update API key', 
            type: 'error' 
          } 
        }));
        return false;
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent('user-toast', { 
        detail: { 
          message: 'Network error', 
          type: 'error' 
        } 
      }));
      return false;
    }
  },
}));