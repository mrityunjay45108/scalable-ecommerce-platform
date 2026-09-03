'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, MapPin, Plus, Trash2, CheckCircle2, Lock, ShieldCheck, AlertCircle, Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { AddressDto } from '@ecommerce/types';
import { Button } from '@/components/ui/button';

export default function AccountPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading, updateUser, changePassword } = useAuth();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Password change state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [isChangingPwd, setIsChangingPwd] = useState(false);

  // Notification preferences
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [orderNotifs, setOrderNotifs] = useState(true);
  const [promoNotifs, setPromoNotifs] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefSuccess, setPrefSuccess] = useState('');

  // New Address state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPostalCode, setNewPostalCode] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?callback=/account');
      return;
    }

    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
    }

    const loadUserData = async () => {
      try {
        const [addrData, prefData] = await Promise.all([
          apiClient.get('/users/me/addresses'),
          apiClient.get('/notifications/preferences'),
        ]);
        setAddresses(addrData);
        if (prefData) {
          setEmailNotifs(prefData.email ?? true);
          setOrderNotifs(prefData.orderUpdates ?? true);
          setPromoNotifs(prefData.promotions ?? false);
        }
      } catch (err) {
        console.error(err);
      }
    };

    if (isAuthenticated) {
      loadUserData();
    }
  }, [isAuthenticated, authLoading, user, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setSuccessMsg('');
    try {
      const updated = await apiClient.put('/users/me', {
        firstName,
        lastName,
        email: email.trim().toLowerCase(),
        phone,
      });
      updateUser(updated);
      setSuccessMsg('Profile and email updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword !== confirmNewPassword) {
      setPwdError('New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setPwdError('Password must be at least 8 characters long');
      return;
    }

    setIsChangingPwd(true);
    try {
      const res = await changePassword(oldPassword, newPassword);
      setPwdSuccess(res.message || 'Password changed successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password. Please check current password.');
    } finally {
      setIsChangingPwd(false);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPrefs(true);
    setPrefSuccess('');
    try {
      await apiClient.put('/notifications/preferences', {
        email: emailNotifs,
        orderUpdates: orderNotifs,
        promotions: promoNotifs,
      });
      setPrefSuccess('Notification preferences saved!');
    } catch (err: any) {
      alert(err.message || 'Failed to update preferences');
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiClient.post('/users/me/addresses', {
        recipientName: newRecipientName,
        phone: newPhone,
        street: newStreet,
        city: newCity,
        state: newState,
        postalCode: newPostalCode,
        isDefault: addresses.length === 0,
      });
      setAddresses([...addresses, created]);
      setShowAddModal(false);
      setNewRecipientName('');
      setNewPhone('');
      setNewStreet('');
      setNewCity('');
      setNewState('');
      setNewPostalCode('');
    } catch (err: any) {
      alert(err.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      await apiClient.delete(`/users/me/addresses/${id}`);
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  return (
    <div className="container mx-auto px-4 py-10 max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Account Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage your personal profile, security, and addresses</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-base flex items-center gap-2">
            <User className="w-4 h-4 text-primary" /> Profile Information
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background font-medium"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">First Name</label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Last Name</label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">Phone Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Account Role</label>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{user?.role || 'CUSTOMER'}</span>
              </div>
            </div>
            <Button type="submit" size="sm" disabled={isUpdating} className="w-full">
              {isUpdating ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
          <h3 className="font-bold text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" /> Security & Password
          </h3>

          {pwdSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {pwdSuccess}
            </div>
          )}

          {pwdError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" /> {pwdError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Current Password</label>
              <input
                required
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">New Password (min 8 chars)</label>
              <input
                required
                type="password"
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Confirm New Password</label>
              <input
                required
                type="password"
                minLength={8}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={isChangingPwd} className="w-full">
              {isChangingPwd ? 'Updating...' : 'Update Password'}
            </Button>
          </form>
        </div>

        {/* Address Book Card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" /> Address Book
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="text-xs font-semibold gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {addresses.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4">No saved addresses yet.</p>
            ) : (
              addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-3.5 rounded-2xl border bg-background text-xs space-y-1 relative"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground">{addr.recipientName}</span>
                    {addr.isDefault && (
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground">{addr.street}</p>
                  <p className="text-muted-foreground">{addr.city}, {addr.state} {addr.postalCode}</p>
                  <p className="text-[11px] text-muted-foreground">{addr.phone}</p>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="absolute bottom-3 right-3 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notification Preferences Card */}
      <div className="rounded-3xl border bg-card p-6 shadow-sm max-w-xl space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" /> Notification Preferences
        </h3>
        <p className="text-xs text-muted-foreground">Select how and when you would like to receive updates.</p>

        {prefSuccess && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {prefSuccess}
          </div>
        )}

        <form onSubmit={handleSavePreferences} className="space-y-4 text-xs">
          <label className="flex items-center justify-between p-3 rounded-2xl border bg-background cursor-pointer">
            <div>
              <p className="font-bold text-foreground">Email Notifications</p>
              <p className="text-[11px] text-muted-foreground">Receive critical account updates via email</p>
            </div>
            <input
              type="checkbox"
              checked={emailNotifs}
              onChange={(e) => setEmailNotifs(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl border bg-background cursor-pointer">
            <div>
              <p className="font-bold text-foreground">Order & Shipment Updates</p>
              <p className="text-[11px] text-muted-foreground">Receive real-time tracking and delivery emails</p>
            </div>
            <input
              type="checkbox"
              checked={orderNotifs}
              onChange={(e) => setOrderNotifs(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-2xl border bg-background cursor-pointer">
            <div>
              <p className="font-bold text-foreground">Special Deals & Promotions</p>
              <p className="text-[11px] text-muted-foreground">Get notified of seasonal sales and flash promo codes</p>
            </div>
            <input
              type="checkbox"
              checked={promoNotifs}
              onChange={(e) => setPromoNotifs(e.target.checked)}
              className="w-4 h-4 rounded text-primary"
            />
          </label>

          <Button type="submit" size="sm" disabled={isSavingPrefs} className="rounded-xl">
            {isSavingPrefs ? 'Saving...' : 'Save Preferences'}
          </Button>
        </form>
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">New Delivery Address</h3>
            <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">Recipient Name</label>
                <input
                  required
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Phone</label>
                <input
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Street Address</label>
                <input
                  required
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">City</label>
                  <input
                    required
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">State / Zip</label>
                  <div className="flex gap-1">
                    <input
                      required
                      placeholder="State"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-1/2 h-9 px-2 rounded-xl border bg-background"
                    />
                    <input
                      required
                      placeholder="ZIP"
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      className="w-1/2 h-9 px-2 rounded-xl border bg-background"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm">Save</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
