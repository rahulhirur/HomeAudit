'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Lock, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';

// Curated primary gradients for core household accounts
const PRIMARY_GRADIENTS: Record<string, string> = {
  Rahul: 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 text-white shadow-indigo-500/25',
  Apeksha: 'bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-500 text-white shadow-rose-500/25',
  Guest: 'bg-gradient-to-tr from-amber-500 via-orange-500 to-cyan-500 text-white shadow-amber-500/25',
};

// Dynamic gradient palette pool for ANY new user added in the future
const DYNAMIC_GRADIENTS = [
  'bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-emerald-500/25',
  'bg-gradient-to-tr from-violet-600 to-indigo-400 text-white shadow-violet-500/25',
  'bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-cyan-500/25',
  'bg-gradient-to-tr from-fuchsia-500 to-pink-500 text-white shadow-fuchsia-500/25',
  'bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-amber-500/25',
  'bg-gradient-to-tr from-sky-500 to-indigo-500 text-white shadow-sky-500/25',
];

// Helper that deterministically generates a unique vibrant gradient for any new user name
const getAvatarStyle = (name: string) => {
  const norm = name.trim();
  if (PRIMARY_GRADIENTS[norm]) return PRIMARY_GRADIENTS[norm];
  if (norm.toLowerCase().includes('rahul')) return PRIMARY_GRADIENTS.Rahul;
  if (norm.toLowerCase().includes('apeksha')) return PRIMARY_GRADIENTS.Apeksha;
  if (norm.toLowerCase().includes('guest')) return PRIMARY_GRADIENTS.Guest;

  // Hash user name to pick a consistent dynamic gradient from palette pool
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DYNAMIC_GRADIENTS.length;
  return DYNAMIC_GRADIENTS[index];
};

export const LoginPage: React.FC = () => {
  const { allProfiles, login } = useAuth();

  const [selectedUserId, setSelectedUserId] = useState<string>(allProfiles[0]?.id || 'usr-husband-01');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedProfile = allProfiles.find((p) => p.id === selectedUserId) || allProfiles[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await login(selectedUserId, password);
      if (!res.success) {
        setError(res.error || 'Authentication failed. Please check your password.');
      }
    } catch (err: any) {
      setError('An unexpected error occurred during sign in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const gridColsClass = allProfiles.length >= 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl" />
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-8 relative z-10 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/25">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">HomeAudit</h1>
            <p className="text-xs text-slate-400 mt-1">Household Expense & Settlement Analytics</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Banner */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Account Selection Cards */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Select Your Account
            </label>
            <div className={`grid ${gridColsClass} gap-3`}>
              {allProfiles.map((p) => {
                const isSelected = selectedUserId === p.id;
                const initialChar = p.display_name.charAt(0).toUpperCase();
                const avatarStyle = getAvatarStyle(p.display_name);

                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setSelectedUserId(p.id);
                      setError(null);
                    }}
                    className={`flex flex-col items-center p-3.5 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10 scale-[1.02]'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base mb-2 shadow-lg transition-transform ${
                      isSelected ? 'scale-110 ring-2 ring-indigo-400/50' : 'opacity-90 hover:opacity-100'
                    } ${avatarStyle}`}>
                      {initialChar}
                    </div>
                    <span className="text-xs font-semibold capitalize truncate max-w-full">{p.display_name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Password
              </label>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder={`Enter password for ${selectedProfile?.display_name || 'account'}`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-800/80 text-white pl-10 pr-4 py-3 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm transition-colors"
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:brightness-110 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Authenticating...' : `Sign In as ${selectedProfile?.display_name || 'User'}`}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-500 pt-2 border-t border-slate-800/80">
          <p className="flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-slate-400" /> Private Protected Household Instance
          </p>
        </div>
      </div>
    </div>
  );
};
