'use client';

import React from 'react';
import { Expense, Profile, Timeframe } from '@/types';
import { Wallet, User, Scale, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';

interface OverviewCardsProps {
  expenses: Expense[];
  profiles: Profile[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
}

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  expenses,
  profiles,
  timeframe,
  onTimeframeChange,
}) => {
  const userA = profiles[0] || { id: 'usr-1', display_name: 'Rahul' };
  const userB = profiles[1] || { id: 'usr-2', display_name: 'Apeksha' };

  // Calculate totals
  const totalCombined = expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const userATotal = expenses
    .filter((exp) => exp.user_id === userA.id)
    .reduce((acc, exp) => acc + exp.amount, 0);

  const userBTotal = expenses
    .filter((exp) => exp.user_id === userB.id)
    .reduce((acc, exp) => acc + exp.amount, 0);

  // Settlement math for shared expenses
  let userASharedPaid = 0;
  let userBSharedPaid = 0;

  expenses.forEach((exp) => {
    if (exp.split_type === 'SHARED_50_50') {
      if (exp.user_id === userA.id) userASharedPaid += exp.amount / 2;
      if (exp.user_id === userB.id) userBSharedPaid += exp.amount / 2;
    } else if (exp.split_type === 'INDIVIDUAL_PAID_FOR_OTHER') {
      if (exp.user_id === userA.id) userASharedPaid += exp.amount;
      if (exp.user_id === userB.id) userBSharedPaid += exp.amount;
    }
  });

  const netBalance = userASharedPaid - userBSharedPaid; // Positive means User B owes User A

  return (
    <div className="space-y-4">
      {/* Timeframe Selector Pill Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Financial Overview</h2>
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1">
          {(['monthly', 'quarterly', 'yearly'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                timeframe === tf
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Combined Expenditure */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Combined Expense</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white tracking-tight">
            ₹{totalCombined.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1 capitalize">{timeframe} Total</p>
        </div>

        {/* Card 2: Person A (Rahul) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">{userA.display_name}&apos;s Spent</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
              {userA.display_name.charAt(0)}
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
            ₹{userATotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalCombined > 0 ? `${((userATotal / totalCombined) * 100).toFixed(0)}% of household` : '0%'}
          </p>
        </div>

        {/* Card 3: Person B (Apeksha) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 relative shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">{userB.display_name}&apos;s Spent</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs">
              {userB.display_name.charAt(0)}
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-400 tracking-tight">
            ₹{userBTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {totalCombined > 0 ? `${((userBTotal / totalCombined) * 100).toFixed(0)}% of household` : '0%'}
          </p>
        </div>

        {/* Card 4: Net Settlement Calculator Balance */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 rounded-2xl p-5 relative shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Net Settlement</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          {Math.abs(netBalance) < 1 ? (
            <div>
              <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Balanced!
              </div>
              <p className="text-[11px] text-slate-400 mt-1">No pending settlements</p>
            </div>
          ) : netBalance > 0 ? (
            <div>
              <div className="text-xl font-extrabold text-emerald-400">
                ₹{Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[11px] text-amber-300 font-medium mt-1">
                {userB.display_name} owes {userA.display_name}
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xl font-extrabold text-rose-400">
                ₹{Math.abs(netBalance).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-[11px] text-amber-300 font-medium mt-1">
                {userA.display_name} owes {userB.display_name}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
