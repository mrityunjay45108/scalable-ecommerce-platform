'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  RotateCcw,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const { sendEmailOtp, verifyEmailOtp, signInWithGoogle } = useAuth();

  // Registration Form State
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');

  // OTP State
  const [stateId, setStateId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [totalTimer, setTotalTimer] = useState(300); // 5 minutes (300s)
  const [resendCooldown, setResendCooldown] = useState(60); // 60s
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Countdown Timers in OTP step
  useEffect(() => {
    if (step !== 'OTP') return;

    const interval = setInterval(() => {
      setTotalTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Step 1: Submit Email for OTP Dispatch
  const handleSubmitEmail = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await sendEmailOtp(email);
      setStateId(res.state_id);
      setTotalTimer(res.expiresIn || 300);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('OTP');
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to dispatch verification email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle 6-Digit OTP Inputs
  const handleDigitChange = (index: number, val: string) => {
    const cleanVal = val.replace(/\D/g, '');
    if (!cleanVal) {
      const updated = [...otpDigits];
      updated[index] = '';
      setOtpDigits(updated);
      return;
    }

    const digit = cleanVal.slice(-1);
    const updated = [...otpDigits];
    updated[index] = digit;
    setOtpDigits(updated);

    // Auto advance focus to next input
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const updated = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      updated[i] = pasted[i] || '';
    }
    setOtpDigits(updated);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  // Step 3: Verify Email OTP & Complete Registration
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otpDigits.join('');

    if (otpCode.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification code sent to your email.');
      return;
    }

    if (totalTimer <= 0) {
      setErrorMsg('This code has expired. Please click "Resend Code" to get a fresh code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      await verifyEmailOtp({
        email,
        otp: otpCode,
        state_id: stateId,
      });

      router.push('/');
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Invalid or expired verification code. Please check your email and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Email OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMsg('');

    try {
      const res = await sendEmailOtp(email);
      setStateId(res.state_id);
      setTotalTimer(res.expiresIn || 300);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Failed to resend code. Please wait a moment and retry.');
    } finally {
      setIsResending(false);
    }
  };

  // Google Firebase OAuth
  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-in was cancelled or failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Formatter for timer mm:ss
  const formatSeconds = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="max-w-md w-full rounded-3xl border bg-card p-8 shadow-xl space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-2xl tracking-tight text-foreground justify-center">
            <span className="h-9 w-9 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-600 to-rose-600 text-white flex items-center justify-center font-black text-lg shadow-md border border-white/20">
              🇮🇳
            </span>
            <span className="font-black text-2xl tracking-tight">
              SWADESH<span className="text-amber-500 text-xs ml-1 font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30">Luxe</span>
            </span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight">
            {step === 'FORM' ? 'Create Your Account' : 'Verify Your Email'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {step === 'FORM'
              ? 'Passwordless access with secure 6-digit Email OTP'
              : `We sent a 6-digit verification code to ${email}`}
          </p>
        </div>

        {/* Global Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: REGISTRATION / EMAIL INPUT FORM */}
        {/* ========================================================================= */}
        {step === 'FORM' && (
          <div className="space-y-4">
            {/* Google OAuth Button */}
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
              {isGoogleLoading ? 'Connecting Google...' : 'Continue with Google'}
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="border-t w-full border-muted" />
              <span className="bg-card px-3 text-[10px] uppercase font-bold text-muted-foreground absolute tracking-wider">
                Or continue with Email
              </span>
            </div>

            <form onSubmit={handleSubmitEmail} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">First Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-background border rounded-xl px-3.5 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-background border rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-background border rounded-xl px-3.5 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2.5 text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  No password needed! We will send a secure 6-digit verification code directly to your email inbox.
                </span>
              </div>

              <Button
                type="submit"
                size="lg"
                disabled={isLoading}
                className="w-full rounded-xl font-bold shadow-md flex items-center justify-center gap-2 h-11 text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                {isLoading ? 'Sending Verification Code...' : 'Get Verification Code'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: 6-DIGIT EMAIL OTP VERIFICATION */}
        {/* ========================================================================= */}
        {step === 'OTP' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            
            {/* Info Box */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-1.5">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-1">
                <Mail className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-foreground">
                OTP sent to <span className="font-bold text-amber-600">{email}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">
                Please check your inbox (and spam folder) for the 6-digit code.
              </p>
            </div>

            {/* 6-Digit Individual Input Cells */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground block text-center">
                Enter 6-Digit Code
              </label>
              <div className="flex items-center justify-center gap-2.5">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-12 h-14 text-center text-xl font-bold bg-background border-2 rounded-2xl focus:border-amber-500 focus:ring-4 focus:ring-amber-500/20 focus:outline-none transition-all shadow-sm"
                  />
                ))}
              </div>
            </div>

            {/* Timer & Resend Controls */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Expires in: </span>
                <span className={`font-mono font-bold ${totalTimer < 60 ? 'text-destructive' : 'text-foreground'}`}>
                  {formatSeconds(totalTimer)}
                </span>
              </div>

              <div>
                {resendCooldown > 0 ? (
                  <span className="text-muted-foreground">
                    Resend in <span className="font-mono font-semibold">{resendCooldown}s</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                    {isResending ? 'Sending...' : 'Resend Code'}
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <Button
                type="submit"
                size="lg"
                disabled={isLoading || otpDigits.join('').length < 6}
                className="w-full rounded-xl font-bold shadow-md flex items-center justify-center gap-2 h-11 text-sm bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                {isLoading ? 'Verifying...' : 'Verify & Continue'}
                <CheckCircle2 className="w-4 h-4" />
              </Button>

              <button
                type="button"
                onClick={() => setStep('FORM')}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-2 flex items-center justify-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change email address
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="text-center pt-2 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-amber-600 font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
