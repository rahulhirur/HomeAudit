'use client';

import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Category, Expense, Profile, SplitType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Download, CheckSquare, Square, Trash2, ArrowRight } from 'lucide-react';

interface ImportExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  profiles: Profile[];
  onBulkSaveExpenses: (importedExpenses: Partial<Expense>[]) => Promise<void> | void;
}

interface ParsedRow {
  id: string;
  rawTitle: string;
  rawAmount: number;
  rawDate: string;
  rawCategory?: string;
  rawPaidBy?: string;
  matchedCategoryId: string;
  matchedUserId: string;
  splitType: SplitType;
  selected: boolean;
  isValid: boolean;
  validationError?: string;
}

export const ImportExpensesModal: React.FC<ImportExpensesModalProps> = ({
  isOpen,
  onClose,
  categories,
  profiles,
  onBulkSaveExpenses,
}) => {
  const { user, currencySymbol } = useAuth();

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [defaultUserId, setDefaultUserId] = useState<string>(user?.id || profiles[0]?.id || '');
  const [defaultSplitType, setDefaultSplitType] = useState<SplitType>('SHARED_50_50');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-match raw category string to database category ID
  const findMatchingCategoryId = (catStr?: string): string => {
    if (!catStr) return categories[0]?.id || '';
    const t = catStr.toLowerCase().trim();

    const matched = categories.find((c) => {
      const cName = c.name.toLowerCase();
      return (
        cName === t ||
        cName.includes(t) ||
        t.includes(cName) ||
        (cName.includes('din') && (t.includes('food') || t.includes('eat') || t.includes('restaurant'))) ||
        (cName.includes('groc') && (t.includes('supermarket') || t.includes('supply'))) ||
        (cName.includes('util') && (t.includes('bill') || t.includes('power') || t.includes('electric'))) ||
        (cName.includes('travel') && (t.includes('fuel') || t.includes('commute') || t.includes('cab')))
      );
    });

    return matched ? matched.id : categories[0]?.id || '';
  };

  // Auto-match raw payer string to profile ID
  const findMatchingUserId = (payerStr?: string): string => {
    if (!payerStr) return defaultUserId;
    const t = payerStr.toLowerCase().trim();

    const matched = profiles.find((p) => {
      const pName = p.display_name.toLowerCase();
      const pEmail = p.email.toLowerCase();
      return pName.includes(t) || t.includes(pName) || pEmail.includes(t);
    });

    return matched ? matched.id : defaultUserId;
  };

  // Standardize date strings to YYYY-MM-DD
  const formatToISODate = (val: any): string => {
    if (!val) return new Date().toISOString().split('T')[0];

    if (val instanceof Date) {
      return val.toISOString().split('T')[0];
    }

    if (typeof val === 'number') {
      // Excel serial date format
      const dateObj = XLSX.SSF.parse_date_code(val);
      if (dateObj) {
        const y = dateObj.y;
        const m = String(dateObj.m).padStart(2, '0');
        const d = String(dateObj.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    const str = String(val).trim();
    const parsedDate = new Date(str);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate.toISOString().split('T')[0];
    }

    return new Date().toISOString().split('T')[0];
  };

  // Process File Upload using SheetJS
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          alert('The uploaded file appears to be empty.');
          return;
        }

        // Detect column headers dynamically
        const firstRowKeys = Object.keys(jsonRows[0]);

        const findKey = (candidates: string[]) =>
          firstRowKeys.find((k) =>
            candidates.some((c) => k.toLowerCase().trim().includes(c.toLowerCase()))
          );

        const titleKey = findKey(['title', 'item', 'description', 'expense', 'details', 'particulars', 'name']) || firstRowKeys[0];
        const amountKey = findKey(['amount', 'cost', 'price', 'spent', 'debit', 'inr', 'val']) || firstRowKeys[1];
        const dateKey = findKey(['date', 'txn date', 'expense date', 'time']) || firstRowKeys[2];
        const categoryKey = findKey(['category', 'tag', 'type']);
        const paidByKey = findKey(['paid by', 'payer', 'user', 'person', 'member']);

        const processed: ParsedRow[] = jsonRows.map((row, idx) => {
          const title = String(row[titleKey] || '').trim();
          const rawAmt = parseFloat(String(row[amountKey] || '0').replace(/[^0-9.-]+/g, ''));
          const date = formatToISODate(row[dateKey]);
          const catStr = categoryKey ? String(row[categoryKey] || '') : undefined;
          const payerStr = paidByKey ? String(row[paidByKey] || '') : undefined;

          const matchedCatId = findMatchingCategoryId(catStr);
          const matchedUId = findMatchingUserId(payerStr);

          let isValid = true;
          let validationError = '';

          if (!title) {
            isValid = false;
            validationError = 'Missing expense title';
          } else if (isNaN(rawAmt) || rawAmt <= 0) {
            isValid = false;
            validationError = 'Invalid amount';
          }

          return {
            id: `import-row-${idx}-${Date.now()}`,
            rawTitle: title || 'Untitled Expense',
            rawAmount: isNaN(rawAmt) ? 0 : rawAmt,
            rawDate: date,
            rawCategory: catStr,
            rawPaidBy: payerStr,
            matchedCategoryId: matchedCatId,
            matchedUserId: matchedUId,
            splitType: defaultSplitType,
            selected: isValid,
            isValid,
            validationError,
          };
        });

        setParsedRows(processed);
        setStep('preview');
      } catch (err) {
        alert('Failed to parse the file. Please ensure it is a valid .xlsx, .xls, or .csv spreadsheet.');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Download Sample Excel Template
  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'Item Name': 'Grocery Shopping (Supermarket)',
        'Amount': 1450,
        'Date': '2026-08-25',
        'Category': 'Groceries',
        'Paid By': profiles[0]?.display_name || 'Rahul',
      },
      {
        'Item Name': 'BESCOM Electricity Bill',
        'Amount': 2300,
        'Date': '2026-08-24',
        'Category': 'Utilities',
        'Paid By': profiles[1]?.display_name || 'Apeksha',
      },
      {
        'Item Name': 'KFC Dinner',
        'Amount': 890,
        'Date': '2026-08-22',
        'Category': 'Dining Out',
        'Paid By': profiles[0]?.display_name || 'Rahul',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample Expenses');
    XLSX.writeFile(wb, 'HomeAudit_Sample_Expense_Import_Template.xlsx');
  };

  // Bulk Apply Default User to All Rows
  const handleApplyDefaultUser = (uId: string) => {
    setDefaultUserId(uId);
    setParsedRows((prev) => prev.map((r) => ({ ...r, matchedUserId: uId })));
  };

  // Bulk Apply Default Split Type to All Rows
  const handleApplyDefaultSplit = (st: SplitType) => {
    setDefaultSplitType(st);
    setParsedRows((prev) => prev.map((r) => ({ ...r, splitType: st })));
  };

  // Toggle Row Selection
  const toggleRowSelect = (id: string) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, selected: !r.selected } : r))
    );
  };

  // Toggle Select All
  const toggleSelectAll = () => {
    const allSelected = parsedRows.every((r) => r.selected);
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: r.isValid ? !allSelected : false })));
  };

  // Submit Selected Rows to Database
  const handleFinalImport = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected && r.isValid);
    if (selectedRows.length === 0) {
      alert('Please select at least one valid expense row to import.');
      return;
    }

    setIsImporting(true);

    const importPayload: Partial<Expense>[] = selectedRows.map((r) => ({
      title: r.rawTitle,
      amount: r.rawAmount,
      expense_date: r.rawDate,
      category_id: r.matchedCategoryId,
      user_id: r.matchedUserId,
      split_type: r.splitType,
    }));

    try {
      await onBulkSaveExpenses(importPayload);
      setIsImporting(false);
      onClose();
      setStep('upload');
      setParsedRows([]);
    } catch (err) {
      setIsImporting(false);
      alert('Failed to import expenses. Please try again.');
    }
  };

  const selectedCount = parsedRows.filter((r) => r.selected && r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-bold text-slate-100">Bulk Import Expenses</h2>
              <p className="text-xs text-slate-400">Import from Excel (.xlsx, .xls) or CSV file</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        {step === 'upload' ? (
          <div className="p-8 space-y-6 overflow-y-auto">
            {/* Drag and Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl p-10 text-center cursor-pointer transition-all group"
            >
              <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">
                Click to browse or drag & drop your Excel / CSV file
              </h3>
              <p className="text-xs text-slate-400 mb-3">Supports .xlsx, .xls, and .csv format</p>
              <span className="inline-block text-[11px] font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
                Browse File
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* Template Download Option */}
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-200">Need a pre-formatted template?</div>
                <div className="text-[11px] text-slate-400">Download our sample Excel template to quickly fill your transactions.</div>
              </div>
              <button
                type="button"
                onClick={handleDownloadSampleTemplate}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Template (.xlsx)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4 overflow-y-auto flex-1 flex flex-col min-h-0">
            {/* Controls Bar: Batch Payer & Batch Split Type */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4 shrink-0">
              {/* Default Paid By */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Default Paid By (Applies to all)
                </label>
                <select
                  value={defaultUserId}
                  onChange={(e) => handleApplyDefaultUser(e.target.value)}
                  className="w-full bg-slate-900 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:outline-none"
                >
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.display_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Default Split Type */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Default Split Type (Applies to all)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'SHARED_50_50', label: '50/50 Shared' },
                    { id: 'INDIVIDUAL_PAID_BY_ME', label: 'Personal' },
                    { id: 'INDIVIDUAL_PAID_FOR_OTHER', label: 'For Partner' },
                  ].map((st) => (
                    <button
                      type="button"
                      key={st.id}
                      onClick={() => handleApplyDefaultSplit(st.id as SplitType)}
                      className={`px-2 py-1 text-[10px] font-semibold rounded-lg border transition-all truncate ${
                        defaultSplitType === st.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Parsed Rows Table */}
            <div className="flex-1 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950/50">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 sticky top-0 border-b border-slate-800 text-slate-400 font-semibold text-[11px]">
                  <tr>
                    <th className="p-2.5 w-10 text-center">
                      <button onClick={toggleSelectAll} className="hover:text-slate-200">
                        {parsedRows.every((r) => r.selected) ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>
                    </th>
                    <th className="p-2.5">Title</th>
                    <th className="p-2.5">Amount ({currencySymbol})</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Paid By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parsedRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`transition-colors ${
                        !row.isValid
                          ? 'bg-rose-950/20 text-rose-300'
                          : row.selected
                          ? 'bg-slate-800/40 text-slate-200'
                          : 'opacity-50 text-slate-400'
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          disabled={!row.isValid}
                          checked={row.selected}
                          onChange={() => toggleRowSelect(row.id)}
                          className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
                        />
                      </td>
                      <td className="p-2.5 font-medium">
                        {row.rawTitle}
                        {!row.isValid && (
                          <div className="text-[10px] text-rose-400 flex items-center gap-1 mt-0.5">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            {row.validationError}
                          </div>
                        )}
                      </td>
                      <td className="p-2.5 font-semibold">
                        {currencySymbol}
                        {row.rawAmount.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5">{row.rawDate}</td>
                      <td className="p-2.5">
                        <select
                          value={row.matchedCategoryId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParsedRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, matchedCategoryId: val } : r))
                            );
                          }}
                          className="bg-slate-800 text-slate-200 text-[11px] px-2 py-1 rounded border border-slate-700 focus:outline-none"
                        >
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={row.matchedUserId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setParsedRows((prev) =>
                              prev.map((r) => (r.id === row.id ? { ...r, matchedUserId: val } : r))
                            );
                          }}
                          className="bg-slate-800 text-slate-200 text-[11px] px-2 py-1 rounded border border-slate-700 focus:outline-none"
                        >
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.display_name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-900/80 shrink-0">
          {step === 'preview' ? (
            <>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold"
              >
                ← Back to Upload
              </button>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">
                  {selectedCount} of {parsedRows.length} selected
                </span>
                <button
                  type="button"
                  disabled={isImporting || selectedCount === 0}
                  onClick={handleFinalImport}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:brightness-110 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-1.5 transition-all active:scale-95"
                >
                  {isImporting ? (
                    'Importing...'
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Import {selectedCount} Expenses
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 font-semibold"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
