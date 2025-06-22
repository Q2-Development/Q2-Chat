import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { supabase } from '@/lib/supabaseClient';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter();
  const { isAuthenticated, isInitialized, user } = useUserStore();
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (!isInitialized) return;

      if (!isAuthenticated || !user || user.is_anonymous) {
        router.push('/auth');
        return;
      }

      // Check if user has API key
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
          setHasApiKey(data.has_api_key);
          
          if (!data.has_api_key) {
            router.push('/setup-api-key');
          }
        } else {
          router.push('/auth');
        }
      } catch (error) {
        console.error('Failed to check API key status:', error);
        router.push('/auth');
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [isAuthenticated, isInitialized, user, router]);

  if (!isInitialized || isChecking || hasApiKey === null) {
    return (
      <div className="flex h-screen bg-neutral-900 text-white items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin" size={32} />
          <p className="text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasApiKey) {
    return null;
  }

  return <>{children}</>;
};