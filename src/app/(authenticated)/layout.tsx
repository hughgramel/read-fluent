'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
// Header is not used, can be removed if not needed elsewhere implicitly
// import Header from '@/components/Header'; 
import Image from 'next/image';
// useEffect is no longer needed if we remove the effect
// import { useEffect } from 'react'; 
import Sidebar from '@/components/Sidebar';
import MobileNav from '../../components/MobileNav';
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

  return (
    <ProtectedRoute>
      <div className="flex h-screen"> {/* Changed min-h-screen to h-screen for better viewport control */}
        {showSidebar && <Sidebar />}
        {/* Added overflow-y-auto for scrolling, responsive margin, and overscroll-y-contain */}
        <main
          className={`flex-1 min-h-screen w-full overflow-y-auto overscroll-y-contain page-container ${showSidebar ? 'md:ml-64' : ''}`}
          style={{ background: 'var(--background)', paddingBottom: 'max(130px, env(safe-area-inset-bottom))' }}
        >
          {/* Page content goes here */}
          {children}
        </main>
      </div>
      {/* Mobile bottom nav rail, not on reader */}
      {pathname && !pathname.startsWith('/reader') && <MobileNav pathname={pathname} />}
    </ProtectedRoute>
  );
} 