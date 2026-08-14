'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Wallet, Lock, User, ArrowRight, KeyRound, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { allProfiles, login, isDemoMode } = useAuth();

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
            <div className="grid grid-cols-2 gap-3">
              {allProfiles.map((p) => {
                const isSelected = selectedUserId === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => {
                      setSelectedUserId(p.id);
                      setError(null);
                    }}
                    className={`flex flex-col items-center p-4 rounded-2xl border transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mb-2 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {p.display_name.charAt(0)}
                    </div>
                    <span className="text-xs font-semibold">{p.display_name}</span>
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
                placeholder="Enter account password"
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
