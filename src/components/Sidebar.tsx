'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaBookOpen, FaRegSave, FaUser, FaInfoCircle, FaThumbtack } from 'react-icons/fa';
import { PiTextAaBold } from 'react-icons/pi';

// Sidebar Navigation Items
const navigation = [
  { name: 'Library', href: '/library', icon: <FaBookOpen /> },
  { name: 'History', href: '/history', icon: <FaRegSave /> },
  { name: 'Words', href: '/words', icon: <PiTextAaBold /> },
  { name: 'Profile', href: '/profile', icon: <FaUser /> },
  { name: 'About', href: '/about', icon: <FaInfoCircle /> },
  // Add other authenticated links here if needed
];

const GRAY = 'rgb(98,108,145)';
const ACTIVE_BG = '#e6f0fd'; // blue shade for highlight
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 240;
const ICON_SIZE = 28;
const ICON_BOX = 48;

export default function Sidebar() {
  const pathname = usePathname();
  // Sidebar is always expanded
  const expanded = true;
  const pinned = true;

  return (
    <aside
      className="hidden sm:flex h-screen fixed left-0 top-0 bg-white border-r border-gray-100 flex-col z-40 shadow-none"
      style={{
        fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
        fontSize: 16,
        width: SIDEBAR_EXPANDED_WIDTH,
        transition: 'none',
        boxShadow: 'none',
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      {/* Logo/Icon at the very top */}
      <div
        className="relative flex items-center w-full"
        style={{ height: ICON_BOX, marginTop: 12 }}
      >
        {/* Centered logo */}
        <div style={{ width: SIDEBAR_COLLAPSED_WIDTH, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', left: 0, right: 0 }}>
          <Link href="/library" className="flex items-center justify-center" style={{ width: ICON_BOX, height: ICON_BOX }}>
            <FaBookOpen size={ICON_SIZE + 4} color="#2563eb" />
          </Link>
        </div>
      </div>
      {/* Large gap between logo and nav icons */}
      <div style={{ height: 24 }} />
      {/* Navigation icons */}
      <nav className="flex flex-col items-center flex-1 w-full">
        <ul className="flex flex-col items-center w-full" style={{ gap: 4 }}>
          {navigation.map((item, idx) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name} style={{ width: '100%' }}>
                <Link
                  href={item.href}
                  className={
                    `group flex items-center transition-all duration-200 ${isActive ? 'bg-[#e6f0fd]' : 'hover:bg-[#f5f7fa]'}`
                  }
                  style={{
                    borderRadius: 14,
                    margin: '0 auto',
                    width: '90%',
                    minWidth: 0,
                    height: ICON_BOX,
                    marginBottom: 0,
                    marginTop: 0,
                    background: isActive ? ACTIVE_BG : 'none',
                    color: isActive ? '#2563eb' : GRAY,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background 0.2s, color 0.2s, width 0.2s',
                    padding: 0,
                  }}
                >
                  {/* Icon column: always 80px, always centered */}
                  <div
                    style={{
                      width: SIDEBAR_COLLAPSED_WIDTH,
                      minWidth: SIDEBAR_COLLAPSED_WIDTH,
                      maxWidth: SIDEBAR_COLLAPSED_WIDTH,
                      height: ICON_BOX,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: ICON_SIZE,
                        height: ICON_SIZE,
                        fontSize: ICON_SIZE,
                        color: isActive ? '#2563eb' : GRAY,
                        transition: 'color 0.2s',
                      }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  {/* Label column: always visible */}
                  <div
                    style={{
                      width: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                      minWidth: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                      maxWidth: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                      overflow: 'hidden',
                      opacity: 1,
                      transition: 'none',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: isActive ? '#2563eb' : GRAY,
                        marginLeft: 10,
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
} 