'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callback') || searchParams.get('redirect') || '/';

  const { login, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const loggedInUser = await login(email, password);
      if (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'STAFF') {
        router.push(callbackUrl === '/' ? '/admin/dashboard' : callbackUrl);
      } else {
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      const loggedInUser = await signInWithGoogle();
      if (loggedInUser.role === 'ADMIN' || loggedInUser.role === 'STAFF') {
        router.push(callbackUrl === '/' ? '/admin/dashboard' : callbackUrl);
      } else {
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="max-w-md w-full rounded-3xl border bg-card p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-2xl tracking-tight text-foreground justify-center">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-center font-black text-lg shadow-md border border-white/20">
              🇮🇳
            </span>
            <span className="font-black text-2xl tracking-tight">
              SWADESH<span className="text-amber-500 text-xs ml-1 font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">Luxe</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">Welcome Back</h2>
          <p className="text-xs text-muted-foreground">Sign in to manage catalog, orders, wishlist, and profile</p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Google Firebase Auth Button */}
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleGoogleSignIn}
          disabled={isGoogleLoading || isLoading}
          className="w-full rounded-xl font-bold shadow-sm flex items-center justify-center gap-2.5 h-11"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}</span>
        </Button>

        {/* Passwordless Email OTP Option */}
        <Link
          href="/register"
          className="w-full h-11 rounded-xl font-bold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center gap-2 text-xs sm:text-sm transition-all shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-amber-600" />
          <span>Sign in with Email OTP (Passwordless)</span>
        </Link>

        <div className="relative flex items-center justify-center">
          <div className="border-t w-full border-muted" />
          <span className="bg-card px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider relative">
            Or with email
          </span>
          <div className="border-t w-full border-muted" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold block">Email</label>
            <div className="relative">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary"
              />
              <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold block">Password</label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                required
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
            </div>
          </div>

          <Button type="submit" size="lg" disabled={isLoading} className="w-full rounded-xl font-bold shadow-md bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white">
            {isLoading ? 'Signing In...' : 'Sign In'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </form>

        <div className="p-4 rounded-2xl bg-muted/40 text-[11px] text-muted-foreground space-y-3 border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>Demo Test Credentials:</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-semibold">1-Click Auto Fill</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('admin@novastore.com');
                setPassword('Password123!');
              }}
              className="p-2.5 rounded-xl border bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 font-bold text-left transition-all space-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black">🔑 Admin / Manager</span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Fill &rarr;</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">admin@novastore.com</p>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail('customer@novastore.com');
                setPassword('Password123!');
              }}
              className="p-2.5 rounded-xl border bg-card hover:bg-muted font-bold text-left transition-all space-y-0.5 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-foreground">👤 Customer / Buyer</span>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">Fill &rarr;</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">customer@novastore.com</p>
            </button>
          </div>
          <p className="text-[10px] text-center text-muted-foreground">Default password: <span className="font-mono font-bold text-foreground">Password123!</span></p>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-2 border-t">
          Don't have an account yet?{' '}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading login...</div>}>
      <LoginContent />
    </Suspense>
  );
}
