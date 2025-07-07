'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Target, Brain, BarChart2, Clock, Zap, CheckCircle2, Sparkles } from 'lucide-react';

// Feature interface
interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

// Future plan interface
interface FuturePlan {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const features: Feature[] = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "EPUB Book Support",
      description: "Read any book in your target language with section-based navigation and customizable reading settings."
    },
    {
      icon: <Target className="w-6 h-6" />,
      title: "Word Tracking System",
      description: "Track vocabulary with status categories (known, tracking, ignored) and interactive word highlighting."
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Wiktionary Integration",
      description: "Get instant definitions and translations while reading, powered by Wiktionary."
    },
    {
      icon: <BarChart2 className="w-6 h-6" />,
      title: "Comprehension Analytics",
      description: "Track your reading progress and comprehension statistics to measure your improvement."
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Progress Saving",
      description: "Your reading progress and bookmarks are automatically saved and synchronized."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Keyboard Shortcuts",
      description: "Efficient word status management with intuitive keyboard shortcuts."
    }
  ];

  const futurePlans: FuturePlan[] = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Offline Support",
      description: "Read and access dictionary offline, perfect for travel or limited connectivity."
    },
    {
      icon: <CheckCircle2 className="w-6 h-6" />,
      title: "Spaced Repetition",
      description: "Built-in spaced repetition system for vocabulary retention."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Multiple Languages",
      description: "Support for multiple target languages with specialized dictionaries."
    }
  ];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      {/* Navigation */}
      <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-[#2563eb]">
                readfluent
              </Link>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="text-gray-600 hover:text-[#2563eb] transition-colors">
                Features
              </Link>
              <Link href="#future" className="text-gray-600 hover:text-[#2563eb] transition-colors">
                Roadmap
              </Link>
              <Link href="/signin" className="text-gray-600 hover:text-[#2563eb] transition-colors">
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-[#2563eb] text-white px-4 py-2 rounded-lg hover:bg-[#1749b1] transition-colors"
              >
                Get Started
              </Link>
            </div>
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-[#2563eb]"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-white">
          <div className="pt-20 px-4 space-y-4">
            <Link href="#features" className="block text-gray-600 hover:text-[#2563eb] transition-colors">
              Features
            </Link>
            <Link href="#future" className="block text-gray-600 hover:text-[#2563eb] transition-colors">
              Roadmap
            </Link>
            <Link href="/signin" className="block text-gray-600 hover:text-[#2563eb] transition-colors">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="block bg-[#2563eb] text-white px-4 py-2 rounded-lg hover:bg-[#1749b1] transition-colors text-center"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6" style={{ letterSpacing: '-0.02em' }}>
              Read fluently, learn naturally
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Your intelligent language learning companion. Track vocabulary, analyze comprehension, and build your language skills through reading.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="bg-[#2563eb] text-white px-8 py-3 rounded-lg hover:bg-[#1749b1] transition-colors text-lg font-medium"
              >
                Start Reading Now
              </Link>
              <Link
                href="#features"
                className="border border-gray-300 text-gray-700 px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors text-lg font-medium"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ letterSpacing: '-0.01em' }}>
              Everything you need to read in your target language
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed to make language learning through reading effective and enjoyable.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-[#2563eb] mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Future Plans Section */}
      <section id="future" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4" style={{ letterSpacing: '-0.01em' }}>
              Coming Soon
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We're constantly working to make readfluent even better. Here's what's coming next.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {futurePlans.map((plan, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="text-[#2563eb] mb-4">{plan.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{plan.title}</h3>
                <p className="text-gray-600">{plan.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#2563eb]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-8" style={{ letterSpacing: '-0.01em' }}>
            Ready to transform your language learning?
          </h2>
          <Link
            href="/signup"
            className="inline-block bg-white text-[#2563eb] px-8 py-3 rounded-lg hover:bg-gray-100 transition-colors text-lg font-medium"
          >
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">readfluent</h3>
              <p className="text-gray-600">
                Your intelligent language learning companion.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-gray-600 hover:text-[#2563eb]">Features</Link></li>
                <li><Link href="#future" className="text-gray-600 hover:text-[#2563eb]">Roadmap</Link></li>
                <li><Link href="/pricing" className="text-gray-600 hover:text-[#2563eb]">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-gray-600 hover:text-[#2563eb]">About</Link></li>
                <li><Link href="/blog" className="text-gray-600 hover:text-[#2563eb]">Blog</Link></li>
                <li><Link href="/contact" className="text-gray-600 hover:text-[#2563eb]">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-gray-600 hover:text-[#2563eb]">Privacy</Link></li>
                <li><Link href="/terms" className="text-gray-600 hover:text-[#2563eb]">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600">
              © {new Date().getFullYear()} readfluent. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
