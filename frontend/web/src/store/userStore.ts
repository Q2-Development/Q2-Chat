import { create } from 'zustand';
import { supabase } from '@/lib/supabaseClient';

interface TempUser {
  id: string;
  is_anonymous: boolean;
}

interface UserState {
  user: TempUser | null;
  token: string | null;
  isInitialized: boolean;
  initializeSession: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  token: null,
  isInitialized: false,

  initializeSession: async () => {
    // Prevent running multiple times
    if (get().isInitialized) return;
    set({ isInitialized: false });

    try {
      // First, check if a session already exists in the cookie
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession && existingSession.user.is_anonymous) {
        set({
          user: {
            id: existingSession.user.id,
            is_anonymous: existingSession.user.is_anonymous || false,
          },
          token: existingSession.access_token,
          isInitialized: true,
        });
        return;
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_FASTAPI_URL || 'http://localhost:8000';
      const response = await fetch(`${baseUrl}/users/temp`, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to initialize temp session');
      
      const session = await response.json();

      if (session && session.access_token) {
        await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
        });
        set({
          user: session.user,
          token: session.access_token,
          isInitialized: true,
        });
      } else {
          throw new Error('Invalid session data received from server');
      }
    } catch (error) {
      console.error("Fatal: Could not initialize user session:", error);
      set({ isInitialized: true }); // Mark as initialized to prevent loops
    }
  },
}));

if (typeof window !== 'undefined') {
  useUserStore.getState().initializeSession();
}