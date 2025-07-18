'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { FaBookOpen, FaRegSave, FaUser, FaInfoCircle, FaPalette, FaHome } from 'react-icons/fa';
import { MdPushPin } from 'react-icons/md';
import { PiTextAaBold } from 'react-icons/pi';

// Sidebar Navigation Items
const navigation = [
  { name: 'Home', href: '/home', icon: <FaHome /> },
  { name: 'Library', href: '/library', icon: <FaBookOpen /> },
  { name: 'History', href: '/history', icon: <FaRegSave /> },
  { name: 'Words', href: '/words', icon: <PiTextAaBold /> },
  { name: 'Profile', href: '/profile', icon: <FaUser /> },
  { name: 'About', href: '/about', icon: <FaInfoCircle /> },
  // Add other authenticated links here if needed
];

const bottomButtons = [
  { name: 'Theme', icon: <FaPalette />, onClickKey: 'theme' },
];

const GRAY = 'rgb(98,108,145)';
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_EXPANDED_WIDTH = 240;
const ICON_SIZE = 28;
const ICON_BOX = 48;

// Pin icon color constants
const PIN_LIGHT_GRAY = '#9aa1b2'; // slightly darker gray for unpinned

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  // Add more as needed
];

const THEMES = [
  { key: 'auto', label: 'Auto' },
  { key: 'light', label: 'Light theme' },
  { key: 'dark', label: 'Dark theme' },
  { key: 'eink', label: 'Eink theme' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [showTheme, setShowTheme] = useState(false);
  const [theme, setTheme] = useState('light');
  const [pinned, setPinned] = useState(false);

  // On mount, load pin state from localStorage
  useEffect(() => {
    const pinnedState = localStorage.getItem('sidebar-pinned');
    if (pinnedState === 'true') {
      setPinned(true);
      setCollapsed(false);
    } else {
      setPinned(false);
      setCollapsed(true);
    }
  }, []);

  // Handle theme/language change (persist as needed)
  const handleThemeChange = (t: string) => {
    setTheme(t);
    setShowTheme(false);
    document.documentElement.setAttribute('data-theme', t);
  };

  // Auto-expand/collapse on hover unless pinned
  const handleSidebarMouseEnter = () => { if (!pinned) setCollapsed(false); };
  const handleSidebarMouseLeave = () => { if (!pinned) setCollapsed(true); };

  // Button click handlers
  const handleBottomButtonClick = (key: string) => {
    if (key === 'theme') setShowTheme(true);
  };

  return (
    <aside
      className="hidden sm:flex h-screen fixed left-0 top-0 theme-border border-r flex-col z-40 shadow-none"
      style={{
        fontFamily: 'var(--font-family)',
        fontSize: 16,
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH,
        transition: 'width 0.2s',
        boxShadow: 'none',
        overflow: 'hidden',
        alignItems: 'center',
        backgroundColor: 'var(--sidebar-background)',
      }}
      onMouseEnter={handleSidebarMouseEnter}
      onMouseLeave={handleSidebarMouseLeave}
    >
      {/* Logo/Icon at the very top with pin */}
      <div
        className="relative flex items-center w-full"
        style={{ height: ICON_BOX, marginTop: 12 }}
      >
        {/* Centered logo */}
        <div style={{ width: SIDEBAR_COLLAPSED_WIDTH, margin: '0 auto', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', left: 0, right: 0 }}>
          <Link href="/library" className="flex items-center justify-center" style={{ width: ICON_BOX, height: ICON_BOX }}>
            <FaBookOpen size={ICON_SIZE + 4} style={{ color: 'var(--primary-color)' }} />
          </Link>
        </div>
        {/* Pin icon at top right, only show when expanded */}
        {!collapsed && (
          <button
            onClick={() => {
              setPinned((v) => {
                const newPinned = !v;
                localStorage.setItem('sidebar-pinned', newPinned ? 'true' : 'false');
                return newPinned;
              });
            }}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: pinned ? 'var(--text-color)' : PIN_LIGHT_GRAY,
              fontSize: 19,
              outline: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MdPushPin size={20} />
          </button>
        )}
      </div>
      {/* Large gap between logo and nav icons */}
      <div style={{ height: 24 }} />
      {/* Navigation icons */}
      <nav className="flex flex-col items-center flex-1 w-full">
        <ul className="flex flex-col items-center w-full" style={{ gap: 4 }}>
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name} style={{ width: '100%' }}>
                <Link
                  href={item.href}
                  className="group flex items-center transition-all duration-200 hover:bg-gray-50"
                  style={{
                    borderRadius: 14,
                    margin: '0 auto',
                    width: collapsed ? 54 : '85%', // narrower highlight in collapsed mode
                    minWidth: 0,
                    height: ICON_BOX,
                    marginBottom: 0,
                    marginTop: 0,
                    background: isActive ? 'rgba(var(--primary-color-rgb, 37, 99, 235), 0.1)' : 'none',
                    color: isActive ? 'var(--primary-color)' : GRAY,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: collapsed ? 'center' : 'flex-start',
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
                        color: isActive ? 'var(--primary-color)' : GRAY,
                        transition: 'color 0.2s',
                      }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  {/* Label column: only visible when expanded */}
                  {!collapsed && (
                    <div
                      style={{
                        width: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                        minWidth: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                        maxWidth: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                        overflow: 'hidden',
                        opacity: 1,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          color: isActive ? 'var(--primary-color)' : GRAY,
                          marginLeft: 10,
                        }}
                      >
                        {item.name}
                      </span>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {/* Bottom buttons */}
      <div style={{ width: '100%', marginBottom: 16 }}>
        <ul className="flex flex-col items-center w-full" style={{ gap: 4 }}>
          {bottomButtons.map((btn, idx) => (
            <li key={btn.name} style={{ width: '100%' }}>
              <button
                onClick={() => handleBottomButtonClick(btn.onClickKey)}
                className="group flex items-center transition-all duration-200 hover:bg-gray-50"
                style={{
                  borderRadius: 14,
                  margin: '0 auto',
                  width: '90%',
                  minWidth: 0,
                  height: ICON_BOX,
                  marginBottom: 0,
                  marginTop: 0,
                  background: 'none',
                  color: GRAY,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'background 0.2s, color 0.2s, width 0.2s',
                  padding: 0,
                  border: 'none',
                  outline: 'none',
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
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
                      color: GRAY,
                      transition: 'color 0.2s',
                    }}
                  >
                    {btn.icon}
                  </span>
                </div>
                {/* Label column: only visible when expanded */}
                {!collapsed && (
                  <div
                    style={{
                      width: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                      minWidth: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                      maxWidth: SIDEBAR_EXPANDED_WIDTH - SIDEBAR_COLLAPSED_WIDTH - 16,
                      overflow: 'hidden',
                      opacity: 1,
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 16,
                        color: GRAY,
                        marginLeft: 10,
                      }}
                    >
                      {btn.name}
                    </span>
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {/* Theme Popup */}
      {showTheme && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          onClick={() => setShowTheme(false)}
        >
          <div
            className="theme-bg rounded-2xl theme-shadow shadow-lg p-8 w-full max-w-xs relative flex flex-col items-center"
            style={{ fontFamily: 'var(--font-family)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowTheme(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
              style={{ lineHeight: 1 }}
            >×</button>
            <h2 className="text-xl font-bold mb-4 theme-text">Theme</h2>
            <div className="flex flex-col gap-2 w-full">
              {THEMES.map(t => (
                <button
                  key={t.key}
                  onClick={() => handleThemeChange(t.key)}
                  className="w-full py-2 rounded-lg text-base font-semibold hover:bg-gray-100 transition-colors"
                  style={{ 
                    textAlign: 'left', 
                    paddingLeft: 16,
                    backgroundColor: theme === t.key ? 'rgba(var(--primary-color-rgb, 37, 99, 235), 0.1)' : 'transparent',
                    color: theme === t.key ? 'var(--primary-color)' : 'var(--secondary-text-color)'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
} 