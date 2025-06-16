'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { BookOpen, Target, Brain, BarChart2, Clock, Zap, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.push('/signin');
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center pt-16">
        <div className="text-[#232946] text-xl" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      <div className="flex flex-col gap-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-[#232946] tracking-tight mb-4" style={{ letterSpacing: '-0.02em', fontWeight: 800 }}>
            About readfluent
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Your intelligent language learning companion. Learn how to make the most of readfluent's features.
          </p>
        </div>

        {/* Getting Started Section */}
        <section className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-[#232946] mb-6" style={{ letterSpacing: '-0.01em' }}>Getting Started</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Upload Your First Book</h3>
                <p className="text-gray-600">Click the "Upload EPUB" button in your library to add your first book. We support standard EPUB format books in your target language.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Start Reading</h3>
                <p className="text-gray-600">Open your book and begin reading. Use the auto-scroll feature to maintain a comfortable reading pace, and adjust the speed as needed.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#2563eb] text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Track Vocabulary</h3>
                <p className="text-gray-600">Click on words to mark them as known, tracking, or ignored. This helps build your vocabulary and track your progress.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-[#232946] mb-6" style={{ letterSpacing: '-0.01em' }}>Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div className="text-[#2563eb]">{<BookOpen className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">EPUB Support</h3>
                <p className="text-gray-600">Read any book in your target language with section-based navigation and customizable reading settings.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-[#2563eb]">{<Target className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Word Tracking</h3>
                <p className="text-gray-600">Track vocabulary with status categories (known, tracking, ignored) and interactive word highlighting.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-[#2563eb]">{<Brain className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Wiktionary Integration</h3>
                <p className="text-gray-600">Get instant definitions and translations while reading, powered by Wiktionary.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-[#2563eb]">{<BarChart2 className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Analytics</h3>
                <p className="text-gray-600">Track your reading progress and comprehension statistics to measure your improvement.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tips & Tricks Section */}
        <section className="bg-white rounded-xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-[#232946] mb-6" style={{ letterSpacing: '-0.01em' }}>Tips & Tricks</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="text-[#2563eb]">{<Zap className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Keyboard Shortcuts</h3>
                <p className="text-gray-600">Use keyboard shortcuts for efficient word status management. Press 'K' for known, 'T' for tracking, and 'I' for ignored words.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-[#2563eb]">{<Clock className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Auto-Scroll</h3>
                <p className="text-gray-600">Use the auto-scroll feature to maintain a consistent reading pace. Adjust the speed using the slider to match your comfort level.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="text-[#2563eb]">{<ArrowRight className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold text-[#232946] mb-2">Progress Tracking</h3>
                <p className="text-gray-600">Your reading progress is automatically saved. You can always pick up where you left off, and track your improvement over time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="bg-[#2563eb] rounded-xl p-8 text-white">
          <h2 className="text-2xl font-bold mb-4" style={{ letterSpacing: '-0.01em' }}>Need Help?</h2>
          <p className="mb-6">If you have any questions or need assistance, our support team is here to help.</p>
          <a
            href="mailto:support@readfluent.com"
            className="inline-block bg-white text-[#2563eb] px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
          >
            Contact Support
          </a>
        </section>
      </div>
    </div>
  );
} 