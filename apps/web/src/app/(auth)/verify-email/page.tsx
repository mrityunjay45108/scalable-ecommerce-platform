'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing email verification token.');
      return;
    }

    const runVerify = async () => {
      try {
        const res = await verifyEmail(token);
        setStatus('success');
        setMessage(res.message || 'Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Invalid or expired verification link.');
      }
    };

    runVerify();
  }, [token, verifyEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="max-w-md w-full rounded-3xl border bg-card p-6 sm:p-8 shadow-xl space-y-5 sm:space-y-6 text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-2xl tracking-tight text-foreground justify-center">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-center font-black text-lg shadow-md border border-white/20">
              🇮🇳
            </span>
            <span className="font-black text-2xl tracking-tight">
              SWADESH<span className="text-amber-500 text-xs ml-1 font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">Luxe</span>
            </span>
          </Link>

        {status === 'loading' && (
          <div className="space-y-3 py-6">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-sm font-medium text-muted-foreground">Verifying your email address...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Email Verified!</h2>
              <p className="text-xs text-muted-foreground">{message}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md hover:bg-primary/90"
            >
              <span>Continue to Login</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4 py-4">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-destructive">Verification Failed</h2>
              <p className="text-xs text-muted-foreground">{message}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80"
            >
              <span>Back to Login</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Verifying...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
