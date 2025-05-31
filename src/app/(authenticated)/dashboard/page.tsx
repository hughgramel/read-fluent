'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import ResourceBar from '@/components/ResourceBar';

// Sidebar Navigation Items
const navigation = [
  { name: 'Home', href: '/dashboard', icon: '🏠' },
  { name: 'Alliances', href: '/alliances', icon: '🤝' },
  { name: 'Profile', href: '/profile', icon: '👤' },
];

export default function Dashboard() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const [resourceBarFadeIn, setResourceBarFadeIn] = useState(false);



  return (
    <main className={`flex-1 flex flex-col px-4 py-8 transition-opacity duration-300 h-full ${isNavigating ? 'opacity-0' : 'opacity-100'}`}>


      {/* Main Content Area (Buttons Left, Placeholder Right) */} 
      <div className="flex-grow flex items-center w-full max-w-7xl mx-auto">
        {/* Centered Column: Buttons */}
        <div className="w-full flex flex-col items-center justify-center">
          <div className="flex flex-col gap-6 items-center">
            {/* Resume Nation Button */} 

            {/* New Nation Button */} 
            <button
              disabled={loading || isNavigating}
              className={`
                px-8 py-4 text-xl font-semibold rounded-xl border-2 transition-all duration-200 
                flex items-center justify-center gap-3 shadow-[0_4px_0px] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[0_2px_0px]
                [font-family:var(--font-mplus-rounded)] w-60 whitespace-nowrap
                ${loading 
                  ? 'bg-gray-200 text-gray-400 border-gray-300 shadow-gray-300 cursor-not-allowed'
                  : 'bg-[#6ec53e] text-white border-[#59a700] shadow-[#59a700] hover:bg-[#60b33a] active:bg-[#539e30]'
                }
              `}
            >
              <span role="img" aria-label="swords" className="text-xl">⚔️</span>
              New Nation
            </button>

            {/* Manage Saves Button - Updated Styles */}
            <button
              onClick={() => router.push('/load_game')}
              disabled={loading || isNavigating}
              className={`
                px-8 py-4 text-xl font-semibold rounded-xl border-2 transition-all duration-200 
                flex items-center justify-center gap-3 shadow-[0_4px_0px] hover:translate-y-[-2px] active:translate-y-[1px] active:shadow-[0_2px_0px]
                [font-family:var(--font-mplus-rounded)] w-60 whitespace-nowrap
                ${loading 
                  ? 'bg-gray-100 text-gray-400 border-gray-200 shadow-gray-200 cursor-not-allowed'
                  : 'bg-[#e28d24] text-white border-[#b36d15] shadow-[#b36d15] hover:bg-[#d07f1f] active:bg-[#b36d15]'
                }
              `}
            >
              <span role="img" aria-label="floppy disk" className="text-xl">💾</span>
              Saves
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
