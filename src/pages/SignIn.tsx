import Link from 'next/link';

export default function SignIn() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      {/* Go Back Link */}
      <div className="absolute top-5 left-5">
        <Link href="/" className="text-sm font-semibold text-gray-600 hover:text-[#67b9e7] transition-colors">
          Go Back
        </Link>
      </div>

      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Sign In Page</h1>
        <p className="text-gray-600">Sign in functionality coming soon...</p>
      </div>
    </div>
  );
} 