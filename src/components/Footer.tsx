'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 shadow-md">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-600 [font-family:var(--font-mplus-rounded)]">© 2024 readFluent. All rights reserved.</p>
          </div>
          <div className="flex space-x-6">
            <Link href="/privacy" className="text-sm text-gray-600 hover:text-[#0B1423] transition-colors duration-200 [font-family:var(--font-mplus-rounded)]">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm text-gray-600 hover:text-[#0B1423] transition-colors duration-200 [font-family:var(--font-mplus-rounded)]">
              Terms of Service
            </Link>
            <Link href="/contact" className="text-sm text-gray-600 hover:text-[#0B1423] transition-colors duration-200 [font-family:var(--font-mplus-rounded)]">
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
} 