'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AboutPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#0B1423] text-xl [font-family:var(--font-mplus-rounded)]">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-4xl font-extrabold text-[#222] tracking-tight" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>
              Saved
            </h1>
          </div>
          
         
        </div>
      </div>
    </div>
  );
} 