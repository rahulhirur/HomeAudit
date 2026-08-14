'use client';

import React, { useState } from 'react';
import { Expense, Profile, Timeframe } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Plus, Receipt, ChevronLeft, ChevronRight, User, Users } from 'lucide-react';
import { CalendarHeatmap } from '@/components/calendar/CalendarHeatmap';

interface MinimalistHomeProps {
  expenses: Expense[];
  profiles: Profile[];
  onOpenAddModal: () => void;
  onEditExpense: (expense: Expense) => void;
}

type ViewMode = 'my' | 'combined' | 'partner';

export const MinimalistHome: React.FC<MinimalistHomeProps> = ({
  expenses,
  profiles,
  onOpenAddModal,
  onEditExpense,
}) => {
  const { user, currencySymbol } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('my');

  // Recent Transactions Pagination State
  const [recentPage, setRecentPage] = useState<number>(1);
  const itemsPerPage = 5;

  // Identify current logged-in user and partner
  const currentUser = user || profiles[0] || { id: 'usr-1', display_name: 'Rahul' };
  const partnerUser = profiles.find((p) => p.id !== currentUser.id) || profiles[1] || { id: 'usr-2', display_name: 'Partner' };

  // Filter expenses by timeframe
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentQuarter = Math.floor(currentMonth / 3);

  const filteredExpenses = expenses.filter((exp) => {
    const d = new Date(exp.expense_date);
    const expYear = d.getFullYear();
    const expMonth = d.getMonth();

    if (timeframe === 'monthly') {
      return expYear === currentYear && expMonth === currentMonth;
    } else if (timeframe === 'quarterly') {
      const expQuarter = Math.floor(expMonth / 3);
      return expYear === currentYear && expQuarter === currentQuarter;
    } else if (timeframe === 'yearly') {
      return expYear === currentYear;
    }
    return true;
  });

  // Calculate Spends
  const combinedTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const myTotal = filteredExpenses
    .filter((e) => e.user_id === currentUser.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const partnerTotal = filteredExpenses
    .filter((e) => e.user_id === partnerUser.id)
    .reduce((sum, e) => sum + e.amount, 0);

  // Active amount to show in Hero center
  const displayAmount =
    viewMode === 'my' ? myTotal : viewMode === 'partner' ? partnerTotal : combinedTotal;

  const displayTitle =
    viewMode === 'my'
      ? `My Spends (${currentUser.display_name})`
      : viewMode === 'partner'
      ? `${partnerUser.display_name}'s Spends`
      : 'Combined Household';

  const displaySubtitle =
    viewMode === 'combined'
      ? 'Total Household Outflow'
      : combinedTotal > 0
      ? `${((displayAmount / combinedTotal) * 100).toFixed(0)}% of combined household`
      : '0% of combined household';

  // Timeframe Header Label
  const timeframeLabel =
    timeframe === 'monthly'
      ? now.toLocaleString('default', { month: 'long', year: 'numeric' })
      : timeframe === 'quarterly'
      ? `Q${currentQuarter + 1} ${currentYear}`
      : `Year ${currentYear}`;

  // Sorted entries for recent transactions
  const sortedTimeframeExpenses = [...filteredExpenses].sort(
    (a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
  );

  const totalRecentPages = Math.max(1, Math.ceil(sortedTimeframeExpenses.length / itemsPerPage));
  const currentStartIndex = (recentPage - 1) * itemsPerPage;
  const paginatedRecentExpenses = sortedTimeframeExpenses.slice(
    currentStartIndex,
    currentStartIndex + itemsPerPage
  );

  // Toggle helpers for Middle Arrow buttons (Hero)
  const viewModeOrder: ViewMode[] = ['my', 'combined', 'partner'];
  const handlePrevViewMode = () => {
    const idx = viewModeOrder.indexOf(viewMode);
    const nextIdx = (idx - 1 + viewModeOrder.length) % viewModeOrder.length;
    setViewMode(viewModeOrder[nextIdx]);
  };
  const handleNextViewMode = () => {
    const idx = viewModeOrder.indexOf(viewMode);
    const nextIdx = (idx + 1) % viewModeOrder.length;
    setViewMode(viewModeOrder[nextIdx]);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Bar Header: Timeframe Title & Month / Quarter / Year Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div>
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            {timeframeLabel} Overview
          </h2>
          <p className="text-xs text-slate-400">Select timeframe to recalculate totals</p>
        </div>

        {/* Month / Quarter / Year Pill Bar */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => {
              setTimeframe('monthly');
              setRecentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              timeframe === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => {
              setTimeframe('quarterly');
              setRecentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              timeframe === 'quarterly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Quarter
          </button>
          <button
            onClick={() => {
              setTimeframe('yearly');
              setRecentPage(1);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              timeframe === 'yearly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      {/* Balanced 2-Column Layout: Left = Action Card, Right = Total Spend Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1 (Left): Prominent "Add New Expense" Action Hero Card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/40 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between space-y-4">
          <div className="absolute top-0 left-0 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="space-y-1 pt-1">
            <h3 className="text-xl font-bold text-slate-100">Record New Expense</h3>
            <p className="text-xs text-slate-400">
              Log groceries, bills, dining out, or shared household purchases in seconds.
            </p>
          </div>

          <button
            onClick={onOpenAddModal}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600 hover:brightness-110 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-emerald-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2.5 group"
          >
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center transition-transform group-hover:rotate-90">
              <Plus className="w-4 h-4 text-white stroke-[3]" />
            </div>
            <span>Add New Expense</span>
          </button>
        </div>

        {/* Column 2 (Right): Featured Total Spend Box with Middle Arrow Controls */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/60 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col justify-between text-center space-y-4">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Active View Badge */}
          <div className="flex items-center justify-center">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-3.5 py-1 rounded-full border border-indigo-500/20 flex items-center gap-1.5">
              {viewMode === 'my' ? (
                <User className="w-3.5 h-3.5" />
              ) : viewMode === 'combined' ? (
                <Users className="w-3.5 h-3.5" />
              ) : (
                <span className="font-bold text-xs">{partnerUser.display_name.charAt(0)}</span>
              )}
              {displayTitle}
            </span>
          </div>

          {/* Middle Section: Amount Flanked by Arrow Buttons */}
          <div className="flex items-center justify-between gap-2 py-2">
            <button
              onClick={handlePrevViewMode}
              title="Previous Spend View"
              aria-label="Previous Spend View"
              className="w-10 h-10 rounded-2xl bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-indigo-500 flex items-center justify-center shadow-lg transition-all active:scale-90 shrink-0"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex-1 text-center animate-fade-in key={viewMode}">
              <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {currencySymbol}{displayAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">{displaySubtitle}</p>
            </div>

            <button
              onClick={handleNextViewMode}
              title="Next Spend View"
              aria-label="Next Spend View"
              className="w-10 h-10 rounded-2xl bg-slate-800/90 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/80 hover:border-indigo-500 flex items-center justify-center shadow-lg transition-all active:scale-90 shrink-0"
            >
              <ChevronRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          <div className="text-[11px] text-slate-500 italic">
            Cycle left/right to toggle personal vs. household total
          </div>
        </div>
      </div>

      {/* Recent Activity List with Always-Visible < and > Arrow Controls in both Header & Footer */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        {/* Header with Title and Prominent < and > Arrow Controls */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-200">Recent Transactions</h3>
          </div>

          {/* Always Visible Sleek < and > Arrow Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
              disabled={recentPage === 1}
              title="Previous Page"
              aria-label="Previous Page"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors shrink-0"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <button
              onClick={() => setRecentPage((p) => Math.min(totalRecentPages, p + 1))}
              disabled={recentPage === totalRecentPages}
              title="Next Page"
              aria-label="Next Page"
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors shrink-0"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {paginatedRecentExpenses.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No expenses recorded for this {timeframe}.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {paginatedRecentExpenses.map((exp) => {
              const payer = profiles.find((p) => p.id === exp.user_id);
              const isMe = exp.user_id === currentUser.id;
              return (
                <div
                  key={exp.id}
                  onClick={() => onEditExpense(exp)}
                  className="py-3 flex items-center justify-between hover:bg-slate-800/40 px-2 rounded-xl cursor-pointer transition-colors"
                >
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{exp.title}</h4>
                    <span className="text-xs text-slate-400">
                      <span className={isMe ? 'text-indigo-400 font-semibold' : 'text-slate-400'}>
                        {payer?.display_name || 'User'}
                      </span>{' '}
                      • {new Date(exp.expense_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-white">
                      {currencySymbol}{exp.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Sleek < and > Arrow Controls */}
        <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3">
          <button
            onClick={() => setRecentPage((p) => Math.max(1, p - 1))}
            disabled={recentPage === 1}
            title="Previous Page"
            aria-label="Previous Page"
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
          </button>

          <button
            onClick={() => setRecentPage((p) => Math.min(totalRecentPages, p + 1))}
            disabled={recentPage === totalRecentPages}
            title="Next Page"
            aria-label="Next Page"
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white border border-slate-700/60 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Embedded Activity Calendar Heatmap (Below Recent Transactions) */}
      <CalendarHeatmap
        expenses={expenses}
        profiles={profiles}
        onOpenAddModal={onOpenAddModal}
      />
    </div>
  );
};
