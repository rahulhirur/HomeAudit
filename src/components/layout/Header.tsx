'use client';

import React, { useState } from 'react';
import { useAuth, CurrencyCode } from '@/context/AuthContext';
import { Wallet, LogOut, Tag, Settings, Globe } from 'lucide-react';

interface HeaderProps {
  onOpenCategoryManager?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCategoryManager }) => {
  const { user, isDemoMode, logout, currency, setCurrency } = useAuth();
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);

  const currencies: { code: CurrencyCode; label: string; symbol: string }[] = [
    { code: 'INR', label: 'INR (₹)', symbol: '₹' },
    { code: 'USD', label: 'USD ($)', symbol: '$' },
    { code: 'EUR', label: 'EUR (€)', symbol: '€' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-slate-100">HomeAudit</h1>
              {isDemoMode && (
                <span className="px-2 py-0.5 text-[9px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full">
                  Protected Demo
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Household & Couple Expense Analytics</p>
          </div>
        </div>

        {/* Action Controls, Global Currency Switcher & User Account */}
        <div className="flex items-center gap-2.5">
          {/* Global Currency Preference Switcher (Outside Form) */}
          <div className="relative">
            <button
              onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-800 text-xs font-semibold shadow-sm transition-all"
              title="Change Global Currency"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currency} ({currency === 'INR' ? '₹' : currency === 'USD' ? '$' : '€'})</span>
            </button>

            {isCurrencyDropdownOpen && (
              <div className="absolute right-0 mt-1.5 w-36 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden py-1 z-50 animate-fade-in">
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800">
                  Global Currency
                </div>
                {currencies.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setCurrency(c.code);
                      setIsCurrencyDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs font-semibold flex items-center justify-between transition-colors ${
                      currency === c.code
                        ? 'bg-indigo-600/30 text-indigo-300'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{c.label}</span>
                    {currency === c.code && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Category Button */}
          {onOpenCategoryManager && (
            <button
              onClick={onOpenCategoryManager}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 text-xs font-medium transition-all"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              Categories
            </button>
          )}

          {user && (
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 p-1.5 pl-3 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-600 to-emerald-400 flex items-center justify-center font-bold text-xs text-white shadow-inner">
                  {user.display_name.charAt(0)}
                </div>
                <div className="text-left text-xs hidden sm:block">
                  <span className="block font-semibold text-slate-200 leading-tight">{user.display_name}</span>
                </div>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                aria-label="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-xl hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
