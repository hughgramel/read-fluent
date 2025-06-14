'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import '@fontsource/inter/variable.css';

const navigation = [
  { name: 'Library', href: '/library', icon: '📚' },
  { name: 'Saved', href: '/saved', icon: '💾' },
  { name: 'Words', href: '/words', icon: '🔤' },
  { name: 'Profile', href: '/profile', icon: '👤' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <>
      {/* Top Header for medium and large screens */}
      <header className="bg-white border-b border-gray-100 hidden sm:block w-full z-50 relative">
        <nav className="w-full px-4 sm:px-8 lg:px-16">
          <div className="flex items-center justify-center h-16 sm:h-16 lg:h-20 flex-nowrap">
            {/* Logo (Left) */}
            <div className="flex-shrink-0 mr-4 lg:mr-8 absolute left-4 sm:left-8 lg:left-16">
              <Link href="/library" className="font-extrabold text-[#2563eb] hover:text-[#1749b1] transition-colors duration-200 whitespace-nowrap flex items-baseline tracking-tight">
                <span className="text-4xl sm:text-5xl">readfluent</span>
              </Link>
            </div>

            {/* Navigation Links (Center) - Medium and Large Screens */}
            <div className="flex items-center justify-center">
              <div className="flex items-center justify-center sm:space-x-4 lg:space-x-10 flex-nowrap">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center gap-2 px-2 sm:px-3 lg:px-4 py-2 text-base sm:text-lg lg:text-xl font-semibold transition-colors duration-200 whitespace-nowrap tracking-wide
                        border-b-2 ${isActive ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-gray-600 hover:text-[#2563eb]'}
                        focus:outline-none focus:text-[#2563eb] focus:border-[#2563eb]
                      `}
                      style={{ background: 'none', boxShadow: 'none', borderRadius: 0, minHeight: 0 }}
                    >
                      <span className="text-xl lg:text-2xl" style={{ lineHeight: 1 }}>{item.icon}</span>
                      <span className="sm:inline" style={{ lineHeight: 1 }}>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Bottom Navigation Bar for mobile */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="flex justify-around items-center h-16">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex flex-col items-center justify-center px-2 py-2 font-semibold text-sm
                  border-t-2 ${isActive ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-gray-500 hover:text-[#2563eb]'}
                  focus:outline-none focus:text-[#2563eb] focus:border-[#2563eb] transition-colors duration-200
                `}
                style={{ background: 'none', boxShadow: 'none', borderRadius: 0, minHeight: 0 }}
              >
                <span className="text-2xl mb-0.5" style={{ lineHeight: 1 }}>{item.icon}</span>
                <span style={{ lineHeight: 1 }}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Top Bar with title only */}
      <header className="bg-white border-b border-gray-100 sm:hidden z-50 relative">
        <div className="flex items-center justify-center h-16 px-4">
          <Link href="/library" className="font-extrabold text-[#2563eb] flex items-baseline tracking-tight">
            <span className="text-3xl">readfluent</span>
          </Link>
        </div>
      </header>
      
      {/* Add padding to the bottom of the page on mobile to account for fixed navigation */}
      <div className="sm:hidden h-16"></div>
    </>
  );
} 