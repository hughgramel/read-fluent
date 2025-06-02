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
    <div className="w-full max-w-6xl [font-family:var(--font-mplus-rounded)] py-8">
      <div className="flex flex-col gap-8">
        <div className="w-full">
          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0B1423]">
              About LingoMine
            </h1>
          </div>
          
          <section className="mb-8">
            <div className="bg-white rounded-lg p-6 border-2 border-gray-300 shadow-[0_4px_0px] shadow-gray-300">
              <p className="text-[#0B1423] text-lg">
                habré ido han ido irá yo voy tú vas ido yendo vamos vais van fui fuiste fue fuimos fuisteis fueron.
              </p>
              {/* Add more content here */}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
} 