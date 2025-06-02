'use client';

import { useState } from 'react';
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

// Fake Review Data
const fakeReviews: Review[] = [
  {
    id: 1,
    name: "Alex R.",
    quote: "Finally, a focus timer that doesn't feel like a chore! Building my nation keeps me coming back.",
    rating: 5,
  },
  {
    id: 2,
    name: "Samantha K.",
    quote: "I'm getting so much more done. Seeing my resources grow after each Pomodoro is super motivating.",
    rating: 5,
  },
  {
    id: 3,
    name: "Mike T.",
    quote: "The blend of productivity and light strategy is perfect. It breaks up my workday nicely.",
    rating: 5,
  },
];

// Interface for FAQ Data
interface FAQItem {
  id: number;
  question: string;
  answer: string;
}

// Fake FAQ Data
const fakeFAQs: FAQItem[] = [
  {
    id: 1,
    question: "What makes LingoMine unique?",
    answer: "LingoMine combines the proven Pomodoro focus technique with engaging nation-building gameplay. Instead of just watching a timer, you actively earn resources and make progress in a game world with each completed focus session."
  },
  {
    id: 2,
    question: "Is this just another Pomodoro timer?",
    answer: "While it uses Pomodoro principles (typically 25-minute focus intervals), the core loop involves earning in-game resources (like Gold, Industry, Population) for completing tasks and focus sessions. These resources are then used to develop your nation, creating a more engaging and rewarding experience than a standard timer."
  },
  {
    id: 3,
    question: "Do I need to be a gamer to use it?",
    answer: "Not at all! The game mechanics are designed to be simple and supplementary to the core focus timer. The main goal is productivity; the game adds a layer of motivation and visual progress."
  },
  {
    id: 4,
    question: "How much does it cost?",
    answer: "LingoMine is currently free to use during its development phase. We may introduce optional premium features in the future, but the core focus timer and gameplay loop will remain accessible."
  },
  {
    id: 5,
    question: "What kind of tasks can I track?",
    answer: "You can create any kind of task you want to focus on, whether it's work-related projects, studying, creative work, or even household chores. Each completed task during a focus session contributes to your progress."
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
  <strong className="font-semibold text-[rgb(28,176,246)]">{children}</strong>
);

export default function LandingPage() {
  // State for FAQ Accordion
  const [openFAQIndex, setOpenFAQIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQIndex(openFAQIndex === index ? null : index);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-white text-[#0B1423] [font-family:var(--font-mplus-rounded)]">
      {/* Header */}
      <header className="px-4 lg:px-6 h-20 flex items-center justify-between sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200/60">
        <div className="container mx-auto max-w-7xl flex items-center justify-between w-full">
          <Link href="/" className="flex items-center justify-center" prefetch={false}>
            {/* Adjusted size */}
            <span className="text-2xl font-bold text-[#0B1423] [font-family:var(--font-mplus-rounded)]">LingoMine</span>
          </Link>
          <nav className="flex items-center gap-5 sm:gap-8">
            <Link href="/signin" className="text-base font-medium text-[#0B1423]/80 hover:text-[#0B1423] transition-colors" prefetch={false}>
              Sign In
            </Link>
            {/* Discord Button - Added Icon */}
            <Link
              href="#" // Replace with your Discord/Community Link
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-5 py-2 text-sm font-medium text-white shadow-[0_3px_0_#454FBF] transition-all hover:bg-[#454FBF] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-px active:translate-y-0 active:shadow-[0_1px_0_#454FBF] border-2 border-[#454FBF]"
              style={{ transform: 'translateY(-1px)' }}
              onMouseDown={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 0px #454FBF';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.boxShadow = '0 3px 0px #454FBF';
              }}
              onMouseLeave={(e) => { 
                if (e.buttons === 1) {
                    e.currentTarget.style.boxShadow = '0 3px 0px #454FBF';
                }
              }}
            >
              <SiDiscord className="h-5 w-5" /> {/* Added Discord Icon */}
              Community
            </Link>
          </nav>
        </div>
      </header>
      
      <main className="flex-1">
        {/* Hero Section - Reverted to Duolingo Image Left / Text Right Style */}
        <section className="w-full py-12 md:py-20 lg:py-28 flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] to-[#fafbfe] min-h-[calc(100vh-80px)]">
          <div className="container px-4 md:px-6 mx-auto max-w-6xl">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center">
              {/* Left Column: Image */}
              <div className="flex items-center justify-center">
                <ImagePlaceholder className="w-full max-w-md lg:max-w-lg" />
              </div>
              {/* Right Column: Text and Buttons */}
              <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-6">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-[#0B1423] [font-family:var(--font-mplus-rounded)]">
                  Develop a nation, develop yourself.
                </h1>
                {/* Vertical Button Layout */}
                <div className="flex flex-col gap-3 w-full max-w-xs mx-auto md:mx-0">
                  <Link
                    href="/signup"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-[#67b9e7] px-8 text-lg font-semibold text-white shadow-[0_4px_0_#4792ba] transition-all hover:bg-[#4792ba] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#4792ba] whitespace-nowrap border-2 border-[#4792ba]"
                    style={{ transform: 'translateY(-2px)' }}
                    prefetch={false}
                    onMouseDown={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 0px #4792ba';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 0px #4792ba';
                    }}
                    onMouseLeave={(e) => { 
                      if (e.buttons === 1) {
                          e.currentTarget.style.boxShadow = '0 4px 0px #4792ba';
                      }
                    }}
                  >
                    Sign Up Now
                  </Link>
                  <Link
                    href="/signin"
                    className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-[#cccccc] bg-white px-8 text-lg font-medium text-[#0B1423] shadow-[0_4px_0_#cccccc] transition-all hover:bg-gray-100 hover:text-[#0B1423] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#cccccc]"
                    prefetch={false}
                    style={{ transform: 'translateY(-2px)' }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.boxShadow = '0 2px 0px #cccccc';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 0px #cccccc';
                    }}
                    onMouseLeave={(e) => { 
                      if (e.buttons === 1) {
                          e.currentTarget.style.boxShadow = '0 4px 0px #cccccc';
                      }
                    }}
                  >
                    I Already Have an Account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Highlights Section - Alternating Layout, Simplified Text, Updated Styling */}
        <section className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200">
          <div className="container px-4 md:px-6 mx-auto max-w-5xl space-y-16 md:space-y-24">
            {/* Feature 1: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-[#0B1423]">Focus Timer Meets Strategy</h2>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Use structured work blocks to enhance <BoldHighlight>deep work</BoldHighlight>. Each session translates directly into <BoldHighlight>in-game resources</BoldHighlight> for your growing nation.
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
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-[#0B1423]">Build Your Legacy</h2>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Invest earned resources to develop industry, grow population, and raise armies. Your <BoldHighlight>strategic choices</BoldHighlight> shape your nation's destiny and provide <BoldHighlight>ongoing motivation</BoldHighlight>.
                </p>
              </div>
            </div>

            {/* Feature 3: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-[#0B1423]">Organize Your Efforts</h2>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Create tasks and assign <BoldHighlight>reward types</BoldHighlight> (Economy, Industry, etc.). Track history and see the direct impact of your <BoldHighlight>focused work</BoldHighlight>.
                </p>
              </div>
              <ImagePlaceholder />
            </div>
          </div>
        </section>

        {/* How It Works Section - Alternating Layout, Simplified Text, Updated Styling */}
        <section id="how-it-works" className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200 bg-gray-50">
          <div className="container px-4 md:px-6 mx-auto max-w-5xl space-y-12 md:space-y-16">
            <h2 className="text-3xl font-bold tracking-tighter text-center sm:text-4xl md:text-5xl text-[#0B1423]">How It Works</h2>

            {/* Step 1: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-3">
                <span className="text-5xl font-bold text-[#67b9e7]">1</span>
                <h3 className="text-2xl font-bold text-[#0B1423]">Set Your Task & Focus</h3>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Create a task, choose its <BoldHighlight>reward type</BoldHighlight> (Economy, Pop, etc.), and start the focus timer.
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
                <h3 className="text-2xl font-bold text-[#0B1423]">Complete & Earn Rewards</h3>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Finish your session. Complete the task to earn <BoldHighlight>Action Points</BoldHighlight> and resources.
                </p>
              </div>
            </div>

            {/* Step 3: Text Left, Image Right */}
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-3">
                <span className="text-5xl font-bold text-[#67b9e7]">3</span>
                <h3 className="text-2xl font-bold text-[#0B1423]">Develop Your Nation</h3>
                <p className="text-[rgb(119,119,119)] md:text-lg">
                  Use points and resources to <BoldHighlight>build structures</BoldHighlight>, raise armies, and grow your nation's power.
                </p>
              </div>
              <ImagePlaceholder />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200">
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
        <section className="w-full py-12 md:py-20 lg:py-28 border-t border-gray-200 bg-gray-50">
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

        {/* Final Call to Action Section - Adjusted Layout */}
        <section className="w-full py-16 md:py-24 lg:py-28 flex items-center justify-center bg-gradient-to-br from-[#e0f2fe] to-[#fafbfe]"> {/* Reduced padding */}
          <div className="container px-4 md:px-6 mx-auto max-w-5xl text-center flex flex-col items-center justify-center"> {/* Removed min-height */}
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-[#0B1423] mb-10"> {/* Increased margin-bottom */}
              Ready to Boost Your Productivity?
            </h2>
            <Link
              href="/signup"
              className="inline-flex h-14 items-center justify-center rounded-lg bg-[#67b9e7] px-10 text-xl font-semibold text-white shadow-[0_5px_0_#4792ba] transition-all hover:bg-[#4792ba] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:-translate-y-1 active:translate-y-0 active:shadow-[0_2px_0_#4792ba] whitespace-nowrap border-2 border-[#4792ba]"
              style={{ transform: 'translateY(-3px)' }}
              prefetch={false}
              onMouseDown={(e) => {
                e.currentTarget.style.boxShadow = '0 2px 0px #4792ba';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.boxShadow = '0 5px 0px #4792ba';
              }}
              onMouseLeave={(e) => { 
                if (e.buttons === 1) {
                    e.currentTarget.style.boxShadow = '0 5px 0px #4792ba';
                }
              }}
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
            &copy; {new Date().getFullYear()} LingoMine. All rights reserved.
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
