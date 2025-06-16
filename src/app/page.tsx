'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, Star, ChevronDown, Timer, Target, Landmark, Check } from 'lucide-react';
import { SiDiscord } from "react-icons/si";
// Removed unused Button import
import Footer from '@/components/Footer';

// Interface for Review Data
interface Review {
  id: number;
  name: string;
  quote: string;
  rating: number;
}

// Updated Review Data
const fakeReviews: Review[] = [
  {
    id: 1,
    name: "Alex R.",
    quote: "The word tracking and dictionary integration is incredible. I can finally read books in my target language with confidence!",
    rating: 5,
  },
  {
    id: 2,
    name: "Samantha K.",
    quote: "Being able to sync my vocabulary with Anki has been a game-changer for my language learning journey.",
    rating: 5,
  },
  {
    id: 3,
    name: "Mike T.",
    quote: "The comprehension analysis helps me understand my progress. It's like having a personal language tutor!",
    rating: 5,
  },
];

// Interface for FAQ Data
interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

// Updated FAQ Data
const fakeFAQs: FAQItem[] = [
  {
    id: 1,
    question: "What makes readfluent unique?",
    answer: "readfluent combines intelligent word tracking, easy dictionary lookups, and progress analysis to make reading in your target language more effective. Unlike other readers, it automatically tracks your vocabulary, provides instant translations, and helps you build a personalized learning path."
  },
  {
    id: 2,
    question: "How does the word tracking work?",
    answer: "As you read, readfluent automatically tracks which words you know and which ones you're learning. It provides instant dictionary lookups, saves words to your vocabulary list, and can sync with Anki for spaced repetition learning. This helps you build your vocabulary naturally through reading."
  },
  {
    id: 3,
    question: "Can I use my own ebooks?",
    answer: "Yes! readfluent supports EPUB files, allowing you to read your own books. The platform will analyze the text, track your progress, and help you learn new vocabulary as you read."
  },
  {
    id: 4,
    question: "How much does it cost?",
    answer: "readfluent is currently free to use during its development phase. We may introduce optional premium features in the future, but the core reading and vocabulary tracking features will remain accessible."
  },
  {
    id: 5,
    question: "What languages are supported?",
    answer: "readfluent currently supports multiple languages with dictionary integration. We're constantly adding more language support and features to help you learn effectively."
  }
];

// Simple Star Rating Component
const StarRating: React.FC<{ rating: number }> = ({ rating }) => (
  <div className="flex text-yellow-400">
    {[...Array(5)].map((_, i) => (
      <Star key={i} className={`w-5 h-5 ${i < rating ? 'fill-current' : 'text-gray-300'}`} />
    ))}
  </div>
);

// Image Placeholder Component - Removed Border
const ImagePlaceholder: React.FC<{ className?: string }> = ({ className = 'h-64 md:h-80 lg:h-96' }) => (
  <div className={`w-full bg-gray-100/60 rounded-lg flex items-center justify-center text-gray-500 ${className}`}>
    [Image Placeholder]
  </div>
);

// Component for styled bold text
const BoldHighlight: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <strong className="font-semibold text-[#67b9e7]">{children}</strong>
);

