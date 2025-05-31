'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
// Header is not used, can be removed if not needed elsewhere implicitly
// import Header from '@/components/Header'; 
import Image from 'next/image';
// useEffect is no longer needed if we remove the effect
// import { useEffect } from 'react'; 
import Sidebar from '@/components/Sidebar';
import React from 'react';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Removed useEffect that was hiding body scroll

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50"> {/* Changed min-h-screen to h-screen for better viewport control */}
        <Sidebar />
        {/* Added overflow-y-auto for scrolling, responsive margin, and overscroll-y-contain */}
        <main className="flex-1 md:ml-64 p-4 sm:p-6 md:p-8 overflow-y-auto overscroll-y-contain">
          {/* Page content goes here */}
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
} 