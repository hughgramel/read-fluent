'use client';
import '@/i18n/config';
import { I18nProvider } from '@/contexts/I18nContext';
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <I18nProvider>
        {children}
      </I18nProvider>
    </AuthProvider>
  );
} 