import React from 'react';
import { ReaderSettings as ReaderSettingsType } from './ReaderTypes';

interface ReaderSettingsProps {
  show: boolean;
  onClose: () => void;
  pendingSettings: ReaderSettingsType | null;
  readerSettings: ReaderSettingsType;
  hasUnsavedSettings: boolean;
  availableVoices: any[];
  isFetchingVoices: boolean;
  handlePendingSettingChange: (newSettings: Partial<ReaderSettingsType>) => void;
  handleSaveSettings: () => void;
  handleCancelSettings: () => void;
  fetchVoices: () => void;
}

export const ReaderSettings: React.FC<ReaderSettingsProps> = ({
  show,
  onClose,
  pendingSettings,
  readerSettings,
  hasUnsavedSettings,
  availableVoices,
  isFetchingVoices,
  handlePendingSettingChange,
  handleSaveSettings,
  handleCancelSettings,
  fetchVoices,
}) => {
  if (!show) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={onClose}
    >
      <div
        className="card-themed w-full relative"
        style={{
          fontFamily: 'var(--font-family)',
          maxWidth: 400,
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '2rem',
          boxSizing: 'border-box',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 theme-text-secondary hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
          style={{ lineHeight: 1 }}
        >
          ×
        </button>
        <h2 className="text-2xl font-extrabold mb-4 theme-text tracking-tight text-center">Reader Settings</h2>
        {/* Settings controls start here */}
        <div className="mb-6">
          <label className="block font-bold mb-2 theme-text">Font Size ({pendingSettings?.readerFontSize || readerSettings.readerFontSize}px)</label>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={pendingSettings?.readerFontSize || readerSettings.readerFontSize}
            onChange={e => { handlePendingSettingChange({ readerFontSize: Number(e.target.value) }); }}
            className="w-full accent-[#2563eb]"
          />
        </div>
        <div className="mb-6">
          <label className="block font-bold mb-2 theme-text">Text Width ({pendingSettings?.readerWidth || readerSettings.readerWidth}px)</label>
          <input
            type="range"
            min={500}
            max={1600}
            step={10}
            value={pendingSettings?.readerWidth || readerSettings.readerWidth}
            onChange={e => { handlePendingSettingChange({ readerWidth: Number(e.target.value) }); }}
            className="w-full accent-[#2563eb]"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>Narrow (~55 char)</span>
            <span>Medium (~75 char)</span>
            <span>Wide (~95 char)</span>
          </div>
        </div>
        <div className="mb-6">
          <label className="block font-bold mb-2 theme-text">Font Family</label>
          <select
            value={pendingSettings?.readerFont || readerSettings.readerFont}
            onChange={e => { handlePendingSettingChange({ readerFont: e.target.value }); }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="serif">Serif (default)</option>
            <option value="sans-serif">Sans-serif</option>
            <option value="Georgia">Georgia</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Arial">Arial</option>
            <option value="Verdana">Verdana</option>
            <option value="Noto Sans">Noto Sans</option>
            <option value="Merriweather">Merriweather</option>
          </select>
        </div>
        {(() => {
          const currentFontSize = pendingSettings?.readerFontSize || readerSettings.readerFontSize;
          const currentFont = pendingSettings?.readerFont || readerSettings.readerFont;
          const currentWidth = pendingSettings?.readerWidth || readerSettings.readerWidth;
          return (
            <div className="mt-4 mb-4 p-5 theme-border rounded theme-text" style={{ fontFamily: currentFont, fontSize: currentFontSize, maxWidth: currentWidth, backgroundColor: 'var(--background)', border: '1px solid var(--border-color)' }}>
              Example: El rápido zorro marrón salta sobre el perro perezoso.
            </div>
          );
        })()}
        <div className="mb-6">
          <label className="block font-bold mb-2 theme-text">Container Mode</label>
          <select
            value={pendingSettings?.readerContainerStyle || readerSettings.readerContainerStyle}
            onChange={e => {
              handlePendingSettingChange({ readerContainerStyle: e.target.value as any });
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="contained">Contained (default)</option>
            <option value="border">Border Only</option>
            <option value="none">None (transparent)</option>
            <option value="full-width">Full-width (long)</option>
          </select>
        </div>
        <div className="mb-6">
          <label className="block font-bold mb-2 theme-text">Sentences per Page</label>
          <input
            type="number"
            min={10}
            max={200}
            step={1}
            value={pendingSettings?.sentencesPerPage || readerSettings.sentencesPerPage}
            onChange={e => {
              handlePendingSettingChange({ sentencesPerPage: Number(e.target.value) });
            }}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>
        <div className="mb-6">
          <label className="block font-bold mb-2 theme-text">TTS Speed ({pendingSettings?.ttsSpeed || readerSettings.ttsSpeed}x)</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={pendingSettings?.ttsSpeed || readerSettings.ttsSpeed}
            onChange={e => {
              handlePendingSettingChange({ ttsSpeed: Number(e.target.value) });
            }}
            className="w-full accent-[#2563eb]"
          />
        </div>
        <div className="mb-6">
          <label className="block font-bold mb-2 theme-text">Voice Option</label>
          <div className="flex gap-2 items-center">
            <select
              value={pendingSettings?.ttsVoice || readerSettings.ttsVoice}
              onChange={e => {
                handlePendingSettingChange({ ttsVoice: e.target.value });
              }}
              className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              {availableVoices.length === 0 ? (
                <option>Loading voices...</option>
              ) : (
                availableVoices.map(v => (
                  <option key={v.Name} value={v.Name}>{v.LocalName || v.Name} ({v.Locale})</option>
                ))
              )}
            </select>
            <button type="button" onClick={fetchVoices} disabled={isFetchingVoices} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs font-bold">
              {isFetchingVoices ? 'Updating...' : 'Update List'}
            </button>
          </div>
        </div>
        {/* ... (copy all other settings controls from the modal here) ... */}
        {/* Save/Cancel Buttons */}
        {hasUnsavedSettings && (
          <div style={{
            position: 'fixed',
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{
              pointerEvents: 'auto',
              background: 'rgba(255,255,255,0.98)',
              boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
              borderTop: '1px solid #e5e7eb',
              borderRadius: '0 0 1rem 1rem',
              padding: '1rem 2rem',
              maxWidth: 400,
              width: '100%',
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
            }}>
              <button
                onClick={handleSaveSettings}
                className="btn-primary flex-1"
              >
                Save Settings
              </button>
              <button
                onClick={handleCancelSettings}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 