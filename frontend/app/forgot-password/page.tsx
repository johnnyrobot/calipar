'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Button, Input, Spinner } from '@/components/ui';
import { auth, isFirebaseConfigured } from '@/lib/firebase';

// Inner component that uses useSearchParams
function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pre-fill email from query params (if redirected from login)
  const prefillEmail = searchParams.get('email');

  useEffect(() => {
    if (prefillEmail) {
      setEmail(decodeURIComponent(prefillEmail));
    }
  }, [prefillEmail]);

  const isFirebaseEnabled = isFirebaseConfigured();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email address.');
      setIsLoading(false);
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    try {
      if (!isFirebaseEnabled) {
        // Development mode - simulate success
        await new Promise(resolve => setTimeout(resolve, 1000));
        setSuccess(true);
        return;
      }

      // Send password reset email via Firebase
      await sendPasswordResetEmail(auth, email, {
        // URL to redirect to after password reset
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      const errorMessage = getFirebaseErrorMessage(err.code);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToLogin = () => {
    router.push('/login');
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-lamc-light to-white flex flex-col">
        {/* Header */}
        <header className="bg-lamc-blue text-white py-4">
          <div className="max-w-7xl mx-auto px-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lamc-gold rounded-lg flex items-center justify-center">
                <span className="text-lamc-blue font-bold text-xl">L</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">CALIPAR</h1>
                <p className="text-xs text-blue-200">California Community College</p>
              </div>
            </Link>
          </div>
        </header>

        {/* Success Message */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="bg-white rounded-xl shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Check Your Email
              </h2>

              <p className="text-gray-600 mb-6">
                We've sent a password reset link to{' '}
                <span className="font-medium text-gray-900">{email}</span>.
                Please check your inbox and follow the instructions to reset your password.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-blue-800">
                  <strong>Didn't receive the email?</strong>
                </p>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Check your spam or junk folder</li>
                  <li>• Make sure you entered the correct email</li>
                  <li>• Wait a few minutes and try again</li>
                </ul>
              </div>

              <Button onClick={handleBackToLogin} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-lamc-light to-white flex flex-col">
      {/* Header */}
      <header className="bg-lamc-blue text-white py-4">
        <div className="max-w-7xl mx-auto px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-lamc-gold rounded-lg flex items-center justify-center">
              <span className="text-lamc-blue font-bold text-xl">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">CALIPAR</h1>
              <p className="text-xs text-blue-200">California Community College</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Reset Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Back Link */}
            <Link
              href="/login"
              className="inline-flex items-center text-sm text-gray-500 hover:text-lamc-blue mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>

            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-lamc-light rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-lamc-blue" />
              </div>
              <h2 className="text-2xl font-bold text-lamc-blue">
                Forgot Password?
              </h2>
              <p className="text-gray-600 mt-2">
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            {/* Development Mode Notice */}
            {!isFirebaseEnabled && (
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Development Mode:</strong> Firebase is not configured.
                  Password reset emails will be simulated.
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@ccc.edu"
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send Reset Link
                  </>
                )}
              </Button>
            </form>

            {/* Additional Help */}
            <p className="text-center text-sm text-gray-500 mt-6">
              Remember your password?{' '}
              <Link href="/login" className="text-lamc-blue hover:underline">
                Sign In
              </Link>
            </p>
          </div>

          {/* Footer Link */}
          <p className="text-center text-sm text-gray-500 mt-6">
            Need help?{' '}
            <a
              href="mailto:support@ccc.edu"
              className="text-lamc-blue hover:underline"
            >
              Contact Support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-not-found':
      return 'No account found with this email address. Please check and try again.';
    case 'auth/too-many-requests':
      return 'Too many password reset attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/missing-email':
      return 'Please enter your email address.';
    default:
      return 'Failed to send password reset email. Please try again.';
  }
}

// Loading fallback for Suspense boundary
function ForgotPasswordLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-lamc-light to-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordLoading />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
