'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
// Header is not used, can be removed if not needed elsewhere implicitly
// import Header from '@/components/Header'; 
import Image from 'next/image';
// useEffect is no longer needed if we remove the effect
// import { useEffect } from 'react'; 
import Sidebar from '@/components/Sidebar';
import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const showSidebar = !(pathname?.startsWith('/reader') ?? false);

  // Bottom navigation rail for mobile (not on reader)
  const MobileNav = () => (
    <nav className="fixed bottom-0 left-0 w-full bg-[var(--sidebar-background)] border-t theme-border flex justify-around items-center py-1 z-40 sm:hidden" style={{ height: '56px' }}>
      <Link href="/library" className={`flex flex-col items-center justify-center flex-1 py-1 ${pathname === '/library' ? 'text-[var(--primary-color)] ' : 'text-[var(--secondary-text-color)]'}`}>📚<span className="text-xs mt-0.5">Library</span></Link>
      <Link href="/history" className={`flex flex-col items-center justify-center flex-1 py-1 ${pathname === '/history' ? 'text-[var(--primary-color)] ' : 'text-[var(--secondary-text-color)]'}`}>💾<span className="text-xs mt-0.5">Saved</span></Link>
      <Link href="/words" className={`flex flex-col items-center justify-center flex-1 py-1 ${pathname === '/words' ? 'text-[var(--primary-color)] ' : 'text-[var(--secondary-text-color)]'}`}>🔤<span className="text-xs mt-0.5">Words</span></Link>
      <Link href="/profile" className={`flex flex-col items-center justify-center flex-1 py-1 ${pathname === '/profile' ? 'text-[var(--primary-color)] ' : 'text-[var(--secondary-text-color)]'}`}>👤<span className="text-xs mt-0.5">Profile</span></Link>
      <Link href="/about" className={`flex flex-col items-center justify-center flex-1 py-1 ${pathname === '/about' ? 'text-[var(--primary-color)] ' : 'text-[var(--secondary-text-color)]'}`}>ℹ️<span className="text-xs mt-0.5">About</span></Link>
    </nav>
  );

  return (
    <ProtectedRoute>
      <div className="flex h-screen"> {/* Changed min-h-screen to h-screen for better viewport control */}
        {showSidebar && <Sidebar />}
        {/* Added overflow-y-auto for scrolling, responsive margin, and overscroll-y-contain */}
        <main
          className={`flex-1 min-h-screen w-full overflow-y-auto overscroll-y-contain page-container ${showSidebar ? 'md:ml-64' : ''}`}
          style={{ background: 'var(--background)' }}
        >
          {/* Page content goes here */}
          {children}
        </main>
      </div>
      {/* Mobile bottom nav rail, not on reader */}
      {pathname && !pathname.startsWith('/reader') && <MobileNav />}
    </ProtectedRoute>
  );
} 