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
      <div className="flex items-center justify-center pt-16" style={{ background: 'var(--background)' }}>
        <div className="theme-text text-xl" style={{ fontFamily: 'var(--font-family)' }}>
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 min-h-screen" style={{ fontFamily: 'var(--font-family)', background: 'var(--background)' }}>
      <div className="flex flex-col gap-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold theme-text tracking-tight mb-4" style={{ letterSpacing: '-0.02em', fontWeight: 800 }}>
            About readfluent
          </h1>
          <p className="text-xl theme-text-secondary max-w-3xl mx-auto">
            Your intelligent language learning companion. Learn how to make the most of readfluent's features.
          </p>
        </div>

        {/* Getting Started Section */}
        <section className="card-themed">
          <h2 className="text-2xl font-bold theme-text mb-6" style={{ letterSpacing: '-0.01em' }}>Getting Started</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full theme-primary text-white flex items-center justify-center font-bold">1</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Upload Your First Book</h3>
                <p className="theme-text-secondary">Click the "Upload EPUB" button in your library to add your first book. We support standard EPUB format books in your target language.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full theme-primary text-white flex items-center justify-center font-bold">2</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Start Reading</h3>
                <p className="theme-text-secondary">Open your book and begin reading. Use the auto-scroll feature to maintain a comfortable reading pace, and adjust the speed as needed.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full theme-primary text-white flex items-center justify-center font-bold">3</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Track Vocabulary</h3>
                <p className="theme-text-secondary">Click on words to mark them as known, tracking, or ignored. This helps build your vocabulary and track your progress.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features Section */}
        <section className="card-themed">
          <h2 className="text-2xl font-bold theme-text mb-6" style={{ letterSpacing: '-0.01em' }}>Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <div style={{ color: 'var(--primary-color)' }}>{<BookOpen className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">EPUB Support</h3>
                <p className="theme-text-secondary">Read any book in your target language with section-based navigation and customizable reading settings.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div style={{ color: 'var(--primary-color)' }}>{<Target className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Word Tracking</h3>
                <p className="theme-text-secondary">Track vocabulary with status categories (known, tracking, ignored) and interactive word highlighting.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div style={{ color: 'var(--primary-color)' }}>{<Brain className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Wiktionary Integration</h3>
                <p className="theme-text-secondary">Get instant definitions and translations while reading, powered by Wiktionary.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div style={{ color: 'var(--primary-color)' }}>{<BarChart2 className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Analytics</h3>
                <p className="theme-text-secondary">Track your reading progress and comprehension statistics to measure your improvement.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Tips & Tricks Section */}
        <section className="card-themed">
          <h2 className="text-2xl font-bold theme-text mb-6" style={{ letterSpacing: '-0.01em' }}>Tips & Tricks</h2>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div style={{ color: 'var(--primary-color)' }}>{<Zap className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Keyboard Shortcuts</h3>
                <p className="theme-text-secondary">Use keyboard shortcuts for efficient word status management. Press 'K' for known, 'T' for tracking, and 'I' for ignored words.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div style={{ color: 'var(--primary-color)' }}>{<Clock className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Auto-Scroll</h3>
                <p className="theme-text-secondary">Use the auto-scroll feature to maintain a consistent reading pace. Adjust the speed using the slider to match your comfort level.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div style={{ color: 'var(--primary-color)' }}>{<ArrowRight className="w-6 h-6" />}</div>
              <div>
                <h3 className="text-lg font-semibold theme-text mb-2">Progress Tracking</h3>
                <p className="theme-text-secondary">Your reading progress is automatically saved. You can always pick up where you left off, and track your improvement over time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="card-themed theme-primary text-white">
          <h2 className="text-2xl font-bold mb-4" style={{ letterSpacing: '-0.01em' }}>Need Help?</h2>
          <p className="mb-6">If you have any questions or need assistance, our support team is here to help.</p>
          <a
            href="mailto:support@readfluent.com"
            className="inline-block bg-white text-black px-6 py-2 rounded-lg font-medium transition-colors"
            style={{ 
              color: 'var(--primary-color)',
              backgroundColor: 'var(--background)',
              border: '1px solid var(--border-color)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--secondary-color)';
              e.currentTarget.style.color = 'var(--background)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--background)';
              e.currentTarget.style.color = 'var(--primary-color)';
            }}
          >
            Contact Support
          </a>
        </section>
      </div>
    </div>
  );
} 