'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Mail,
  User,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
  Clock,
  Sparkles,
  Key,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminSettingsPage() {
  const { user, updateUser, changePassword } = useAuth();

  // Profile Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPwd, setIsChangingPwd] = useState(false);
  const [pwdSuccessMsg, setPwdSuccessMsg] = useState('');
  const [pwdErrorMsg, setPwdErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  // Password requirements validation
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumberOrSymbol = /[\d\W]/.test(newPassword);
  const isNewPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumberOrSymbol;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Handle Profile & Email update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    try {
      const updatedUser = await apiClient.put('/users/me', {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
      });

      updateUser(updatedUser);
      setProfileSuccessMsg('Admin profile & email updated successfully! You can now use this email to log in.');
      setTimeout(() => setProfileSuccessMsg(''), 6000);
    } catch (err: any) {
      setProfileErrorMsg(err.message || 'Failed to update profile. Email might already be taken.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccessMsg('');
    setPwdErrorMsg('');

    if (!isNewPasswordValid) {
      setPwdErrorMsg('New password does not meet the security requirements.');
      return;
    }

    if (!passwordsMatch) {
      setPwdErrorMsg('New password and confirm password do not match.');
      return;
    }

    setIsChangingPwd(true);

    try {
      await changePassword(currentPassword, newPassword);
      setPwdSuccessMsg('Password changed successfully! Keep your new credentials safe.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPwdSuccessMsg(''), 6000);
    } catch (err: any) {
      setPwdErrorMsg(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  return (
    <div className="space-y-8 p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">
              Administration & Access Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
            Admin Profile & Security
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your administrator credentials, login email address, and authentication password.
          </p>
        </div>

        <Badge variant="default" className="w-fit gap-1.5 px-3 py-1 text-xs font-bold shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5" />
          Full Admin Privileges
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Forms */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. Admin Profile & Email Card */}
          <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Admin Credentials & Info</h2>
                <p className="text-xs text-muted-foreground">
                  Update your display name, contact number, and login email address.
                </p>
              </div>
            </div>

            {profileSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {profileErrorMsg && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{profileErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full h-10 px-3.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>

              {/* Login Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Admin Login Email</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    (Used to log into NovaStore Admin)
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full h-10 pl-10 pr-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium"
                  />
                  <Mail className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Contact Phone</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full h-10 pl-10 pr-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Phone className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={isSavingProfile} className="rounded-xl gap-2 font-bold px-6 shadow-sm">
                  <Save className="w-4 h-4" />
                  {isSavingProfile ? 'Saving Changes...' : 'Save Profile & Email'}
                </Button>
              </div>
            </form>
          </div>

          {/* 2. Change Password Card */}
          <div className="rounded-3xl border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 border-b pb-4">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-black">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Change Admin Password</h2>
                <p className="text-xs text-muted-foreground">
                  Update your admin password to protect your store database and dashboard.
                </p>
              </div>
            </div>

            {pwdSuccessMsg && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{pwdSuccessMsg}</span>
              </div>
            )}

            {pwdErrorMsg && (
              <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pwdErrorMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Current Password</label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="w-full h-10 pl-10 pr-10 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Key className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">New Password</label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Enter strong new password"
                    className="w-full h-10 pl-10 pr-10 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Confirm New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Repeat new password"
                    className="w-full h-10 pl-10 pr-4 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Lock className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Live Password Strength Checklist */}
              {newPassword.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-muted/40 border text-xs space-y-1.5 animate-in fade-in">
                  <p className="font-bold text-foreground mb-1">Security Checklist:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>At least 8 characters</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>One uppercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>One lowercase letter</span>
                    </div>
                    <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-emerald-600 font-semibold' : 'text-muted-foreground'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>One number or symbol</span>
                    </div>
                  </div>
                  {confirmPassword.length > 0 && (
                    <div className={`flex items-center gap-1.5 pt-1 border-t ${passwordsMatch ? 'text-emerald-600 font-semibold' : 'text-rose-500'}`}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>{passwordsMatch ? 'Passwords match' : 'Passwords do not match'}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={isChangingPwd || !isNewPasswordValid || !passwordsMatch}
                  className="rounded-xl gap-2 font-bold px-6 shadow-sm bg-indigo-600 hover:bg-indigo-500"
                >
                  <Lock className="w-4 h-4" />
                  {isChangingPwd ? 'Updating Password...' : 'Update Admin Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Security Overview & Privileges */}
        <div className="lg:col-span-4 space-y-6">
          {/* Admin Role Status Card */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-black">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Admin Account Status</h3>
                <p className="text-xs text-muted-foreground">Active & Fully Authorized</p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t pt-3">
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Account Role</span>
                <span className="font-bold text-primary">ADMIN (Root)</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Email Verified</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Session Status</span>
                <span className="font-bold text-foreground">Secure JWT Token</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground">Token Rotation</span>
                <span className="font-bold text-emerald-600">Active</span>
              </div>
            </div>
          </div>

          {/* Granted Administrative Capabilities */}
          <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Granted Capabilities
            </h3>
            <div className="space-y-2 text-xs">
              {[
                'Full Catalog & Inventory Control',
                'Orders Timeline & Courier Dispatch',
                'Returns & Quality Check Approval',
                'COD Cash Reconciliation & Settlement',
                'Coupons & Discount Engine Management',
                'Customer & Staff Role Assignment',
                'Real-Time Revenue & Profit Analytics',
              ].map((cap, idx) => (
                <div key={idx} className="flex items-start gap-2 text-foreground font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
