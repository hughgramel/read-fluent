import React from 'react';
import { ReaderSettings as ReaderSettingsType, TTSVoice } from './ReaderTypes';

interface ReaderSettingsProps {
  showSettings: boolean;
  settings: ReaderSettingsType;
  availableVoices: TTSVoice[];
  isFetchingVoices: boolean;
  onClose: () => void;
  onSavePreferences: (settings: Partial<ReaderSettingsType>) => void;
  onFetchVoices: () => void;
}

export function ReaderSettings({
  showSettings,
  settings,
  availableVoices,
  isFetchingVoices,
  onClose,
  onSavePreferences,
  onFetchVoices,
}: ReaderSettingsProps) {
  if (!showSettings) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.4)', color: '#232946' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border-[0.75] border-black shadow-lg w-full relative"
        style={{
          fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif',
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
          className="absolute top-3 right-3 text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors bg-transparent border-none"
          style={{ lineHeight: 1 }}
        >
          ×
        </button>
        <h2 className="text-2xl font-extrabold mb-4 text-[#232946] tracking-tight text-center">Reader Settings</h2>
        
        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">Font Size ({settings.readerFontSize}px)</label>
          <input
            type="range"
            min={14}
            max={28}
            step={1}
            value={settings.readerFontSize}
            onChange={e => onSavePreferences({ readerFontSize: Number(e.target.value) })}
            className="w-full accent-[#2563eb]"
          />
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">Text Width ({settings.readerWidth}px)</label>
          <input
            type="range"
            min={500}
            max={1600}
            step={10}
            value={settings.readerWidth}
            onChange={e => onSavePreferences({ readerWidth: Number(e.target.value) })}
            className="w-full accent-[#2563eb]"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>Narrow (~55 char)</span>
            <span>Medium (~75 char)</span>
            <span>Wide (~95 char)</span>
          </div>
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">Font Family</label>
          <select
            value={settings.readerFont}
            onChange={e => onSavePreferences({ readerFont: e.target.value })}
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

        {/* Example sentence */}
        <div className="mt-4 mb-4 p-5 border-[0.75] border-black rounded bg-gray-50 text-black" style={{ fontFamily: settings.readerFont, fontSize: settings.readerFontSize, maxWidth: settings.readerWidth }}>
          Example: El rápido zorro marrón salta sobre el perro perezoso.
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">Container Mode</label>
          <select
            value={settings.readerContainerStyle}
            onChange={e => onSavePreferences({ readerContainerStyle: e.target.value as any })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="contained">Contained (default)</option>
            <option value="border">Border Only</option>
            <option value="none">None (transparent)</option>
            <option value="full-width">Full-width (long)</option>
          </select>
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">Sentences per Page</label>
          <input
            type="number"
            min={10}
            max={200}
            step={1}
            value={settings.sentencesPerPage}
            onChange={e => onSavePreferences({ sentencesPerPage: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">TTS Speed ({settings.ttsSpeed}x)</label>
          <input
            type="range"
            min={0.5}
            max={2}
            step={0.05}
            value={settings.ttsSpeed}
            onChange={e => onSavePreferences({ ttsSpeed: Number(e.target.value) })}
            className="w-full accent-[#2563eb]"
          />
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">Voice Option</label>
          <div className="flex gap-2 items-center">
            <select
              value={settings.ttsVoice}
              onChange={e => onSavePreferences({ ttsVoice: e.target.value })}
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
            <button type="button" onClick={onFetchVoices} disabled={isFetchingVoices} className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-xs font-bold">
              {isFetchingVoices ? 'Updating...' : 'Update List'}
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="disable-word-highlighting"
            type="checkbox"
            checked={settings.disableWordHighlighting}
            onChange={e => onSavePreferences({ disableWordHighlighting: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="disable-word-highlighting" className="font-bold text-black select-none cursor-pointer">Disable word highlighting</label>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="disable-sentence-highlighting"
            type="checkbox"
            checked={settings.disableSentenceHighlighting}
            onChange={e => onSavePreferences({ disableSentenceHighlighting: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="disable-sentence-highlighting" className="font-bold text-black select-none cursor-pointer">Disable sentence highlighting</label>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="invisible-text"
            type="checkbox"
            checked={settings.invisibleText}
            onChange={e => onSavePreferences({ invisibleText: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="invisible-text" className="font-bold text-black select-none cursor-pointer">Invisible text (text is rendered but not visible)</label>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="show-current-word-when-invisible"
            type="checkbox"
            checked={settings.showCurrentWordWhenInvisible}
            onChange={e => onSavePreferences({ showCurrentWordWhenInvisible: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
            disabled={!settings.invisibleText}
          />
          <label htmlFor="show-current-word-when-invisible" className="font-bold text-black select-none cursor-pointer">Show currently-being-read word when invisible</label>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="highlight-sentence-on-hover"
            type="checkbox"
            checked={settings.highlightSentenceOnHover}
            onChange={e => onSavePreferences({ highlightSentenceOnHover: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="highlight-sentence-on-hover" className="font-bold text-black select-none cursor-pointer">Highlight sentences on hover</label>
        </div>

        <div className="mb-6">
          <label className="block font-bold mb-2 text-black">Line Spacing</label>
          <input
            type="range"
            min={1.0}
            max={2.5}
            step={0.05}
            value={settings.lineSpacing}
            onChange={e => onSavePreferences({ lineSpacing: Number(e.target.value) })}
            className="w-full accent-[#2563eb]"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>1.0</span>
            <span>1.5</span>
            <span>2.5</span>
          </div>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="disable-word-spans"
            type="checkbox"
            checked={settings.disableWordSpans}
            onChange={e => onSavePreferences({ disableWordSpans: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="disable-word-spans" className="font-bold text-black select-none cursor-pointer">Disable word-level spans (only wrap sentences)</label>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="disable-sentence-spans"
            type="checkbox"
            checked={settings.disableSentenceSpans}
            onChange={e => onSavePreferences({ disableSentenceSpans: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="disable-sentence-spans" className="font-bold text-black select-none cursor-pointer">Disable sentence-level spans (merge all text on page)</label>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="show-audio-bar-on-start"
            type="checkbox"
            checked={settings.showAudioBarOnStart}
            onChange={e => onSavePreferences({ showAudioBarOnStart: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="show-audio-bar-on-start" className="font-bold text-black select-none cursor-pointer">Show audio bar on start</label>
        </div>

        <div className="mb-6 flex items-center">
          <input
            id="enable-highlight-words"
            type="checkbox"
            checked={settings.enableHighlightWords}
            onChange={e => onSavePreferences({ enableHighlightWords: e.target.checked })}
            className="mr-3 h-5 w-5 accent-[#2563eb] border-2 border-gray-300 rounded"
          />
          <label htmlFor="enable-highlight-words" className="font-bold text-black select-none cursor-pointer">Enable highlight words</label>
        </div>
      </div>
    </div>
  );
} 