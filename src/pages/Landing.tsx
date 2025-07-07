import { useRouter } from 'next/navigation';

export default function Landing() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 [font-family:var(--font-mplus-rounded)]">
      {/* Navigation */}
      <div className="absolute top-5 right-5 flex gap-4">
        <button
          onClick={() => router.push('/signin')}
          className="text-sm font-semibold text-gray-600 hover:text-[#67b9e7] transition-colors"
        >
          Log In
        </button>
        <button
          onClick={() => router.push('/signup')}
          className="text-sm font-semibold text-[#67b9e7] hover:text-[#4792ba] transition-colors"
        >
          Sign Up
        </button>
      </div>

      {/* Hero Section */}
      <div className="max-w-4xl w-full space-y-12 text-center">
        <h1 className="text-5xl font-bold text-[#0B1423] mb-4">readfluent</h1>
        <p className="text-xl text-gray-600 mb-8">
          Your intelligent language learning companion. Read, learn, and track your progress with ease.
        </p>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-[#0B1423] mb-2">Smart Reading</h3>
            <p className="text-gray-600">Save and sync your ebooks across devices with intelligent word tracking</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-[#0B1423] mb-2">Word Mastery</h3>
            <p className="text-gray-600">Track your vocabulary progress with easy word lookups and flashcards</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-[#0B1423] mb-2">Comprehension Analysis</h3>
            <p className="text-gray-600">Get insights into your reading comprehension and progress</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-[#0B1423] mb-2">Anki Integration</h3>
            <p className="text-gray-600">Sync your vocabulary with Anki for spaced repetition learning</p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/signup')}
            className="px-8 py-3 bg-[#67b9e7] text-white rounded-lg shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#67b9e7] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#4792ba] transition-all"
          >
            Get Started
          </button>
          <button
            onClick={() => router.push('/signin')}
            className="px-8 py-3 border border-gray-300 text-[#0B1423] bg-white rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#67b9e7] transition-colors"
          >
            Sign In
          </button>
        </div>

        {/* Roadmap Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-[#0B1423] mb-6">Coming Soon</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <p className="text-gray-600">Full Mobile Experience</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <p className="text-gray-600">Local Dictionary Support</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-100">
              <p className="text-gray-600">Enhanced Flashcard System</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 