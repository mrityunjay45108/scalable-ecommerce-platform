'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  Phone,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  MessageSquare,
  Clock,
  RotateCcw,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';

export default function RegisterPage() {
  const router = useRouter();
  const { register, verifyWhatsAppOtp, resendWhatsAppOtp, signInWithGoogle } = useAuth();

  // Registration Form State
  const [step, setStep] = useState<'FORM' | 'OTP'>('FORM');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // OTP State
  const [verificationId, setVerificationId] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [totalTimer, setTotalTimer] = useState(300); // 5 minutes (300s)
  const [resendCooldown, setResendCooldown] = useState(60); // 60s
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // UI States
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const isPasswordValid =
    password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password);

  // Timers when in OTP step
  useEffect(() => {
    if (step !== 'OTP') return;

    const interval = setInterval(() => {
      setTotalTimer((prev) => (prev > 0 ? prev - 1 : 0));
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [step]);

  // Step 1: Submit Registration Form
  const handleSubmitRegistration = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPasswordValid) {
      setErrorMsg('Password must be at least 8 characters and include uppercase, lowercase, and numbers.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (!phone || phone.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const fullPhone = `+91${phone}`;
      const res = await register({
        firstName,
        lastName,
        email,
        phone: fullPhone,
        password,
      });

      setVerificationId(res.verificationId);
      setMaskedPhone(res.phone || `+91 ${phone.slice(0, 2)}*** ***${phone.slice(-2)}`);
      setTotalTimer(res.expiresIn || 300);
      setResendCooldown(res.resendAfter || 60);
      setOtpDigits(['', '', '', '', '', '']);
      setStep('OTP');
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please check inputs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Handle OTP Digit Inputs & Auto-advance
  const handleOtpChange = (index: number, value: string) => {
    // Handle paste of full 6 digits
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newDigits = [...otpDigits];
      cleanDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d;
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(cleanDigits.length, 5);
      inputRefs.current[nextFocus]?.focus();
      return;
    }

    const singleDigit = value.replace(/\D/g, '');
    const newDigits = [...otpDigits];
    newDigits[index] = singleDigit;
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Submit OTP Verification
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const otp = otpDigits.join('');

    if (otp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    if (totalTimer <= 0) {
      setErrorMsg('Verification code has expired. Please click Resend Code below.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const fullPhone = `+91${phone}`;
      await verifyWhatsAppOtp({
        verificationId,
        phone: fullPhone,
        otp,
      });
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setErrorMsg('');

    try {
      const fullPhone = `+91${phone}`;
      const res = await resendWhatsAppOtp({
        verificationId,
        phone: fullPhone,
      });

      setVerificationId(res.verificationId);
      setResendCooldown(res.resendAfter || 60);
      setTotalTimer(res.expiresIn || 300);
      setOtpDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
      router.push('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Google sign-up was cancelled or failed.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/20">
      <div className="max-w-md w-full rounded-3xl border bg-card p-6 sm:p-8 shadow-xl space-y-5 sm:space-y-6">
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
            {step === 'FORM' ? 'Create Account' : 'Verify WhatsApp OTP'}
          </h2>
          <p className="text-xs text-muted-foreground">
            {step === 'FORM'
              ? 'Join SWADESH Luxe for express checkout, order tracking, and rewards • ॥ अतिथिदेवो भवः ॥'
              : `We sent a 6-digit authentication code to ${maskedPhone} via WhatsApp`}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {step === 'FORM' ? (
          <>
            {/* Google Firebase Auth Button */}
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleGoogleSignUp}
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
              <span>{isGoogleLoading ? 'Connecting Google...' : 'Sign up with Google'}</span>
            </Button>

            <div className="relative flex items-center justify-center">
              <div className="border-t w-full border-muted" />
              <span className="bg-card px-3 text-[11px] font-medium text-muted-foreground uppercase tracking-wider relative">
                Or register with WhatsApp & password
              </span>
              <div className="border-t w-full border-muted" />
            </div>

            <form onSubmit={handleSubmitRegistration} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">First Name</label>
                  <input
                    required
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Last Name</label>
                  <input
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-10 px-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold block">Email Address</label>
                <div className="relative">
                  <input
                    required
                    type="email"
                    placeholder="jane@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold block text-foreground flex items-center justify-between">
                  <span>WhatsApp Mobile Number (व्हाट्सएप मोबाइल नंबर)</span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> OTP via WhatsApp
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-xs font-bold text-muted-foreground flex items-center gap-1 pointer-events-none">
                    🇮🇳 +91
                  </span>
                  <input
                    required
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    maxLength={10}
                    placeholder="10-digit mobile (उदा. 9876543210)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full h-10 pl-16 pr-3 text-xs rounded-xl border bg-background font-mono focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Password</label>
                  <div className="relative">
                    <input
                      required
                      type="password"
                      minLength={8}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary"
                    />
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold block">Confirm Password</label>
                  <div className="relative">
                    <input
                      required
                      type="password"
                      minLength={8}
                      placeholder="Confirm password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-xs rounded-xl border bg-background focus:ring-1 focus:ring-primary"
                    />
                    <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              <div className="pt-1 text-[11px] text-muted-foreground space-y-0.5">
                <div className={`flex items-center gap-1.5 ${password.length >= 8 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>At least 8 characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${/[A-Z]/.test(password) && /[0-9]/.test(password) ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Contains uppercase & numbers</span>
                </div>
                {confirmPassword && (
                  <div className={`flex items-center gap-1.5 ${password === confirmPassword ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Passwords match</span>
                  </div>
                )}
              </div>

              <Button type="submit" size="lg" disabled={isLoading} className="w-full rounded-xl font-bold shadow-md">
                {isLoading ? 'Sending WhatsApp OTP...' : 'Send WhatsApp OTP'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground pt-2 border-t">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Sign In
              </Link>
            </div>
          </>
        ) : (
          /* Step 2: WhatsApp OTP Verification */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>We've dispatched an official WhatsApp message with your 6-digit code.</span>
            </div>

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-between gap-2 sm:gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  autoFocus={idx === 0}
                  className="w-12 h-13 sm:w-13 sm:h-14 text-center text-xl font-bold rounded-2xl border bg-background focus:ring-2 focus:ring-primary focus:border-primary shadow-sm"
                />
              ))}
            </div>

            {/* Countdown Timers */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Valid for: <span className="font-mono font-bold text-foreground">{formatTimer(totalTimer)}</span>
              </span>

              {resendCooldown > 0 ? (
                <span className="text-[11px] font-mono">
                  Resend in <span className="font-bold">{resendCooldown}s</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="font-semibold text-primary hover:underline flex items-center gap-1 text-xs"
                >
                  <RotateCcw className="w-3 h-3" />
                  {isResending ? 'Resending...' : 'Resend Code'}
                </button>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={isLoading || otpDigits.join('').length !== 6 || totalTimer <= 0}
              className="w-full rounded-xl font-bold shadow-md h-11"
            >
              {isLoading ? 'Verifying Code...' : 'Verify & Complete Account'}
              <ShieldCheck className="w-4 h-4 ml-2" />
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('FORM');
                  setErrorMsg('');
                }}
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change phone number or edit details
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
