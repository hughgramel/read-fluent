'use client';

import { useState, useEffect } from 'react';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running on iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Check if already running in standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS, show manual install instructions after a delay
    if (iOS && !standalone) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for this session
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  // Don't show if already dismissed in this session or running in standalone mode
  if (!showPrompt || isStandalone || sessionStorage.getItem('pwa-prompt-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        aria-label="Close"
      >
        <X size={16} />
      </button>
      
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <Smartphone className="text-blue-500" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
            Install ReadFluent
          </h3>
          {isIOS ? (
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">
                Add to your home screen for the best experience
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tap the share button <span className="inline-block">📤</span> and select "Add to Home Screen"
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                Install for quick access and offline reading
              </p>
              <button
                onClick={handleInstallClick}
                className="flex items-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1.5 rounded-md transition-colors"
              >
                <Download size={14} />
                <span>Install App</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}