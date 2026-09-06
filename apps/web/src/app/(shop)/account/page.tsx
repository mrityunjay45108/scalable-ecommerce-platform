'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  ShieldCheck,
  AlertCircle,
  Bell,
  Package,
  Coins,
  Sparkles,
  PhoneCall,
  RotateCcw,
  Truck,
  HeartHandshake,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { AddressDto } from '@ecommerce/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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
          apiClient.get('/users/me/addresses').catch(() => []),
          apiClient.get('/notifications/preferences').catch(() => null),
        ]);
        setAddresses(Array.isArray(addrData) ? addrData : []);
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
      setSuccessMsg('आपकी प्रोफ़ाइल जानकारी सफलतापूर्वक अपडेट हो गई है!');
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
      setPwdSuccess(res.message || 'पासवर्ड सफलतापूर्वक बदल दिया गया है!');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'Failed to change password');
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
      setPrefSuccess('नोटिफिकेशन प्राथमिकताएं सुरक्षित कर ली गई हैं!');
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
    if (!confirm('क्या आप वाकई इस पते को हटाना चाहते हैं?')) return;
    try {
      await apiClient.delete(`/users/me/addresses/${id}`);
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete address');
    }
  };

  const displayName = firstName || user?.firstName || 'सम्मानित ग्राहक';

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl space-y-8">
      {/* 1. WARM INDIAN CULTURAL WELCOME BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-emerald-700 text-white p-6 sm:p-8 shadow-xl border border-amber-400/30">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/25 backdrop-blur-md text-amber-200 border border-amber-300/30 text-xs font-black tracking-wider">
              <span>🇮🇳 SWADESH VIP Club</span>
              <span className="text-white/60">|</span>
              <span className="font-serif">॥ अतिथिदेवो भवः ॥</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Namaste, {displayName} ji!</span>
              <span className="inline-block animate-bounce">🙏</span>
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 font-medium max-w-xl leading-relaxed">
              Welcome to your SWADESH account. Every purchase champions India&apos;s master weavers, local artisans, and innovators under our sacred Atithi Devo Bhava pledge.
            </p>
          </div>

          {/* Bharat Pehchan Rewards Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shrink-0 shadow-lg">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-200 text-amber-950 flex items-center justify-center font-black shadow-md text-xl">
              <Coins className="w-6 h-6 text-amber-900" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-amber-200 uppercase tracking-wider">Gold Member (स्वर्ण सदस्य)</span>
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              </div>
              <p className="text-xl font-black text-white">1,450 Swadeshi Coins</p>
              <p className="text-[11px] text-amber-100 font-medium">Save ₹145 instantly on your next order</p>
            </div>
          </div>
        </div>

        {/* Decorative Indian Pattern Overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
      </div>

      {/* 2. QUICK ACTION CARDS (Orders, Tracking, Support) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/orders"
          className="group p-5 rounded-3xl border bg-card hover:border-amber-500/50 hover:shadow-lg transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">My Orders (मेरे ऑर्डर्स)</h3>
              <p className="text-xs text-muted-foreground">Live tracking & invoice download</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-amber-600 transition-all" />
        </Link>

        <Link
          href="/wishlist"
          className="group p-5 rounded-3xl border bg-card hover:border-rose-500/50 hover:shadow-lg transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">My Wishlist (मेरी विशलिस्ट)</h3>
              <p className="text-xs text-muted-foreground">Saved Indian artisanal products</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-rose-600 transition-all" />
        </Link>

        <div
          onClick={() => {
            const phone = '917898501472';
            const text = encodeURIComponent('Namaste! I would like to connect with SWADESH customer concierge.');
            window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
          }}
          className="cursor-pointer group p-5 rounded-3xl border bg-card hover:border-emerald-500/50 hover:shadow-lg transition-all flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">24×7 Concierge Care</h3>
              <p className="text-xs text-muted-foreground">Instant chat on WhatsApp</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-emerald-600 transition-all" />
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> {successMsg}
        </div>
      )}

      {/* 3. SETTINGS & PROFILE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <User className="w-4 h-4 text-amber-600" /> व्यक्तिगत जानकारी
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              सत्यापित सदस्य
            </span>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold block mb-1">ईमेल पता (Email Address)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background font-medium focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold block mb-1">पहला नाम (First Name)</label>
                <input
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">अंतिम नाम (Last Name)</label>
                <input
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="font-semibold block mb-1">मोबाइल नंबर (Phone Number)</label>
              <input
                value={phone}
                placeholder="+91 9876543210"
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">खाता प्रकार (Account Role)</label>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{user?.role || 'CUSTOMER'} (वेरिफाइड खरीदार)</span>
              </div>
            </div>
            <Button type="submit" size="sm" disabled={isUpdating} className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold">
              {isUpdating ? 'सुरक्षित कर रहे हैं...' : 'प्रोफ़ाइल सुरक्षित करें'}
            </Button>
          </form>
        </div>

        {/* Security & Password Card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600" /> सुरक्षा व पासवर्ड
            </h3>
            <span className="text-[10px] text-muted-foreground font-semibold">256-Bit एन्क्रिप्शन</span>
          </div>

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
              <label className="font-semibold block mb-1">वर्तमान पासवर्ड (Current Password)</label>
              <input
                required
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">नया पासवर्ड (New Password - न्यूनतम 8 अक्षर)</label>
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
              <label className="font-semibold block mb-1">नया पासवर्ड पुनः दर्ज करें (Confirm Password)</label>
              <input
                required
                type="password"
                minLength={8}
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                className="w-full h-9 px-3 rounded-xl border bg-background"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={isChangingPwd} className="w-full rounded-xl font-bold">
              {isChangingPwd ? 'अपडेट हो रहा है...' : 'पासवर्ड अपडेट करें'}
            </Button>
          </form>
        </div>

        {/* Address Book Card */}
        <div className="rounded-3xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" /> डिलीवरी पते (Address Book)
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="text-xs font-bold gap-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700"
            >
              <Plus className="w-3.5 h-3.5" /> नया पता जोड़ें
            </Button>
          </div>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {addresses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <MapPin className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-xs">अभी तक कोई सहेजा गया पता नहीं है।</p>
                <Button size="sm" variant="outline" onClick={() => setShowAddModal(true)} className="rounded-xl text-xs">
                  पता जोड़ें
                </Button>
              </div>
            ) : (
              addresses.map((addr) => (
                <div
                  key={addr.id}
                  className="p-3.5 rounded-2xl border bg-background text-xs space-y-1 relative hover:border-amber-500/40 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <span>{addr.recipientName}</span>
                    </span>
                    {addr.isDefault && (
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/20">
                        मुख्य पता
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground font-medium">{addr.street}</p>
                  <p className="text-muted-foreground font-semibold">
                    {addr.city}, {addr.state} - {addr.postalCode} 🇮🇳
                  </p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 pt-0.5">
                    📞 {addr.phone}
                  </p>
                  <button
                    onClick={() => handleDeleteAddress(addr.id)}
                    className="absolute bottom-3 right-3 text-muted-foreground hover:text-destructive transition-colors p-1"
                    title="पता हटाएं"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* 4. OUR TRUST PROMISE (॥ अतिथिदेवो भवः ॥) */}
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-amber-500/5 p-6 sm:p-8 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <HeartHandshake className="w-6 h-6 text-amber-600" />
          <h3 className="text-lg font-black text-foreground">॥ अतिथिदेवो भवः ॥ — Our Sacred Customer Pledge</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          At SWADESH Luxe, your peace of mind is sacred to us. Every single product is 100% genuine and sourced directly from certified Indian master artisans and innovators. If you are not completely delighted with your purchase, enjoy 7-day doorstep returns with instant refunds—zero questions asked.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3 rounded-2xl bg-card border flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-xs font-bold text-foreground">100% Genuine (शुद्ध)</span>
          </div>
          <div className="p-3 rounded-2xl bg-card border flex items-center gap-3">
            <Truck className="w-5 h-5 text-amber-600 shrink-0" />
            <span className="text-xs font-bold text-foreground">29,000+ Pin Codes</span>
          </div>
          <div className="p-3 rounded-2xl bg-card border flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-indigo-600 shrink-0" />
            <span className="text-xs font-bold text-foreground">7-Day Sahaj Wapsi</span>
          </div>
          <div className="p-3 rounded-2xl bg-card border flex items-center gap-3">
            <PhoneCall className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="text-xs font-bold text-foreground">24×7 Concierge Care</span>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl border p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-black flex items-center gap-2">
                <span>📍 नया डिलीवरी पता जोड़ें</span>
              </h3>
              <span className="text-xs text-emerald-600 font-bold">भारतभर में डिलीवरी</span>
            </div>
            <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block mb-1">प्राप्तकर्ता का नाम (Recipient Full Name)</label>
                <input
                  required
                  placeholder="उदा. राजेश शर्मा"
                  value={newRecipientName}
                  onChange={(e) => setNewRecipientName(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">मोबाइल नंबर (10-Digit Mobile)</label>
                <input
                  required
                  placeholder="उदा. 9876543210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">मकान सं., गली, इलाका (Street Address)</label>
                <input
                  required
                  placeholder="उदा. फ्लैट 302, शांति कुंज, मेन रोड"
                  value={newStreet}
                  onChange={(e) => setNewStreet(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border bg-background"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold block mb-1">शहर (City)</label>
                  <input
                    required
                    placeholder="उदा. वाराणसी / जयपुर"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full h-9 px-3 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">राज्य व पिन कोड</label>
                  <div className="flex gap-1">
                    <input
                      required
                      placeholder="राज्य (State)"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-1/2 h-9 px-2 rounded-xl border bg-background"
                    />
                    <input
                      required
                      placeholder="पिन कोड"
                      maxLength={6}
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      className="w-1/2 h-9 px-2 rounded-xl border bg-background font-mono"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-3 border-t">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)} className="rounded-xl">
                  रद्द करें
                </Button>
                <Button type="submit" size="sm" className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold">
                  पता सुरक्षित करें
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
