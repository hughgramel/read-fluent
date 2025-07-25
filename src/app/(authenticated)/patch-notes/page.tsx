"use client";

export default function PatchNotes() {
  return (
    <div className="min-h-screen theme-bg" style={{ fontFamily: 'var(--font-family)' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold theme-text mb-8 tracking-tight" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>Patch Notes</h1>
        <div className="flex flex-col gap-6">
                      <div className="card-themed rounded-2xl shadow-sm p-5 flex flex-col" style={{ fontSize: '1rem' }}>
              <div className="flex flex-row justify-between items-center mb-2">
                <span className="font-semibold theme-text text-base" style={{ fontWeight: 700 }}>v0.2</span>
                <span className="font-semibold theme-text text-base" style={{ fontWeight: 700 }}>2025.01.27.</span>
              </div>
              <div className="theme-text text-base mt-1 space-y-2" style={{ fontWeight: 400 }}>
              <div>• Updated available interface, target languages, dictionaries, adding Dutch, Italian, and German and persistence of these changes</div>
              <div>• Interface language will now be used directly when generating prompts (Was always English before)</div>
              <div>• Dictionaries will now automatically switch to match your selected interface and target languages, if available</div>
              <div>• Updated profile settings UI, added better prompts, added [LANGUAGE_EXCEPTION] placeholder</div>
              <div>• Fixed bug where all Books cards were deleted when deleting a single one</div>
              <div>• TTS voice dropdown now filtered by the target language</div>
              <div>• TTS voice dropdown now shows a message if no voice is set for the target language</div>
              <div>• Highlighting of words now default, highlights on click</div>
              <div>• Better TTS settings</div>
              <div>• Added word popup settings and ability to set default settings for word popup</div>
              <div>• Updated reader settings, added ability to set default settings for reader</div>
              <div>• Added ability to generate content with custom language, genre, topic, difficulty, DELF level, length</div>
              <div>• UI changes</div>
            </div>
          </div>
          <div className="card-themed rounded-2xl shadow-sm p-5 flex flex-col" style={{ fontSize: '1rem' }}>
            <div className="flex flex-row justify-between items-center mb-2">
              <span className="font-semibold theme-text text-base" style={{ fontWeight: 700 }}>v0.1</span>
              <span className="font-semibold theme-text text-base" style={{ fontWeight: 700 }}>2025.07.11.</span>
            </div>
            <div className="theme-text text-base mt-1" style={{ fontWeight: 400 }}>Release.</div>
          </div>
        </div>
      </div>
    </div>
  );
} 