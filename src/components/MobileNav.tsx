import Link from 'next/link';
import { FaBookOpen, FaRegSave, FaUser, FaInfoCircle, FaHome } from 'react-icons/fa';
import { PiTextAaBold } from 'react-icons/pi';
import { FaRegClone } from 'react-icons/fa'; // Review icon

interface MobileNavProps {
  pathname: string;
}

const navigation = [
  { name: 'Home', href: '/home', icon: <FaHome size={26} /> },
  { name: 'Library', href: '/library', icon: <FaBookOpen size={26} /> },
  { name: 'Review', href: '/review', icon: <FaRegClone size={26} /> },
  { name: 'History', href: '/history', icon: <FaRegSave size={26} /> },
  { name: 'Words', href: '/words', icon: <PiTextAaBold size={26} /> },
  { name: 'Profile', href: '/profile', icon: <FaUser size={26} /> },
];

const GRAY = 'rgb(98,108,145)';

export default function MobileNav({ pathname }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[var(--sidebar-background)] border-t theme-border flex flex-col justify-between items-center z-40 sm:hidden" style={{ height: '72px', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
      <div className="flex justify-around items-center w-full flex-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className="flex flex-col items-center justify-center flex-1 py-1"
              style={{ color: isActive ? 'var(--primary-color)' : GRAY }}
            >
              {item.icon}
              <span className="text-xs mt-0.5" style={{ fontWeight: isActive ? 700 : 400 }}>{item.name}</span>
            </Link>
          );
        })}
      </div>
      {/* Safe zone spacer for extra bottom padding on mobile */}
      <div style={{ height: 12 }} />
    </nav>
  );
} 