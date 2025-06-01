'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Sidebar Navigation Items
const navigation = [
  { name: 'Home', href: '/dashboard', icon: '🏠' },
  { name: 'Profile', href: '/profile', icon: '👤' },
  { name: 'About', href: '/about', icon: 'ℹ️' },
  // Add other authenticated links here if needed
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden sm:flex w-64 h-screen fixed left-0 top-0 bg-white border-r border-gray-200 flex-col px-4 py-6 [font-family:var(--font-mplus-rounded)] z-40">
      {/* Logo/Title - Updated to Row */} 
      <div className="mb-10 px-2">
        <Link href="/dashboard" className="font-bold text-[#0B1423] hover:text-[#162033] transition-colors duration-200 whitespace-nowrap [font-family:var(--font-mplus-rounded)] flex flex-row items-baseline justify-center">
          {/* Adjusted sizes and spacing */}
          <span className="text-2xl">ReadFluent</span>
        </Link>
      </div>

      {/* Navigation */} 
      <nav className="flex-grow">
        <ul>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name} className="mb-2">
                <Link
                  href={item.href}
                  className={`
                    flex items-center px-4 py-3 rounded-lg text-lg font-semibold transition-all duration-200 
                    ${isActive 
                      ? 'bg-[#e0f2fe] text-[#0c5488] border-2 border-[#a8dcfd] shadow-[0_2px_0px_#a8dcfd]'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-[#0B1423]'
                    }
                  `}
                >
                  <span className="mr-4 text-2xl">{item.icon}</span>
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