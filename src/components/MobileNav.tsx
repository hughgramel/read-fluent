import Link from 'next/link';
import { FaBookOpen, FaRegSave, FaUser, FaInfoCircle, FaHome } from 'react-icons/fa';
import { PiTextAaBold } from 'react-icons/pi';
import { FaRegClone } from 'react-icons/fa'; // Review icon

interface MobileNavProps {
  pathname: string;
}

const navigation = [
  { name: 'Home', href: '/home', icon: <FaHome size={22} /> },
  { name: 'Library', href: '/library', icon: <FaBookOpen size={22} /> },
  { name: 'Review', href: '/review', icon: <FaRegClone size={22} /> },
  { name: 'History', href: '/history', icon: <FaRegSave size={22} /> },
  { name: 'Words', href: '/words', icon: <PiTextAaBold size={22} /> },
  { name: 'Profile', href: '/profile', icon: <FaUser size={22} /> },
];

const GRAY = 'rgb(98,108,145)';

export default function MobileNav({ pathname }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 w-full bg-[var(--sidebar-background)] border-t theme-border flex justify-around items-center py-1 z-40 sm:hidden" style={{ height: '56px', paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
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
    </nav>
  );
} 