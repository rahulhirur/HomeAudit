'use client';

import React, { useState } from 'react';
import { Expense, Category, Profile } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { Search, Filter, Trash2, Edit2, ShoppingCart, Zap, Home, Utensils, ShoppingBag, HeartPulse, Car, Film, User, MoreHorizontal, Calendar, FileSpreadsheet, FileText, Download, X, SlidersHorizontal, ArrowUpDown, Upload } from 'lucide-react';
import { ImportExpensesModal } from '@/components/expenses/ImportExpensesModal';

interface ExpenseListProps {
  expenses: Expense[];
  categories: Category[];
  profiles: Profile[];
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (expenseId: string) => void;
  onBulkSaveExpenses?: (importedExpenses: Partial<Expense>[]) => Promise<void> | void;
}

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  ShoppingCart,
  Zap,
  Home,
  Utensils,
  ShoppingBag,
  HeartPulse,
  Car,
  Film,
  User,
  MoreHorizontal,
};

export type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'title_asc';

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  categories,
  profiles,
  onEditExpense,
  onDeleteExpense,
  onBulkSaveExpenses,
}) => {
  const { currencySymbol, currency } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserFilter, setSelectedUserFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  // Import & Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const [exportStartDate, setExportStartDate] = useState(firstDayOfMonth);
  const [exportEndDate, setExportEndDate] = useState(todayStr);

  const filteredExpenses = expenses
    .filter((exp) => {
      const matchesSearch =
        exp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesUser = selectedUserFilter === 'ALL' || exp.user_id === selectedUserFilter;
      const matchesCat = selectedCategoryFilter === 'ALL' || exp.category_id === selectedCategoryFilter;

      return matchesSearch && matchesUser && matchesCat;
    })
    .sort((a, b) => {
      if (sortBy === 'date_asc') {
        const dateDiff = new Date(a.expense_date).getTime() - new Date(b.expense_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id?.replace('exp-', '')) || 0);
        const bTime = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id?.replace('exp-', '')) || 0);
        return aTime - bTime;
      } else if (sortBy === 'amount_desc') {
        return b.amount - a.amount;
      } else if (sortBy === 'amount_asc') {
        return a.amount - b.amount;
      } else if (sortBy === 'title_asc') {
        return a.title.localeCompare(b.title);
      } else {
        // Default: date_desc (Newest First + Timestamp Tie-Breaker)
        const dateDiff = new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
        if (dateDiff !== 0) return dateDiff;
        const aTime = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id?.replace('exp-', '')) || 0);
        const bTime = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id?.replace('exp-', '')) || 0);
        return bTime - aTime;
      }
    });

  // Filtered & Sorted (Date Decreasing Order + Timestamp Tie-Breaker) Expenses for Export Range
  const exportTargetExpenses = expenses
    .filter((exp) => {
      const expDate = exp.expense_date;
      return expDate >= exportStartDate && expDate <= exportEndDate;
    })
    .sort((a, b) => {
      const dateDiff = new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime();
      if (dateDiff !== 0) return dateDiff;

      const aTime = a.created_at ? new Date(a.created_at).getTime() : (Number(a.id?.replace('exp-', '')) || 0);
      const bTime = b.created_at ? new Date(b.created_at).getTime() : (Number(b.id?.replace('exp-', '')) || 0);

      return bTime - aTime;
    });

  // 1. CSV / Excel Export Handler (Sl No, Item Name, Category, Date, Cost, Paid by - Date Decreasing)
  const handleExportExcelCSV = () => {
    if (exportTargetExpenses.length === 0) {
      alert('No transactions found in the selected date range.');
      return;
    }

    const headers = ['Sl No', 'Item Name', 'Category', 'Date', 'Cost (INR)', 'Paid by'];

    const rows = exportTargetExpenses.map((exp, index) => {
      const categoryName = categories.find((c) => c.id === exp.category_id)?.name || 'Unassigned';
      const payerName = profiles.find((p) => p.id === exp.user_id)?.display_name || 'User';
      const safeItemName = `"${exp.title.replace(/"/g, '""')}"`;
      const safeCategory = `"${categoryName.replace(/"/g, '""')}"`;

      return [
        index + 1, // Sl No (1, 2, 3...)
        safeItemName,
        safeCategory,
        exp.expense_date,
        exp.amount,
        `"${payerName}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);

    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HomeAudit_Expenses_${exportStartDate}_to_${exportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Printable PDF Statement Export Handler (Sl No, Item Name, Category, Date, Cost, Paid by - Date Decreasing)
  const handleExportPDF = () => {
    if (exportTargetExpenses.length === 0) {
      alert('No transactions found in the selected date range.');
      return;
    }

    const totalAmount = exportTargetExpenses.reduce((sum, e) => sum + e.amount, 0);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate your PDF statement.');
      return;
    }

    const tableRowsHtml = exportTargetExpenses
      .map((exp, index) => {
        const cat = categories.find((c) => c.id === exp.category_id)?.name || 'Misc';
        const payer = profiles.find((p) => p.id === exp.user_id)?.display_name || 'User';
        return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">${index + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${exp.title}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${cat}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${exp.expense_date}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${currencySymbol}${exp.amount.toLocaleString('en-IN')}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${payer}</td>
        </tr>
      `;
      })
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HomeAudit Statement (${exportStartDate} to ${exportEndDate})</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #0f172a; }
            .header { border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 24px; font-weight: bold; color: #4338ca; }
            .summary-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { background: #4338ca; color: white; padding: 10px; text-align: left; }
            .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">HomeAudit Expense Statement</div>
              <div style="font-size: 12px; color: #64748b;">Household Financial Report (Date Decreasing)</div>
            </div>
            <div style="text-align: right; font-size: 12px;">Range: ${exportStartDate} to ${exportEndDate}</div>
          </div>

          <div class="summary-box">
            <div>
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Expenditure</div>
              <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${currencySymbol}${totalAmount.toLocaleString('en-IN')}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Total Items</div>
              <div style="font-size: 24px; font-weight: bold; color: #4338ca;">${exportTargetExpenses.length} entries</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="text-align: center;">Sl No</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Date</th>
                <th style="text-align: right;">Cost (INR)</th>
                <th style="text-align: center;">Paid by</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="footer">
            Generated via HomeAudit Household Expense Tracker
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Quick Preset Helper for Export Modal
  const setQuickRange = (type: 'this_month' | 'last_month' | 'year_to_date' | 'all') => {
    const d = new Date();
    if (type === 'this_month') {
      setExportStartDate(new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]);
      setExportEndDate(todayStr);
    } else if (type === 'last_month') {
      const lmStart = new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().split('T')[0];
      const lmEnd = new Date(d.getFullYear(), d.getMonth(), 0).toISOString().split('T')[0];
      setExportStartDate(lmStart);
      setExportEndDate(lmEnd);
    } else if (type === 'year_to_date') {
      setExportStartDate(`${d.getFullYear()}-01-01`);
      setExportEndDate(todayStr);
    } else if (type === 'all') {
      setExportStartDate('2020-01-01');
      setExportEndDate(todayStr);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            Expense Feed
          </h2>
          <p className="text-xs text-slate-400">All recorded transactions ({filteredExpenses.length})</p>
        </div>

        {/* Search Bar & Export Modal Trigger */}
        <div className="flex items-center gap-2 max-w-md w-full sm:w-auto">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/80 text-white pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all shrink-0 active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            Import File
          </button>

          <button
            onClick={() => setIsExportModalOpen(true)}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-500/20 transition-all shrink-0 active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            Export / Print
          </button>
        </div>
      </div>

      {/* Filter Badges & Right-Aligned Sort Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        {/* Left Side: Filter Options */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedUserFilter}
            onChange={(e) => setSelectedUserFilter(e.target.value)}
            aria-label="Filter by person"
            className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
          >
            <option value="ALL">All Partners</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.display_name}
              </option>
            ))}
          </select>

          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Side: Sort By Selector */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            aria-label="Sort transactions"
            className="bg-slate-800 text-slate-200 font-semibold text-xs px-2.5 py-1.5 rounded-lg border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Amount: High to Low</option>
            <option value="amount_asc">Amount: Low to High</option>
            <option value="title_asc">Title: A to Z</option>
          </select>
        </div>
      </div>

      {/* Expense Items List */}
      {filteredExpenses.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm">
          No expenses match your search filter.
        </div>
      ) : (
        <div className="divide-y divide-slate-800/60">
          {filteredExpenses.map((exp) => {
            const category = categories.find((c) => c.id === exp.category_id) || exp.category;
            const payer = profiles.find((p) => p.id === exp.user_id) || exp.user;
            const IconComponent = category ? ICON_MAP[category.icon] || MoreHorizontal : MoreHorizontal;

            return (
              <div
                key={exp.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-800/40 px-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{
                      backgroundColor: `${category?.color || '#6366f1'}20`,
                      color: category?.color || '#6366f1',
                    }}
                  >
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-100 truncate">{exp.title}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                        {exp.split_type === 'SHARED_50_50' ? '50/50 Shared' : 'Personal'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-medium text-slate-300">{payer?.display_name || 'User'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {new Date(exp.expense_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </span>
                      {exp.description && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="hidden sm:inline truncate max-w-xs italic text-slate-500">
                            {exp.description}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-base font-extrabold text-white">
                      {currencySymbol}{exp.amount.toLocaleString('en-IN')}
                    </div>
                    {exp.split_type === 'SHARED_50_50' && (
                      <span className="text-[10px] text-indigo-400">{currencySymbol}{(exp.amount / 2).toLocaleString('en-IN')} share</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditExpense(exp)}
                      title="Edit Expense"
                      aria-label="Edit Expense"
                      className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteExpense(exp.id)}
                      title="Delete Expense"
                      aria-label="Delete Expense"
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Date Range Export & Print Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-5 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">Export / Print Statement</h3>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                aria-label="Close Export Modal"
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Quick Presets
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setQuickRange('this_month')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg text-center"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('last_month')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg text-center"
                >
                  Last Month
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('year_to_date')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg text-center"
                >
                  Year to Date
                </button>
                <button
                  type="button"
                  onClick={() => setQuickRange('all')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg text-center"
                >
                  All Time
                </button>
              </div>
            </div>

            {/* Start Date & End Date Range Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:border-indigo-500 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:border-indigo-500 text-xs"
                />
              </div>
            </div>

            {/* Range Match Count Indicator */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-center">
              <span className="text-xs text-slate-300">
                Found <span className="font-extrabold text-indigo-400">{exportTargetExpenses.length}</span> entries (Date Decreasing)
              </span>
            </div>

            {/* Export Format Action Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleExportExcelCSV}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel / Sheets (.csv)
              </button>

              <button
                onClick={handleExportPDF}
                className="py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                Print PDF (.pdf)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Expenses Modal */}
      <ImportExpensesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        categories={categories}
        profiles={profiles}
        onBulkSaveExpenses={onBulkSaveExpenses || (() => {})}
      />
    </div>
  );
};
