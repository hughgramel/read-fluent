'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { FirebaseError } from 'firebase/app';
import Link from 'next/link';
import { FcGoogle } from "react-icons/fc"; // Google Icon

type AuthMode = 'signin' | 'signup';

interface AuthForm {
  email: string;
  password: string;
  displayName?: string;
}

// Firebase error code to user-friendly message mapping with action guidance
const getErrorMessage = (error: FirebaseError, mode: AuthMode) => {
  const commonMessages: Record<string, { message: string; action?: string }> = {
    'auth/invalid-credential': {
      message: 'Invalid email or password.',
      action: mode === 'signin' ? 'Please try again or create a new account.' : undefined
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

export default function SignInPage() {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<{ message: string; action?: string } | null>(null);
  const [form, setForm] = useState<AuthForm>({
    email: '',
    password: '',
    displayName: '',
  });

  // Redirect to library if already authenticated
  useEffect(() => {
    if (user) {
      router.push('/library');
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signIn(form.email, form.password);
      } else {
        if (!form.displayName) {
          throw new Error('Please enter a display name');
        }
        if (form.password.length < 6) {
          setError({
            message: 'Password is too short.',
            action: 'Password must be at least 6 characters long.'
          });
          return;
        }
        await signUp(form.email, form.password, form.displayName);
      }
      router.push('/library');
    } catch (err) {
      console.error('Authentication error:', err);
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err, mode));
      } else if (err instanceof Error) {
        setError({ message: err.message });
      } else {
        setError({ 
          message: 'An unexpected error occurred',
          action: 'Please try again or contact support.'
        });
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
      window.location.reload(); // Force reload to pick up new auth state and trigger layout redirect
    } catch (err) {
      console.error('Google sign-in error:', err);
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err, mode));
      } else {
        setError({ 
          message: 'An error occurred during Google sign-in',
          action: 'Please try again or use email sign-in.'
        });
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  // If user is already authenticated, show loading state
  if (user) {
    return <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-gray-700 text-xl">Redirecting...</div>
    </div>;
  }

  return (
    <div className="min-h-screen" style={{ background: '#f7f8fa', fontFamily: 'Noto Sans, Helvetica Neue, Arial, Helvetica, Geneva, sans-serif' }}>
      {/* Go Back Button */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-[#2563eb] transition-colors shadow-sm">
          ← Go Back
        </Link>
      </div>

      {/* Corner Link to Sign Up */}
      <div className="absolute top-6 right-6">
        <Link href="/signup" className="text-sm font-semibold text-gray-600 hover:text-[#2563eb] transition-colors">
          Sign Up
        </Link>
      </div>

      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-extrabold text-[#232946] tracking-tight" style={{ letterSpacing: '-0.01em', fontWeight: 800, lineHeight: 1.1 }}>
              {mode === 'signin' ? 'Log in' : 'Create account'}
            </h1>
            <div style={{ height: 4, width: 48, background: '#2563eb', borderRadius: 2, margin: '16px auto 0' }} />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {mode === 'signup' && (
                <div>
                  <label htmlFor="displayName" className="block text-sm font-semibold text-[#232946] mb-2">
                    Name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    required={mode === 'signup'}
                    value={form.displayName || ''}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-200 bg-white text-[#232946] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] text-sm transition-colors"
                    placeholder="Enter your name"
                  />
                </div>
              )}

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

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-[#232946] mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-200 bg-white text-[#232946] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] text-sm transition-colors"
                  placeholder={mode === 'signin' ? 'Enter your password' : 'Minimum 6 characters'}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <p className="font-medium">{error.message}</p>
                  {error.action && <p className="mt-1 text-red-600">{error.action}</p>}
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#2563eb] hover:bg-[#1749b1] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2563eb] transition-colors shadow-sm ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (mode === 'signin' ? 'Logging in...' : 'Creating account...') : (mode === 'signin' ? 'Log In' : 'Create Account')}
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
                {loadingGoogle ? 'Redirecting...' : `${mode === 'signin' ? 'Log In' : 'Sign Up'} with Google`}
              </button>
            </div>

            {/* Mode Toggle */}
            <div className="text-center mt-6">
              <button
                type="button"
                onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                className="text-sm font-semibold text-[#2563eb] hover:underline transition-colors"
              >
                {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
              </button>
            </div>
          </div>

          {/* Terms Text */}
          <div className="text-center text-xs text-gray-500">
            By signing in to readfluent, you agree to our <Link href="/terms" className="font-medium hover:underline text-[#2563eb]">Terms</Link> and <Link href="/privacy" className="font-medium hover:underline text-[#2563eb]">Privacy Policy</Link>.
          </div>
        </div>
      </div>
    </div>
  );
} 