'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserService } from '@/services/userService';
import { ThemeConfig } from '@/types/user';

export interface Theme {
  id: string;
  name: string;
  config: ThemeConfig;
}

// Helper function to darken a color for hover states
const darkenColor = (hex: string, amount: number = 20): string => {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
  const b = Math.max(0, (num & 0x0000FF) - amount);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
};

// Predefined themes
export const predefinedThemes: Theme[] = [
  {
    id: 'default',
    name: 'Default',
    config: {
      primaryColor: '#2563eb',
      secondaryColor: '#67b9e7',
      backgroundColor: '#ffffff',
      textColor: '#0B1423',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#cccccc',
      accentColor: '#67b9e7',
      shadowColor: '#d1d5db',
      secondaryTextColor: '#777777',
    },
  },
  {
    id: 'dark',
    name: 'Dark Blue',
    config: {
      primaryColor: '#3b82f6',
      secondaryColor: '#90caf9',
      backgroundColor: '#121212',
      textColor: '#ededed',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#424242',
      accentColor: '#90caf9',
      shadowColor: '#000000',
      secondaryTextColor: '#a0a0a0',
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    config: {
      primaryColor: '#60a5fa',
      secondaryColor: '#93c5fd',
      backgroundColor: '#0f172a',
      textColor: '#f8fafc',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#334155',
      accentColor: '#60a5fa',
      shadowColor: '#000000',
      secondaryTextColor: '#cbd5e1',
    },
  },
  {
    id: 'true-dark',
    name: 'True Dark',
    config: {
      primaryColor: '#ffffff',
      secondaryColor: '#e5e7eb',
      backgroundColor: '#000000',
      textColor: '#ffffff',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#374151',
      accentColor: '#f3f4f6',
      shadowColor: '#111827',
      secondaryTextColor: '#d1d5db',
    },
  },
  {
    id: 'high-contrast',
    name: 'High Contrast',
    config: {
      primaryColor: '#000000',
      secondaryColor: '#333333',
      backgroundColor: '#ffffff',
      textColor: '#000000',
      fontFamily: 'Arial, sans-serif',
      borderColor: '#000000',
      accentColor: '#000000',
      shadowColor: '#666666',
      secondaryTextColor: '#333333',
    },
  },
  {
    id: 'sepia',
    name: 'Sepia',
    config: {
      primaryColor: '#8b4513',
      secondaryColor: '#deb887',
      backgroundColor: '#fbf0d9',
      textColor: '#5a4b32',
      fontFamily: 'Georgia, serif',
      borderColor: '#c0b8a8',
      accentColor: '#cd853f',
      shadowColor: '#d1d5db',
      secondaryTextColor: '#8b7d6b',
    },
  },
  {
    id: 'solarized',
    name: 'Solarized Dark',
    config: {
      primaryColor: '#268bd2',
      secondaryColor: '#2aa198',
      backgroundColor: '#002b36',
      textColor: '#839496',
      fontFamily: 'Monaco, "Cascadia Code", monospace',
      borderColor: '#586e75',
      accentColor: '#268bd2',
      shadowColor: '#073642',
      secondaryTextColor: '#657b83',
    },
  },
  {
    id: 'solarized-light',
    name: 'Solarized Light',
    config: {
      primaryColor: '#268bd2',
      secondaryColor: '#2aa198',
      backgroundColor: '#fdf6e3',
      textColor: '#657b83',
      fontFamily: 'Monaco, "Cascadia Code", monospace',
      borderColor: '#93a1a1',
      accentColor: '#268bd2',
      shadowColor: '#eee8d5',
      secondaryTextColor: '#586e75',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    config: {
      primaryColor: '#0891b2',
      secondaryColor: '#06b6d4',
      backgroundColor: '#f0f9ff',
      textColor: '#0c4a6e',
      fontFamily: 'Inter, sans-serif',
      borderColor: '#7dd3fc',
      accentColor: '#0ea5e9',
      shadowColor: '#bae6fd',
      secondaryTextColor: '#0369a1',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    config: {
      primaryColor: '#16a34a',
      secondaryColor: '#22c55e',
      backgroundColor: '#f0fdf4',
      textColor: '#14532d',
      fontFamily: 'system-ui, sans-serif',
      borderColor: '#86efac',
      accentColor: '#15803d',
      shadowColor: '#bbf7d0',
      secondaryTextColor: '#166534',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    config: {
      primaryColor: '#ea580c',
      secondaryColor: '#fb923c',
      backgroundColor: '#fff7ed',
      textColor: '#9a3412',
      fontFamily: 'Merriweather, serif',
      borderColor: '#fed7aa',
      accentColor: '#dc2626',
      shadowColor: '#fde68a',
      secondaryTextColor: '#c2410c',
    },
  },
  {
    id: 'purple',
    name: 'Purple',
    config: {
      primaryColor: '#7c3aed',
      secondaryColor: '#a78bfa',
      backgroundColor: '#faf5ff',
      textColor: '#581c87',
      fontFamily: 'Playfair Display, serif',
      borderColor: '#c4b5fd',
      accentColor: '#8b5cf6',
      shadowColor: '#ddd6fe',
      secondaryTextColor: '#6b21a8',
    },
  },
  {
    id: 'rose',
    name: 'Rose',
    config: {
      primaryColor: '#e11d48',
      secondaryColor: '#f43f5e',
      backgroundColor: '#fff1f2',
      textColor: '#881337',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#fecaca',
      accentColor: '#be185d',
      shadowColor: '#fecaca',
      secondaryTextColor: '#9f1239',
    },
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    config: {
      primaryColor: '#4b5563',
      secondaryColor: '#6b7280',
      backgroundColor: '#f9fafb',
      textColor: '#111827',
      fontFamily: 'Inter, sans-serif',
      borderColor: '#d1d5db',
      accentColor: '#374151',
      shadowColor: '#e5e7eb',
      secondaryTextColor: '#6b7280',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    config: {
      primaryColor: '#1f2937',
      secondaryColor: '#4b5563',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      borderColor: '#e5e7eb',
      accentColor: '#374151',
      shadowColor: '#f3f4f6',
      secondaryTextColor: '#6b7280',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    config: {
      primaryColor: '#00ff00',
      secondaryColor: '#00cc00',
      backgroundColor: '#000000',
      textColor: '#00ff00',
      fontFamily: 'Monaco, "Cascadia Code", "Courier New", monospace',
      borderColor: '#00ff00',
      accentColor: '#00ff00',
      shadowColor: '#003300',
      secondaryTextColor: '#00cc00',
    },
  },
  {
    id: 'default-brown',
    name: 'Default Brown',
    config: {
      primaryColor: '#8B5C2A', // brown
      secondaryColor: '#C9A066', // secondary brown
      backgroundColor: '#ffffff',
      textColor: '#0B1423',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#cccccc',
      accentColor: '#C9A066',
      shadowColor: '#d1d5db',
      secondaryTextColor: '#777777',
    },
  },
  {
    id: 'default-purple',
    name: 'Default Purple',
    config: {
      primaryColor: '#7c3aed', // purple
      secondaryColor: '#a78bfa', // secondary purple
      backgroundColor: '#ffffff',
      textColor: '#0B1423',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#cccccc',
      accentColor: '#a78bfa',
      shadowColor: '#d1d5db',
      secondaryTextColor: '#777777',
    },
  },
  {
    id: 'default-green',
    name: 'Default Green',
    config: {
      primaryColor: '#16a34a', // green
      secondaryColor: '#22c55e', // secondary green
      backgroundColor: '#ffffff',
      textColor: '#0B1423',
      fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
      borderColor: '#cccccc',
      accentColor: '#22c55e',
      shadowColor: '#d1d5db',
      secondaryTextColor: '#777777',
    },
  },
];

interface ThemeContextType {
  currentTheme: Theme;
  customTheme: Theme | null;
  setTheme: (theme: Theme) => void;
  setCustomTheme: (config: ThemeConfig) => void;
  previewTheme: (theme: Theme) => void;
  resetToDefault: () => void;
  predefinedThemes: Theme[];
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentTheme, setCurrentTheme] = useState<Theme>(predefinedThemes[0]);
  const [customTheme, setCustomThemeState] = useState<Theme | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from user preferences
  useEffect(() => {
    const loadTheme = async () => {
      if (user?.uid) {
        try {
          const prefs = await UserService.getUserPreferences(user.uid);
          if (prefs?.theme) {
            if (prefs.theme === 'custom' && prefs.customTheme) {
              const custom: Theme = {
                id: 'custom',
                name: 'Custom',
                config: prefs.customTheme,
              };
              setCustomThemeState(custom);
              setCurrentTheme(custom);
            } else {
              const theme = predefinedThemes.find(t => t.id === prefs.theme);
              if (theme) {
                setCurrentTheme(theme);
              }
            }
          }
        } catch (error) {
          console.error('Error loading theme:', error);
        }
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [user]);

  // Apply theme to CSS variables
  useEffect(() => {
    const applyTheme = (theme: Theme) => {
      const root = document.documentElement;
      const config = theme.config;
      
      // Helper function to convert hex to RGB
      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16)
        } : null;
      };
      
      const primaryRgb = hexToRgb(config.primaryColor);
      const secondaryRgb = hexToRgb(config.secondaryColor);
      
      root.style.setProperty('--primary-color', config.primaryColor);
      root.style.setProperty('--primary-color-hover', darkenColor(config.primaryColor));
      root.style.setProperty('--secondary-color', config.secondaryColor);
      root.style.setProperty('--secondary-color-hover', darkenColor(config.secondaryColor));
      root.style.setProperty('--background', config.backgroundColor);
      root.style.setProperty('--foreground', config.textColor);
      root.style.setProperty('--text-color', config.textColor);
      root.style.setProperty('--font-family', config.fontFamily);
      root.style.setProperty('--border-color', config.borderColor);
      root.style.setProperty('--accent-color', config.accentColor);
      root.style.setProperty('--shadow-color', config.shadowColor);
      root.style.setProperty('--secondary-text-color', config.secondaryTextColor);
      
      // Set RGB values for rgba() usage
      if (primaryRgb) {
        root.style.setProperty('--primary-color-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
      }
      if (secondaryRgb) {
        root.style.setProperty('--secondary-color-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
      }
      
      // Update data-theme attribute for backward compatibility
      if (theme.id === 'dark') {
        root.setAttribute('data-theme', 'dark');
      } else if (theme.id === 'sepia') {
        root.setAttribute('data-theme', 'sepia');
      } else if (theme.id === 'solarized') {
        root.setAttribute('data-theme', 'solarized');
      } else {
        root.setAttribute('data-theme', 'light');
      }
    };

    applyTheme(currentTheme);
  }, [currentTheme]);

  const setTheme = async (theme: Theme) => {
    setCurrentTheme(theme);
    if (user?.uid) {
      try {
        const preferences: any = { theme: theme.id };
        if (theme.id === 'custom') {
          preferences.customTheme = theme.config;
        }
        await UserService.updateUserPreferences(user.uid, preferences);
      } catch (error) {
        console.error('Error saving theme:', error);
      }
    }
  };

  const setCustomTheme = async (config: ThemeConfig) => {
    const custom: Theme = {
      id: 'custom',
      name: 'Custom',
      config,
    };
    
    setCustomThemeState(custom);
    setCurrentTheme(custom);
    
    if (user?.uid) {
      try {
        await UserService.updateUserPreferences(user.uid, {
          theme: 'custom',
          customTheme: config,
        });
      } catch (error) {
        console.error('Error saving custom theme:', error);
      }
    }
  };

  const previewTheme = (theme: Theme) => {
    // Temporarily apply the theme without saving
    const root = document.documentElement;
    const config = theme.config;
    
    // Helper function to convert hex to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    
    const primaryRgb = hexToRgb(config.primaryColor);
    const secondaryRgb = hexToRgb(config.secondaryColor);
    
    root.style.setProperty('--primary-color', config.primaryColor);
    root.style.setProperty('--primary-color-hover', darkenColor(config.primaryColor));
    root.style.setProperty('--secondary-color', config.secondaryColor);
    root.style.setProperty('--secondary-color-hover', darkenColor(config.secondaryColor));
    root.style.setProperty('--background', config.backgroundColor);
    root.style.setProperty('--foreground', config.textColor);
    root.style.setProperty('--text-color', config.textColor);
    root.style.setProperty('--font-family', config.fontFamily);
    root.style.setProperty('--border-color', config.borderColor);
    root.style.setProperty('--accent-color', config.accentColor);
    root.style.setProperty('--shadow-color', config.shadowColor);
    root.style.setProperty('--secondary-text-color', config.secondaryTextColor);
    
    // Set RGB values for rgba() usage
    if (primaryRgb) {
      root.style.setProperty('--primary-color-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    }
    if (secondaryRgb) {
      root.style.setProperty('--secondary-color-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
    }
    
    // Update data-theme attribute for backward compatibility
    if (theme.id === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (theme.id === 'sepia') {
      root.setAttribute('data-theme', 'sepia');
    } else if (theme.id === 'solarized') {
      root.setAttribute('data-theme', 'solarized');
    } else {
      root.setAttribute('data-theme', 'light');
    }
  };

  const resetToDefault = () => {
    setCurrentTheme(predefinedThemes[0]);
    setCustomThemeState(null);
  };

  const value = {
    currentTheme,
    customTheme,
    setTheme,
    setCustomTheme,
    previewTheme,
    resetToDefault,
    predefinedThemes,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}