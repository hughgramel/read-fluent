'use client';

import { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { useTranslation } from 'react-i18next';

interface LanguageSelectorProps {
  onClose: () => void;
}

export default function LanguageSelector({ onClose }: LanguageSelectorProps) {
  const { currentLanguage, supportedLanguages, changeLanguage, isLoading } = useI18n();
  const { t } = useTranslation(['common', 'profile']);
  const [changingLanguage, setChangingLanguage] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) {
      onClose();
      return;
    }

    try {
      setChangingLanguage(true);
      await changeLanguage(languageCode);
      onClose();
    } catch (error) {
      console.error('Error changing language:', error);
      // Show error message to user
    } finally {
      setChangingLanguage(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-xs relative flex flex-col items-center"
        style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
          style={{ lineHeight: 1 }}
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4">{t('profile:language')}</h2>
        <div className="flex flex-col gap-2 w-full">
          {supportedLanguages.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              disabled={changingLanguage || isLoading}
              className={`w-full py-2 rounded-lg text-base font-semibold transition-colors ${
                currentLanguage === lang.code 
                  ? 'bg-[#f5f7fa] text-[#2563eb]' 
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              } ${(changingLanguage || isLoading) ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ textAlign: 'left', paddingLeft: 16 }}
            >
              <span className="flex items-center justify-between">
                <span>{lang.nativeName}</span>
                {currentLanguage === lang.code && (
                  <span className="text-[#2563eb] text-sm">✓</span>
                )}
              </span>
            </button>
          ))}
        </div>
        {(changingLanguage || isLoading) && (
          <div className="mt-4 text-sm text-gray-500">
            {t('common:loading')}
          </div>
        )}
      </div>
    </div>
  );
}