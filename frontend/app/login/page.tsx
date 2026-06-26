'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { Button, Input, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';

// Inner component that uses useSearchParams
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    signIn,
    devSignIn,
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    clearError,
    isFirebaseEnabled
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get return URL from query params (set by ProtectedRoute)
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  // Demo accounts for development
  const demoAccounts = [
    { role: 'Faculty', email: 'faculty@ccc.edu', uid: 'demo-faculty-001' },
    { role: 'Chair', email: 'chair@ccc.edu', uid: 'demo-chair-001' },
    { role: 'Dean', email: 'dean@ccc.edu', uid: 'demo-dean-001' },
    { role: 'Admin', email: 'admin@ccc.edu', uid: 'demo-admin-001' },
  ];

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      router.replace(decodeURIComponent(returnUrl));
    }
  }, [isAuthenticated, authLoading, router, returnUrl]);

  // Sync auth context error with local error state
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    clearError();
    setIsLoading(true);

    try {
      if (isFirebaseEnabled) {
        // Use Firebase authentication
        await signIn(email, password);
      } else {
        // Development mode - find demo account by email
        const demoAccount = demoAccounts.find(acc => acc.email === email);
        if (demoAccount) {
          await devSignIn(demoAccount.uid);
        } else {
          // Try with email as identifier
          await devSignIn(email);
        }
      }
      // Redirect will happen via useEffect when isAuthenticated changes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sign in. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (uid: string) => {
    setError('');
    clearError();
    setIsLoading(true);

    try {
      await devSignIn(uid);
      // Redirect will happen via useEffect when isAuthenticated changes
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up demo account. Please ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-primary-bg to-white flex flex-col">
      {/* Header */}
      <header className="bg-brand-ink text-white py-4">
        <div className="max-w-7xl mx-auto px-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-accent rounded-lg flex items-center justify-center">
              <span className="text-brand-ink font-bold text-xl">L</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">CALIPAR</h1>
              <p className="text-xs text-brand-on-ink-muted">Educational Institution</p>
            </div>
          </Link>
        </div>
      </header>

      {/* Login Form */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-surface rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold font-display tracking-tight text-brand-ink">Welcome Back</h2>
              <p className="text-brand-muted mt-2">Sign in to continue to CALIPAR</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-[#FBEAEA] border border-destructive rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-brand-text mb-1">
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
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-brand-text">
                    Password
                  </label>
                  <Link
                    href={email ? `/forgot-password?email=${encodeURIComponent(email)}` : '/forgot-password'}
                    className="text-sm text-brand-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-ink"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <LogIn className="w-4 h-4 mr-2" />
                )}
                Sign In
              </Button>
            </form>

            {/* Demo Accounts Section */}
            <div className="mt-8 pt-6 border-t border-brand-line">
              <p className="text-sm text-brand-muted text-center mb-4">
                Development Mode - Quick Login
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((account) => (
                  <button
                    key={account.uid}
                    onClick={() => handleDemoLogin(account.uid)}
                    disabled={isLoading}
                    className="px-3 py-2 text-sm border border-brand-line rounded-lg hover:bg-brand-primary-bg hover:border-brand-primary transition-colors disabled:opacity-50"
                  >
                    {account.role}
                  </button>
                ))}
              </div>
              <p className="text-xs text-brand-muted text-center mt-3">
                Click a role to log in as a demo user
              </p>
            </div>
          </div>

          {/* Footer Link */}
          <p className="text-center text-sm text-brand-muted mt-6">
            Need help?{' '}
            <a href="mailto:support@ccc.edu" className="text-brand-primary hover:underline">
              Contact Support
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

// Loading fallback for Suspense boundary
function LoginLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-primary-bg to-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-brand-muted">Loading...</p>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
