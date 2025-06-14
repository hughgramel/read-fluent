'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Sidebar Navigation Items
const navigation = [
  { name: 'Library', href: '/library', icon: '📚' },
  { name: 'Saved', href: '/saved', icon: '💾' },
  { name: 'Words', href: '/words', icon: '🔤' },
  { name: 'Profile', href: '/profile', icon: '👤' },
  { name: 'About', href: '/about', icon: 'ℹ️' },
  // Add other authenticated links here if needed
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden sm:flex w-60 h-screen fixed left-0 top-0 bg-white border-r border-gray-100 flex-col px-6 py-8 z-40" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Logo/Title - Updated to Row */}
      <div className="mb-12 px-2 flex items-center justify-center">
        <Link href="/library" className="font-extrabold text-[#2563eb] hover:text-[#1749b1] transition-colors duration-200 whitespace-nowrap text-2xl tracking-tight flex flex-row items-center gap-2">
          <span className="text-3xl">📚</span>
          <span>readfluent</span>
        </Link>
      </div>
      {/* Navigation */}
      <nav className="flex-grow">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-4 px-4 py-3 rounded-lg text-lg font-semibold transition-all duration-200
                    ${isActive
                      ? 'bg-[#e8f0fe] text-[#2563eb] border border-[#2563eb] shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-[#222]'}
                  `}
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Optional: Add User Info or Logout at the bottom */}
      {/* <div className="mt-auto"> ... </div> */}
    </aside>
  );
} 