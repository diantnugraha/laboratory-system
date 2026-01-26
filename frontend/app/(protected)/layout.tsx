'use client';

import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, refreshUserProfile } = useAuthStore();
  const router = useRouter();
  const hasRefreshed = useRef(false);

  useEffect(() => {
    // Only redirect after loading is complete and user is not authenticated
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }

    // Refresh user profile after hydration to get fresh data including role_name
    if (!isLoading && isAuthenticated && !hasRefreshed.current) {
      hasRefreshed.current = true;
      refreshUserProfile();
    }
  }, [isAuthenticated, isLoading, router, refreshUserProfile]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <AppLayout>{children}</AppLayout>;
}


