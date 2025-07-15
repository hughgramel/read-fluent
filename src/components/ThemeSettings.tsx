'use client';

import React, { useState, useEffect } from 'react';
import { useTheme, Theme } from '@/contexts/ThemeContext';
import { ThemeConfig } from '@/types/user';

export default function ThemeSettings() {
  const { currentTheme, customTheme, setTheme, setCustomTheme, previewTheme, predefinedThemes, isLoading } = useTheme();
  const [showCustomThemeForm, setShowCustomThemeForm] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
  const [pendingCustomConfig, setPendingCustomConfig] = useState<ThemeConfig>({
    primaryColor: '#2563eb',
    secondaryColor: '#67b9e7',
    backgroundColor: '#ffffff',
    textColor: '#0B1423',
    fontFamily: 'Noto Sans, Helvetica Neue, Arial, sans-serif',
    borderColor: '#cccccc',
    accentColor: '#67b9e7',
    shadowColor: '#d1d5db',
    secondaryTextColor: '#777777',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Initialize pending theme with current theme
  useEffect(() => {
    if (currentTheme) {
      setPendingTheme(currentTheme);
      if (currentTheme.id === 'custom' && customTheme) {
        setPendingCustomConfig(customTheme.config);
      }
    }
  }, [currentTheme, customTheme]);

  const fontOptions = [
    { value: 'Noto Sans, Helvetica Neue, Arial, sans-serif', label: 'Noto Sans' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Inter, sans-serif', label: 'Inter' },
    { value: 'system-ui, sans-serif', label: 'System UI' },
    { value: 'Merriweather, serif', label: 'Merriweather' },
    { value: 'Playfair Display, serif', label: 'Playfair Display' },
    { value: 'Monaco, "Cascadia Code", monospace', label: 'Monaco' },
  ];

  const handlePresetThemeChange = (themeId: string) => {
    const theme = predefinedThemes.find(t => t.id === themeId);
    if (theme) {
      setPendingTheme(theme);
      setShowCustomThemeForm(false);
      setHasUnsavedChanges(true);
      // Preview the theme immediately
      previewTheme(theme);
    }
  };

  const handleCustomConfigChange = (key: keyof ThemeConfig, value: string) => {
    const newConfig = { ...pendingCustomConfig, [key]: value };
    setPendingCustomConfig(newConfig);
    setHasUnsavedChanges(true);
    // Preview the custom theme immediately
    const customTheme: Theme = {
      id: 'custom',
      name: 'Custom',
      config: newConfig
    };
    previewTheme(customTheme);
  };

  const handleSaveTheme = async () => {
    if (pendingTheme) {
      if (pendingTheme.id === 'custom') {
        await setCustomTheme(pendingCustomConfig);
      } else {
        await setTheme(pendingTheme);
      }
      setHasUnsavedChanges(false);
    }
  };

  const handleCancelChanges = () => {
    setPendingTheme(currentTheme);
    if (currentTheme?.id === 'custom' && customTheme) {
      setPendingCustomConfig(customTheme.config);
    }
    setHasUnsavedChanges(false);
    // Restore the original theme
    previewTheme(currentTheme);
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="text-gray-500">Loading theme settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold theme-text mb-4">Theme Settings</h3>
        
        {/* Preset Themes */}
        <div className="space-y-3">
          <label className="font-medium theme-text">Choose a theme:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {predefinedThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => handlePresetThemeChange(theme.id)}
                className={`
                  p-3 rounded-lg border-2 transition-all duration-200
                  ${pendingTheme?.id === theme.id
                    ? 'border-primary-color theme-bg-primary text-white'
                    : 'theme-border theme-bg hover:theme-bg-accent hover:text-white'
                  }
                `}
                style={{
                  backgroundColor: pendingTheme?.id === theme.id ? undefined : theme.config.backgroundColor,
                  color: pendingTheme?.id === theme.id ? undefined : theme.config.textColor,
                  borderColor: pendingTheme?.id === theme.id ? undefined : theme.config.borderColor,
                }}
              >
                <div className="text-center">
                  <div className="text-sm font-medium">{theme.name}</div>
                  <div className="flex justify-center mt-1 space-x-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.config.primaryColor }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.config.secondaryColor }}
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: theme.config.accentColor }}
                    />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Theme Button */}
        <div className="mt-4">
                  <button
          onClick={() => {
            setShowCustomThemeForm(!showCustomThemeForm);
            if (!showCustomThemeForm) {
              const customTheme: Theme = {
                id: 'custom',
                name: 'Custom',
                config: pendingCustomConfig
              };
              setPendingTheme(customTheme);
              setHasUnsavedChanges(true);
              // Preview the custom theme immediately
              previewTheme(customTheme);
            }
          }}
            className={`
              btn-secondary transition-all duration-200
              ${pendingTheme?.id === 'custom' ? 'btn-primary' : ''}
            `}
          >
            {showCustomThemeForm ? 'Hide Custom Theme' : 'Create Custom Theme'}
          </button>
        </div>

        {/* Custom Theme Form */}
        {showCustomThemeForm && (
          <div className="mt-6 space-y-4 card-themed">
            <h4 className="text-md font-semibold theme-text">Custom Theme Configuration</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Primary Color (Dark Blue)
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.primaryColor}
                  onChange={(e) => handleCustomConfigChange('primaryColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Secondary Color (Light Blue)
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.secondaryColor}
                  onChange={(e) => handleCustomConfigChange('secondaryColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Background Color
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.backgroundColor}
                  onChange={(e) => handleCustomConfigChange('backgroundColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Text Color
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.textColor}
                  onChange={(e) => handleCustomConfigChange('textColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Border Color
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.borderColor}
                  onChange={(e) => handleCustomConfigChange('borderColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Accent Color
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.accentColor}
                  onChange={(e) => handleCustomConfigChange('accentColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Shadow Color
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.shadowColor}
                  onChange={(e) => handleCustomConfigChange('shadowColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium theme-text mb-1">
                  Secondary Text Color
                </label>
                <input
                  type="color"
                  value={pendingCustomConfig.secondaryTextColor}
                  onChange={(e) => handleCustomConfigChange('secondaryTextColor', e.target.value)}
                  className="w-full h-10 rounded border theme-border"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium theme-text mb-1">
                Font Family
              </label>
              <select
                value={pendingCustomConfig.fontFamily}
                onChange={(e) => handleCustomConfigChange('fontFamily', e.target.value)}
                className="select-themed w-full"
              >
                {fontOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Save/Cancel Buttons */}
        {hasUnsavedChanges && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSaveTheme}
              className="btn-primary"
            >
              Save Theme
            </button>
            <button
              onClick={handleCancelChanges}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Current Theme Info */}
        <div className="mt-6 p-4 card-themed">
          <h4 className="text-md font-semibold theme-text mb-3">Current Theme</h4>
          <div className="flex items-center gap-3">
            <div className="flex space-x-2">
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: currentTheme.config.primaryColor }}
              />
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: currentTheme.config.secondaryColor }}
              />
              <div
                className="w-6 h-6 rounded-full border-2 border-gray-300"
                style={{ backgroundColor: currentTheme.config.accentColor }}
              />
            </div>
            <div>
              <div className="font-medium theme-text">{currentTheme.name}</div>
              <div className="text-sm theme-text-secondary">
                {currentTheme.id === 'custom' ? 'Custom theme' : 'Predefined theme'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}