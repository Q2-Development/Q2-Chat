"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/userStore';
import { AuthSection } from '@/components/user-menu/auth-section';

export default function AuthPage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useUserStore();

  useEffect(() => {
    if (isInitialized && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isInitialized, router]);

  return (
    <div className="flex h-screen bg-neutral-900 text-white items-center justify-center p-4">
      <div className="w-full max-w-md">
        <AuthSection />
      </div>
    </div>
  );
}