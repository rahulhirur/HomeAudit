'use client';

import React, { useState } from 'react';
import { Expense, Profile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Scale, CheckCircle2, ArrowRight, ShieldCheck, HeartHandshake } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SettlementCardProps {
  expenses: Expense[];
  profiles: Profile[];
  onSettleAll: () => void;
}

export const SettlementCard: React.FC<SettlementCardProps> = ({
  expenses,
  profiles,
  onSettleAll,
}) => {
  const { currencySymbol } = useAuth();
  const userA = profiles[0] || { id: 'usr-1', display_name: 'Rahul' };
  const userB = profiles[1] || { id: 'usr-2', display_name: 'Apeksha' };

  const [isSettled, setIsSettled] = useState(false);

  // Shared Expense Calculation
  const sharedExpenses = expenses.filter((e) => e.split_type === 'SHARED_50_50' || e.split_type === 'INDIVIDUAL_PAID_FOR_OTHER');

  let userAPaidShared = 0;
  let userBPaidShared = 0;

  sharedExpenses.forEach((exp) => {
    if (exp.split_type === 'SHARED_50_50') {
      if (exp.user_id === userA.id) userAPaidShared += exp.amount / 2;
      if (exp.user_id === userB.id) userBPaidShared += exp.amount / 2;
    } else if (exp.split_type === 'INDIVIDUAL_PAID_FOR_OTHER') {
      if (exp.user_id === userA.id) userAPaidShared += exp.amount;
      if (exp.user_id === userB.id) userBPaidShared += exp.amount;
    }
  });

  const netDiff = userAPaidShared - userBPaidShared;

  const handleSettleUp = () => {
    setIsSettled(true);
    try {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { y: 0.7 },
      });
    } catch (e) {
      // ignore fallback
    }
    onSettleAll();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Household Settlement Calculator</h2>
            <p className="text-xs text-slate-400">Automatic 50/50 balance between partners</p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <ShieldCheck className="w-4 h-4" /> Equal Household Split
        </div>
      </div>

      {/* Balance Summary Box */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 rounded-2xl border border-slate-800 text-center relative overflow-hidden">
        {Math.abs(netDiff) < 1 || isSettled ? (
          <div className="space-y-2 py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-emerald-400">All Settled Up!</h3>
            <p className="text-xs text-slate-400">No pending balances between {userA.display_name} and {userB.display_name}.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Pending Settlement</span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white">
              {currencySymbol}{Math.abs(netDiff).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-300">
              <span>{netDiff > 0 ? userB.display_name : userA.display_name}</span>
              <ArrowRight className="w-4 h-4" />
              <span>{netDiff > 0 ? userA.display_name : userB.display_name}</span>
            </div>

            <div className="pt-3">
              <button
                onClick={handleSettleUp}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:brightness-110 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
              >
                <HeartHandshake className="w-4 h-4" />
                Settle Balance Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shared Expense Breakdown Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200">Shared Contribution Summary</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex justify-between items-center">
            <div>
              <span className="block text-xs text-slate-400">{userA.display_name}&apos;s Shared Advance</span>
              <span className="block text-lg font-bold text-emerald-400">{currencySymbol}{userAPaidShared.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-xs text-slate-400">50% share</span>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 flex justify-between items-center">
            <div>
              <span className="block text-xs text-slate-400">{userB.display_name}&apos;s Shared Advance</span>
              <span className="block text-lg font-bold text-emerald-400">{currencySymbol}{userBPaidShared.toLocaleString('en-IN')}</span>
            </div>
            <span className="text-xs text-slate-400">50% share</span>
          </div>
        </div>
      </div>
    </div>
  );
};
