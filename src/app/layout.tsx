import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cinzel_Decorative, Playfair_Display, Merriweather, EB_Garamond } from "next/font/google";
import { M_PLUS_Rounded_1c } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/Providers';
import { AuthProvider } from '@/contexts/AuthContext';
import { I18nProvider } from '@/contexts/I18nContext';
import '@/i18n/config';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzelDecorative = Cinzel_Decorative({
  weight: ['400', '700', '900'],
  variable: "--font-cinzel-decorative",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: "--font-playfair",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  weight: ['300', '400', '700', '900'],
  variable: "--font-merriweather",
  subsets: ["latin"],
});

const ebGaramond = EB_Garamond({
  weight: ['400', '500', '600', '700', '800'],
  variable: "--font-eb-garamond",
  subsets: ["latin"],
});

const mplusRounded = M_PLUS_Rounded_1c({
  subsets: ['latin'],
  weight: ['500', '700'],
  display: 'swap',
  variable: '--font-mplus-rounded',
});

export const metadata: Metadata = {
  title: "readfluent",
  description: "Learn a new language by reading the books you love",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cinzelDecorative.variable} ${playfairDisplay.variable} ${merriweather.variable} ${ebGaramond.variable} ${mplusRounded.variable} antialiased`}
      >
        <AuthProvider>
          <I18nProvider>
            <Providers>
              {children}
            </Providers>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
