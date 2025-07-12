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
    name: 'Dark',
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
    name: 'Solarized',
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
];

interface ThemeContextType {
  currentTheme: Theme;
  customTheme: Theme | null;
  setTheme: (theme: Theme) => void;
  setCustomTheme: (config: ThemeConfig) => void;
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
      
      root.style.setProperty('--primary-color', config.primaryColor);
      root.style.setProperty('--secondary-color', config.secondaryColor);
      root.style.setProperty('--background', config.backgroundColor);
      root.style.setProperty('--foreground', config.textColor);
      root.style.setProperty('--text-color', config.textColor);
      root.style.setProperty('--font-family', config.fontFamily);
      root.style.setProperty('--border-color', config.borderColor);
      root.style.setProperty('--accent-color', config.accentColor);
      root.style.setProperty('--shadow-color', config.shadowColor);
      root.style.setProperty('--secondary-text-color', config.secondaryTextColor);
      
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
        await UserService.updateUserPreferences(user.uid, {
          theme: theme.id,
          customTheme: theme.id === 'custom' ? theme.config : undefined,
        });
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

  const resetToDefault = () => {
    setCurrentTheme(predefinedThemes[0]);
    setCustomThemeState(null);
  };

  const value = {
    currentTheme,
    customTheme,
    setTheme,
    setCustomTheme,
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