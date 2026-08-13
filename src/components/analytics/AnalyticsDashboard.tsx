'use client';

import React, { useState } from 'react';
import { Expense, Category, Profile, Timeframe } from '@/types';
import { useAuth } from '@/context/AuthContext';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface AnalyticsDashboardProps {
  expenses: Expense[];
  categories: Category[];
  profiles: Profile[];
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  expenses,
  categories,
  profiles,
}) => {
  const { currencySymbol } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>('monthly');

  const userA = profiles[0] || { id: 'usr-1', display_name: 'Rahul' };
  const userB = profiles[1] || { id: 'usr-2', display_name: 'Apeksha' };

  // Filter expenses by selected timeframe
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

  const timeframeLabel =
    timeframe === 'monthly'
      ? now.toLocaleString('default', { month: 'long', year: 'numeric' })
      : timeframe === 'quarterly'
      ? `Q${currentQuarter + 1} ${currentYear}`
      : `Year ${currentYear}`;

  // 1. Data for Donut Chart (Category Spending)
  const categoryData = categories
    .map((cat) => {
      const total = filteredExpenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        name: cat.name,
        value: total,
        color: cat.color,
      };
    })
    .filter((item) => item.value > 0);

  // 2. Data for Partner Comparison Bar Chart
  const comparisonData = categories
    .map((cat) => {
      const userATotal = filteredExpenses
        .filter((e) => e.category_id === cat.id && e.user_id === userA.id)
        .reduce((sum, e) => sum + e.amount, 0);

      const userBTotal = filteredExpenses
        .filter((e) => e.category_id === cat.id && e.user_id === userB.id)
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        category: cat.name,
        [userA.display_name]: userATotal,
        [userB.display_name]: userBTotal,
      };
    })
    .filter((item) => Number(item[userA.display_name]) > 0 || Number(item[userB.display_name]) > 0);

  // 3. Data for Spending Timeline Area Chart
  const dateMap: Record<string, number> = {};
  filteredExpenses.forEach((exp) => {
    dateMap[exp.expense_date] = (dateMap[exp.expense_date] || 0) + exp.amount;
  });

  const trendData = Object.keys(dateMap)
    .sort()
    .map((date) => ({
      date: new Date(date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      amount: dateMap[date],
    }));

  return (
    <div className="space-y-6">
      {/* Top Header Bar & Timeframe Pill Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Analytics Dashboard ({timeframeLabel})
          </h2>
          <p className="text-xs text-slate-400">Spending breakdown & partner insights</p>
        </div>

        {/* Timeframe Selector Pill Bar */}
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex gap-1 self-start sm:self-auto shadow-inner">
          <button
            onClick={() => setTimeframe('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              timeframe === 'monthly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setTimeframe('quarterly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              timeframe === 'quarterly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Quarter
          </button>
          <button
            onClick={() => setTimeframe('yearly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              timeframe === 'yearly'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Year
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Donut Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-base font-bold text-slate-100 mb-1">Category Breakdown ({timeframeLabel})</h3>
          <p className="text-xs text-slate-400 mb-4">Expense distribution by category</p>

          {categoryData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              No category expense data for {timeframeLabel}.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${currencySymbol}${Number(val || 0).toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Partner Comparison Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-base font-bold text-slate-100 mb-1">Partner Comparison ({timeframeLabel})</h3>
          <p className="text-xs text-slate-400 mb-4">{userA.display_name} vs {userB.display_name} spending</p>

          {comparisonData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
              No comparison data available for {timeframeLabel}.
            </div>
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="category" stroke="#94a3b8" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any) => [`${currencySymbol}${Number(val || 0).toLocaleString('en-IN')}`, 'Spent']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                  <Bar dataKey={userA.display_name} fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey={userB.display_name} fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Spending Trend Line Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <h3 className="text-base font-bold text-slate-100 mb-1">Spending Timeline ({timeframeLabel})</h3>
        <p className="text-xs text-slate-400 mb-4">Expense outflow graph</p>

        {trendData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-slate-500 text-sm">
            No timeline data to render for {timeframeLabel}.
          </div>
        ) : (
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [`${currencySymbol}${Number(val || 0).toLocaleString('en-IN')}`, 'Spent']}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Area type="monotone" dataKey="amount" stroke="#6366f1" fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};
