'use client';

import React, { useState } from 'react';
import { Expense, Profile, Timeframe } from '@/types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Plus } from 'lucide-react';

interface CalendarHeatmapProps {
  expenses: Expense[];
  profiles: Profile[];
  onOpenAddModal: () => void;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  expenses,
  profiles,
  onOpenAddModal,
}) => {
  const [calTimeframe, setCalTimeframe] = useState<Timeframe>('monthly');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  // Month Navigation
  const prevPeriod = () => {
    if (calTimeframe === 'monthly') {
      setCurrentDate(new Date(year, month - 1, 1));
    } else if (calTimeframe === 'quarterly') {
      setCurrentDate(new Date(year, month - 3, 1));
    } else {
      setCurrentDate(new Date(year - 1, month, 1));
    }
  };

  const nextPeriod = () => {
    if (calTimeframe === 'monthly') {
      setCurrentDate(new Date(year, month + 1, 1));
    } else if (calTimeframe === 'quarterly') {
      setCurrentDate(new Date(year, month + 3, 1));
    } else {
      setCurrentDate(new Date(year + 1, month, 1));
    }
  };

  // --- MONTH VIEW DATA ---
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthExpenses = expenses.filter((exp) => {
    const d = new Date(exp.expense_date);
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const dailyTotals: Record<string, number> = {};
  const dailyExpensesMap: Record<string, Expense[]> = {};

  monthExpenses.forEach((exp) => {
    const dateKey = exp.expense_date;
    dailyTotals[dateKey] = (dailyTotals[dateKey] || 0) + exp.amount;
    if (!dailyExpensesMap[dateKey]) dailyExpensesMap[dateKey] = [];
    dailyExpensesMap[dateKey].push(exp);
  });

  const maxDailySpend = Math.max(...Object.values(dailyTotals), 1);

  // --- QUARTER VIEW DATA ---
  const currentQuarterNum = Math.floor(month / 3);
  const quarterMonths = [currentQuarterNum * 3, currentQuarterNum * 3 + 1, currentQuarterNum * 3 + 2];

  // --- YEAR VIEW DATA (12 Months) ---
  const yearlyExpenses = expenses.filter((exp) => new Date(exp.expense_date).getFullYear() === year);
  const monthlyTotalsYear: number[] = Array(12).fill(0);
  yearlyExpenses.forEach((exp) => {
    const m = new Date(exp.expense_date).getMonth();
    monthlyTotalsYear[m] += exp.amount;
  });
  const maxMonthlySpendYear = Math.max(...monthlyTotalsYear, 1);

  // Selected Day Details
  const selectedDayExpenses = selectedDay ? dailyExpensesMap[selectedDay] || [] : [];
  const selectedDayTotal = selectedDay ? dailyTotals[selectedDay] || 0 : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
      {/* Calendar Header: Title, Navigation, and Minimal Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {calTimeframe === 'monthly'
                ? `${monthName} ${year}`
                : calTimeframe === 'quarterly'
                ? `Q${currentQuarterNum + 1} ${year}`
                : `Year ${year}`}
            </h2>
            <p className="text-xs text-slate-400">Activity bubble spending heatmap</p>
          </div>
        </div>

        {/* Minimal Timeframe Selector & Arrow Controls */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1 shadow-inner">
            {(['monthly', 'quarterly', 'yearly'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setCalTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  calTimeframe === tf
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf === 'monthly' ? 'Month' : tf === 'quarterly' ? 'Quarter' : 'Year'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={prevPeriod}
              aria-label="Previous Period"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextPeriod}
              aria-label="Next Period"
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: MONTHLY CALENDAR GRID */}
      {calTimeframe === 'monthly' && (
        <div className="space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <span key={d} className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="h-14 sm:h-16" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const total = dailyTotals[dateStr] || 0;
              const isSelected = selectedDay === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              let circleBgStyle = {};
              if (total > 0) {
                const ratio = total / maxDailySpend;
                const sizePx = Math.max(14, Math.min(44, Math.round(ratio * 38 + 10)));

                circleBgStyle = {
                  width: `${sizePx}px`,
                  height: `${sizePx}px`,
                  background:
                    total > 5000
                      ? 'radial-gradient(circle, #f43f5e 0%, #be123c 100%)'
                      : total > 2000
                      ? 'radial-gradient(circle, #f59e0b 0%, #d97706 100%)'
                      : 'radial-gradient(circle, #10b981 0%, #059669 100%)',
                  boxShadow:
                    total > 5000
                      ? '0 0 12px rgba(244, 63, 94, 0.4)'
                      : total > 2000
                      ? '0 0 10px rgba(245, 158, 11, 0.35)'
                      : '0 0 8px rgba(16, 185, 129, 0.3)',
                };
              }

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDay(dateStr)}
                  className={`h-14 sm:h-16 rounded-2xl p-1 flex flex-col items-center justify-between border transition-all relative group ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/50'
                      : isToday
                      ? 'bg-slate-800/80 border-slate-600'
                      : 'bg-slate-900/40 border-slate-800/70 hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>
                    {dayNum}
                  </span>

                  <div className="flex-1 flex items-center justify-center w-full my-0.5">
                    {total > 0 ? (
                      <div
                        className="rounded-full transition-transform duration-300 group-hover:scale-110 flex items-center justify-center text-[9px] font-bold text-white shadow-lg"
                        style={circleBgStyle}
                      >
                        {total >= 1000 ? `₹${(total / 1000).toFixed(1)}k` : `₹${total}`}
                      </div>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: QUARTERLY 3-MONTH SUMMARY GRID */}
      {calTimeframe === 'quarterly' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-2">
          {quarterMonths.map((mIdx) => {
            const mName = new Date(year, mIdx, 1).toLocaleString('default', { month: 'long' });
            const mTotal = expenses
              .filter((exp) => {
                const d = new Date(exp.expense_date);
                return d.getFullYear() === year && d.getMonth() === mIdx;
              })
              .reduce((sum, e) => sum + e.amount, 0);

            return (
              <div key={mIdx} className="bg-slate-950/60 border border-slate-800 p-5 rounded-2xl text-center space-y-3">
                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">{mName}</span>
                <div className="flex justify-center items-center h-16">
                  <div
                    className="rounded-full flex items-center justify-center font-bold text-white shadow-lg transition-transform hover:scale-105"
                    style={{
                      width: `${Math.max(36, Math.min(64, Math.round((mTotal / (maxDailySpend * 30 || 1)) * 50 + 32)))}px`,
                      height: `${Math.max(36, Math.min(64, Math.round((mTotal / (maxDailySpend * 30 || 1)) * 50 + 32)))}px`,
                      background: mTotal > 15000 ? '#f43f5e' : mTotal > 5000 ? '#f59e0b' : '#10b981',
                      boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)',
                    }}
                  >
                    <span className="text-xs font-extrabold">₹{(mTotal / 1000).toFixed(0)}k</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">Total Spend: ₹{mTotal.toLocaleString('en-IN')}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 3: YEARLY 12-MONTH HEAT GRID */}
      {calTimeframe === 'yearly' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-2">
          {Array.from({ length: 12 }).map((_, mIdx) => {
            const mName = new Date(year, mIdx, 1).toLocaleString('default', { month: 'short' });
            const mTotal = monthlyTotalsYear[mIdx] || 0;
            const ratio = mTotal / maxMonthlySpendYear;

            return (
              <div key={mIdx} className="bg-slate-950/60 border border-slate-800 p-3 rounded-2xl text-center space-y-2">
                <span className="text-xs font-semibold text-slate-300">{mName}</span>
                <div className="flex justify-center items-center h-12">
                  {mTotal > 0 ? (
                    <div
                      className="rounded-full flex items-center justify-center font-bold text-white text-[10px] shadow"
                      style={{
                        width: `${Math.max(24, Math.min(48, Math.round(ratio * 34 + 18)))}px`,
                        height: `${Math.max(24, Math.min(48, Math.round(ratio * 34 + 18)))}px`,
                        background: ratio > 0.6 ? '#f43f5e' : ratio > 0.3 ? '#f59e0b' : '#10b981',
                      }}
                    >
                      ₹{(mTotal / 1000).toFixed(0)}k
                    </div>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-800" />
                  )}
                </div>
                <p className="text-[10px] text-slate-400">₹{mTotal.toLocaleString('en-IN')}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Minimal Legend */}
      <div className="flex items-center justify-center gap-6 text-xs text-slate-400 border-t border-slate-800/60 pt-3">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-slate-800" />
          <span>No Spend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Light</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500" />
          <span>Moderate</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-rose-500" />
          <span>High</span>
        </div>
      </div>

      {/* Selected Day Details Drawer */}
      {selectedDay && calTimeframe === 'monthly' && (
        <div className="bg-slate-950 p-4 rounded-2xl border border-indigo-500/30 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div>
              <h3 className="text-xs font-bold text-slate-100">
                {new Date(selectedDay).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
              </h3>
              <p className="text-[11px] text-slate-400">Total Spent: ₹{selectedDayTotal.toLocaleString('en-IN')}</p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1 shadow"
            >
              <Plus className="w-3 h-3" /> Add Item
            </button>
          </div>

          {selectedDayExpenses.length === 0 ? (
            <div className="py-3 text-center text-slate-500 text-xs">
              No transactions recorded for this date.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {selectedDayExpenses.map((exp) => {
                const payer = profiles.find((p) => p.id === exp.user_id);
                return (
                  <div key={exp.id} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-200 block">{exp.title}</span>
                      <span className="text-[10px] text-slate-400">Paid by {payer?.display_name || 'User'}</span>
                    </div>
                    <div className="text-right font-extrabold text-white">
                      ₹{exp.amount.toLocaleString('en-IN')}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
