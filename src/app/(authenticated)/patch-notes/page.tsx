"use client";

export default function PatchNotes() {
  return (
    <div className="min-h-screen" style={{ background: '#f7f8fa', fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold text-[#232946] mb-8 tracking-tight" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>Patch Notes</h1>
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col" style={{ fontSize: '1rem' }}>
            <div className="flex flex-row justify-between items-center mb-2">
              <span className="font-semibold text-black text-base" style={{ fontWeight: 700 }}>v0.1</span>
              <span className="font-semibold text-black text-base" style={{ fontWeight: 700 }}>2025.07.11.</span>
            </div>
            <div className="text-black text-base mt-1" style={{ fontWeight: 400 }}>Release.</div>
          </div>
        </div>
      </div>
    </div>
  );
} 