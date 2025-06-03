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
      router.push('/library');
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 [font-family:var(--font-mplus-rounded)]">
      {/* Go Back Button */}
      <div className="absolute top-5 left-5">
        <Link href="/" className="inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:text-[#67b9e7] transition-colors">
          ← Go Back
        </Link>
      </div>

      {/* Corner Link to Sign Up */}
      <div className="absolute top-5 right-5">
        <Link href="/signup" className="text-sm font-semibold text-gray-600 hover:text-[#67b9e7] transition-colors">
          Sign Up
        </Link>
      </div>

      <div className="max-w-sm w-full space-y-6">
        <h2 className="text-center text-3xl font-bold text-[#0B1423]">Log in</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 bg-white text-[#0B1423] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#67b9e7] focus:border-[#67b9e7] sm:text-sm"
              placeholder="Email address"
            />
          </div>

          <div className="relative">
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="appearance-none rounded-lg relative block w-full px-4 py-3 border border-gray-300 bg-white text-[#0B1423] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#67b9e7] focus:border-[#67b9e7] sm:text-sm pr-16" // Added padding for forgot link
              placeholder="Password"
            />
            <button type="button" className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-[#67b9e7] hover:text-[#4792ba]">
              FORGOT?
            </button>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded-md text-sm">
              <p>{error.message}</p>
              {error.action && <p className="mt-1">{error.action}</p>}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent text-base font-semibold rounded-lg text-white bg-[#67b9e7] shadow-[0_4px_0_#4792ba] hover:bg-[#4792ba] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#67b9e7] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_2px_0_#4792ba] transition-all ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </div>
        </form>

        {/* OR Separator */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-gray-50 text-gray-500">OR</span>
          </div>
        </div>

        {/* Google Sign In Button */}
        <div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loadingGoogle}
            className={`w-full flex items-center justify-center py-3 px-4 border border-gray-300 text-base font-semibold rounded-lg text-[#0B1423] bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#67b9e7] transition-colors duration-150 ${
              loadingGoogle ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FcGoogle className="h-5 w-5 mr-2" />
            {loadingGoogle ? 'Redirecting...' : 'Log In with Google'}
          </button>
        </div>

        {/* Terms Text */}
        <div className="text-center text-xs text-gray-500 mt-6">
          By signing in to readfluent, you agree to our <Link href="/terms" className="font-medium hover:underline">Terms</Link> and <Link href="/privacy" className="font-medium hover:underline">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
} 