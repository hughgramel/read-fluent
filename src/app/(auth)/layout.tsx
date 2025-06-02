'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/library');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#0B1423]">
        <div className="text-[#FFD700] text-xl">Loading...</div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <>{children}</>;
} 