export default function LandingPage() {
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState('home');

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  // Handle scroll and update active section
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'features', 'how-it-works', 'faq', 'reviews'];
      const scrollPosition = window.scrollY + 100;

      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white text-[#0B1423] [font-family:var(--font-mplus-rounded)]">
      {/* Header with Navigation */}
      <header className="px-4 lg:px-6 h-20 flex items-center justify-between sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="container mx-auto max-w-7xl flex items-center justify-between w-full">
          <Link href="/" className="flex items-center justify-center" prefetch={false}>
            <span className="text-2xl font-bold text-[#0B1423] [font-family:var(--font-mplus-rounded)]">readfluent</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('features')}
              className={`text-base font-medium transition-colors ${
                activeSection === 'features' ? 'text-[#67b9e7]' : 'text-[#0B1423]/80 hover:text-[#0B1423]'
              }`}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className={`text-base font-medium transition-colors ${
                activeSection === 'how-it-works' ? 'text-[#67b9e7]' : 'text-[#0B1423]/80 hover:text-[#0B1423]'
              }`}
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className={`text-base font-medium transition-colors ${
                activeSection === 'faq' ? 'text-[#67b9e7]' : 'text-[#0B1423]/80 hover:text-[#0B1423]'
              }`}
            >
              FAQ
            </button>
            <Link href="/signin" className="text-base font-medium text-[#0B1423]/80 hover:text-[#0B1423] transition-colors" prefetch={false}>
              Sign In
            </Link>
            <Link
              href="#"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-5 py-2 text-sm font-medium text-white shadow-[0_3px_0_#454FBF] transition-all hover:bg-[#454FBF] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px active:translate-y-0 active:shadow-[0_1px_0_#454FBF] border-2 border-[#454FBF]"
              style={{ transform: 'translateY(-1px)' }}
            >
              <SiDiscord className="h-5 w-5" />
              Community
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero Section - Updated Content */}
        <section id="home" className="w-full py-12 md:py-20 lg:py-28 flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] to-[#fafbfe] min-h-[calc(100vh-80px)]">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              {/* Left Column: Image */}
              <div className="flex items-center justify-center">
                <ImagePlaceholder className="w-full max-w-md lg:max-w-lg" />
              </div>
              {/* Right Column: Text and Buttons */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-[#0B1423] [font-family:var(--font-mplus-rounded)]">
                  Read fluently, learn naturally.
                </h1>
                <p className="text-lg text-gray-600">
                  Your intelligent language learning companion. Track vocabulary, analyze comprehension, and build your language skills through reading.
                </p>
                {/* Vertical Button Layout */}
                <div className="flex flex-col gap-3 w-full max-w-xs mx-auto md:mx-0">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-[#67b9e7] px-8 text-lg font-semibold text-white shadow-[0_4px_0_#4792ba] transition-all hover:bg-[#4792ba] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#4792ba] whitespace-nowrap border-2 border-[#4792ba]"
                    style={{ transform: 'translateY(-2px)' }}
                    prefetch={false}
                  >
                    Sign Up Now
                  </Link>
                  <Link
                    href="/signin"
                    className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-[#cccccc] bg-white px-8 text-lg font-medium text-[#0B1423] shadow-[0_4px_0_#cccccc] transition-all hover:bg-gray-100 hover:text-[#0B1423] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#cccccc]"
                    prefetch={false}
                    style={{ transform: 'translateY(-2px)' }}
                  >
                    I Already Have an Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section - Updated Content */}
        <section id="features" className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200">
          <div className="container px-4 md:px-6 mx-auto max-w-5xl space-y-16 md:space-y-24">
            {/* Feature 1: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-[#0B1423]">Smart Word Tracking</h2>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Automatically track your <BoldHighlight>vocabulary progress</BoldHighlight> as you read. Get instant <BoldHighlight>dictionary lookups</BoldHighlight> and save words for review.
                </p>
              </div>
              <ImagePlaceholder />
            </div>

            {/* Feature 2: Image Left, Text Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="order-last md:order-first">
                <ImagePlaceholder />
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-[#0B1423]">Comprehension Analysis</h2>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Get insights into your <BoldHighlight>reading comprehension</BoldHighlight> and track your progress over time. Understand which areas need more focus.
                </p>
              </div>
            </div>

            {/* Feature 3: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-[#0B1423]">Anki Integration</h2>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Seamlessly sync your <BoldHighlight>vocabulary</BoldHighlight> with Anki for spaced repetition learning. Build your <BoldHighlight>flashcard deck</BoldHighlight> automatically.
                </p>
              </div>
              <ImagePlaceholder />
            </div>
          </div>
        </section>

        {/* How It Works Section - Updated Content */}
        <section id="how-it-works" className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200 bg-gray-50">
          <div className="container px-4 md:px-6 mx-auto max-w-5xl space-y-12 md:space-y-16">
            <h2 className="text-3xl font-bold tracking-tighter text-center sm:text-4xl md:text-5xl text-[#0B1423]">How It Works</h2>

            {/* Step 1: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-3">
                <span className="text-5xl font-bold text-[#67b9e7]">1</span>
                <h3 className="text-2xl font-bold text-[#0B1423]">Upload Your Book</h3>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Import your <BoldHighlight>EPUB files</BoldHighlight> and start reading in your target language.
                </p>
              </div>
              <ImagePlaceholder />
            </div>

            {/* Step 2: Image Left, Text Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="order-last md:order-first">
                <ImagePlaceholder />
              </div>
              <div className="space-y-3">
                <span className="text-5xl font-bold text-[#67b9e7]">2</span>
                <h3 className="text-2xl font-bold text-[#0B1423]">Track & Learn</h3>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Get instant <BoldHighlight>translations</BoldHighlight> and track your vocabulary progress as you read.
                </p>
              </div>
            </div>

            {/* Step 3: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-3">
                <span className="text-5xl font-bold text-[#67b9e7]">3</span>
                <h3 className="text-2xl font-bold text-[#0B1423]">Review & Improve</h3>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Sync with <BoldHighlight>Anki</BoldHighlight> and use flashcards to reinforce your learning.
                </p>
              </div>
              <ImagePlaceholder />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200">
          <div className="container px-4 md:px-6 mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tighter text-center sm:text-4xl text-[#0B1423] mb-8 md:mb-12">
              Frequently Asked Questions
            </h2>
            <div className="">
              {fakeFAQs.map((faq, index) => (
                <div key={faq.id} className="border-b border-gray-200">
                  <button
                    className="flex items-center justify-between w-full py-5 text-left"
                    onClick={() => toggleFAQ(index)}
                    aria-expanded={openFAQIndex === index}
                    aria-controls={`faq-answer-${faq.id}`}
                  >
                    <span className="text-lg font-semibold text-[#0B1423]">{faq.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 text-gray-500 transition-transform duration-200 transform ${openFAQIndex === index ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {openFAQIndex === index && (
                    <div
                      id={`faq-answer-${faq.id}`}
                      className="pr-8 pb-5 text-base text-gray-700 leading-relaxed"
                    >
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Section (Reviews) */}
        <section id="reviews" className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200 bg-gray-50">
          <div className="container px-4 md:px-6 mx-auto max-w-5xl">
            <h2 className="text-3xl font-bold tracking-tighter text-center sm:text-4xl text-[#0B1423] mb-8 md:mb-12">
              What Users Are Saying
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {fakeReviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-lg border border-gray-200/80 shadow-sm flex flex-col">
                  <StarRating rating={review.rating} />
                  <blockquote className="mt-4 text-lg font-medium leading-relaxed text-[#0B1423] flex-grow">
                    "{review.quote}"
                  </blockquote>
                  <p className="mt-4 text-sm font-semibold text-[#0B1423]/80">- {review.name}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final Call to Action Section - Updated Text */}
        <section className="w-full py-16 md:py-24 lg:py-28 flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] to-[#fafbfe]">
          <div className="container px-4 md:px-6 mx-auto max-w-5xl text-center flex flex-col items-center justify-center">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-[#0B1423] mb-10">
              Ready to Transform Your Language Learning?
            </h2>
            <Link
              href="/signup"
              className="inline-flex h-14 items-center justify-center rounded-lg bg-[#67b9e7] px-10 text-xl font-semibold text-white shadow-[0_5px_0_#4792ba] transition-all hover:bg-[#4792ba] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-1 active:translate-y-0 active:shadow-[0_2px_0_#4792ba] whitespace-nowrap border-2 border-[#4792ba]"
              style={{ transform: 'translateY(-3px)' }}
              prefetch={false}
            >
              Sign Up Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-gray-200 bg-gray-50">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row justify-between items-center w-full">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} readfluent. All rights reserved.
          </p>
          <nav className="flex gap-4 sm:gap-6 mt-2 sm:mt-0">
            <Link href="/terms" className="text-xs hover:underline underline-offset-4 text-gray-600" prefetch={false}>
              Terms of Service
            </Link>
            <Link href="/privacy" className="text-xs hover:underline underline-offset-4 text-gray-600" prefetch={false}>
              Privacy Policy
            </Link>
            <Link href="/contact" className="text-xs hover:underline underline-offset-4 text-gray-600" prefetch={false}>
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
