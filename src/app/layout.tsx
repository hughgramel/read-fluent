import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cinzel_Decorative, Playfair_Display, Merriweather, EB_Garamond } from "next/font/google";
import { M_PLUS_Rounded_1c } from 'next/font/google';
import "./globals.css";
import { Providers } from '@/components/Providers';
import { AuthProvider } from '@/contexts/AuthContext';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

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

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: "ReadFluent",
  description: "Learn a new language by reading the books you love",
  applicationName: "ReadFluent",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ReadFluent",
    startupImage: [
      "/apple-touch-icon.png",
    ],
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "ReadFluent",
    title: "ReadFluent",
    description: "Learn a new language by reading the books you love",
    images: ["/apple-touch-icon.png"],
  },
  twitter: {
    card: "summary",
    title: "ReadFluent",
    description: "Learn a new language by reading the books you love",
    images: ["/apple-touch-icon.png"],
  },
  icons: {
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "167x167", type: "image/png" },
    ],
    icon: [
      { url: "/favicon-196.png", sizes: "196x196", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
    "apple-mobile-web-app-title": "ReadFluent",
    "msapplication-TileColor": "#000000",
    "msapplication-tap-highlight": "no",
  },
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
            <Providers>
              {children}
              <PWAInstallPrompt />
            </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
