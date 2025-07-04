'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';
import { FcGoogle } from "react-icons/fc"; // Google Icon

// --- (Keep existing error handling: getErrorMessage) ---
const getErrorMessage = (error: FirebaseError) => {
  const commonMessages: Record<string, { message: string; action?: string }> = {
    'auth/invalid-credential': {
      message: 'Invalid email or password.',
      action: 'Please try again or create a new account.'
    },
    'auth/user-not-found': {
      message: 'No account found with this email.',
      action: 'Would you like to create a new account?'
    },
    'auth/wrong-password': {
      message: 'Incorrect password.',
      action: 'Please try again or reset your password.'
    },
    'auth/email-already-in-use': {
      message: 'An account already exists with this email.',
      action: 'Please sign in instead.'
    },
    'auth/weak-password': {
      message: 'Password should be at least 6 characters long.',
      action: 'Please choose a stronger password.'
    },
    'auth/invalid-email': {
      message: 'Please enter a valid email address.',
    },
    'auth/network-request-failed': {
      message: 'Network error.',
      action: 'Please check your internet connection and try again.'
    },
    'auth/too-many-requests': {
      message: 'Too many failed attempts.',
      action: 'Please try again later or reset your password.'
    },
  };
  const errorInfo = commonMessages[error.code] || {
    message: 'An error occurred.',
    action: 'Please try again.'
  };
  return errorInfo;
};
// --------------------------------------------------------

export default function SignUpPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });

  useEffect(() => {
    if (user) {
      router.push('/library');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.displayName) {
      setError({ message: 'Please enter a display name.' });
      return;
    }
    if (form.password.length < 6) {
      setError({
        message: 'Password is too short.',
        action: 'Password must be at least 6 characters long.'
      });
      return;
    }
    setLoading(true);
    try {
      await signUp(form.email, form.password, form.displayName);
      router.push('/library'); // Redirect after successful signup
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err));
      } else if (err instanceof Error) {
        setError({ message: err.message });
      } else {
        setError({ message: 'An unexpected error occurred during sign up.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
      router.push('/library');
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err));
      } else {
        setError({ message: 'An error occurred during Google sign-in.' });
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  if (user) {
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="text-gray-700 text-xl">Redirecting...</div></div>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7f8fa', fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      {/* Go Back Button */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-[#2563eb] transition-colors shadow-sm">
          ← Go Back
        </Link>
      </div>

      {/* Corner Link to Sign In */}
      <div className="absolute top-6 right-6">
        <Link href="/signin" className="text-sm font-semibold text-gray-600 hover:text-[#2563eb] transition-colors">
          Log In
        </Link>
      </div>

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-[#232946] tracking-tight" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>
              Create your profile
            </h1>
            <div style={{ height: 4, width: 48, background: '#2563eb', borderRadius: 2, margin: '16px auto 0' }} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Display Name Input */}
              <div>
                <label htmlFor="displayName" className="block text-sm font-semibold text-[#232946] mb-2">
                  Name
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-200 bg-white text-[#232946] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] text-sm transition-colors"
                  placeholder="Enter your name"
                />
              </div>

              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-[#232946] mb-2">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-200 bg-white text-[#232946] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] text-sm transition-colors"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#232946] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-200 bg-white text-[#232946] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] text-sm transition-colors"
                  placeholder="Minimum 6 characters"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <p className="font-medium">{error.message}</p>
                  {error.action && <p className="mt-1 text-red-600">{error.action}</p>}
                </div>
              )}

              {/* Create Account Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#2563eb] hover:bg-[#1749b1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563eb] transition-colors shadow-sm ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'Creating account...' : 'Create Account'}
                </button>
              </div>
            </form>

            {/* OR Separator */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500 font-medium">OR</span>
              </div>
            </div>

            {/* Google Sign In Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loadingGoogle}
                className={`w-full flex items-center justify-center py-3 px-4 border border-gray-200 text-base font-semibold rounded-lg text-[#232946] bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563eb] transition-colors shadow-sm ${
                  loadingGoogle ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <FcGoogle className="h-5 w-5 mr-3" />
                {loadingGoogle ? 'Redirecting...' : 'Continue with Google'}
              </button>
            </div>
          </div>

          {/* Terms Text */}
          <div className="text-center text-xs text-gray-500">
            By signing up for readfluent, you agree to our <Link href="/terms" className="font-medium hover:underline text-[#2563eb]">Terms</Link> and <Link href="/privacy" className="font-medium hover:underline text-[#2563eb]">Privacy Policy</Link>.
          </div>
        </div>
      </div>
    </div>
  );
} 