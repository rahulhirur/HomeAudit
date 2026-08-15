'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Category, Expense, SplitType } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { X, Check, ShoppingCart, Zap, Home, Utensils, ShoppingBag, HeartPulse, Car, Film, User, MoreHorizontal, Globe, History, Users, UserCheck, UserPlus } from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExpenseFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSaveExpense: (expenseData: Partial<Expense>) => void;
  editingExpense?: Expense | null;
  onOpenCategoryManager?: () => void;
  expensesHistory?: Expense[];
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

interface SuggestionItem {
  title: string;
  source: 'history' | 'wikidata';
  description?: string;
  categoryHintId?: string;
}

// Strict Safety Blocklist: Filters out explicit/adult content, pop media, fiction & non-household entities
const INAPPROPRIATE_KEYWORDS = [
  'adult', 'erotic', 'porn', 'sex', 'hentai', 'nude', 'fetish', 'playboy', 'sensual',
  'film', 'movie', 'novel', 'song', 'album', 'band', 'single', 'video game', 'fictional character',
  'episode', 'manga', 'anime', 'mythology', 'constellation', 'asteroid', 'crater'
];

// Grounded Household Keywords: Positively allows real-world products, foods, utilities, and brands
const HOUSEHOLD_GROUNDED_KEYWORDS = [
  'food', 'brand', 'product', 'drink', 'beverage', 'confectionery', 'dairy', 'snack',
  'sweet', 'utility', 'company', 'retail', 'chain', 'restaurant', 'store', 'supermarket',
  'service', 'telecom', 'transport', 'pharmacy', 'apparel', 'fuel', 'dish', 'ingredient',
  'fruit', 'vegetable', 'meat', 'bread', 'pastry', 'chocolate', 'dessert', 'household'
];

const isHouseholdRelevantAndSafe = (title: string, desc: string): boolean => {
  const fullText = `${title} ${desc}`.toLowerCase();

  // 1. Instantly reject any adult or inappropriate terms
  const isBlocked = INAPPROPRIATE_KEYWORDS.some((word) => fullText.includes(word));
  if (isBlocked) return false;

  // 2. If description exists, require positive household/commercial grounding
  if (desc && desc.trim().length > 0) {
    const isGrounded = HOUSEHOLD_GROUNDED_KEYWORDS.some((kw) => fullText.includes(kw));
    return isGrounded;
  }

  return true;
};

export const ExpenseFormModal: React.FC<ExpenseFormModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSaveExpense,
  editingExpense,
  onOpenCategoryManager,
  expensesHistory = [],
}) => {
  const { user, allProfiles, currencySymbol } = useAuth();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paidByUserId, setPaidByUserId] = useState('');
  const [splitType, setSplitType] = useState<SplitType>('SHARED_50_50');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  // Universal Autocomplete & Semantic Classifier State
  const [matchingSuggestions, setMatchingSuggestions] = useState<SuggestionItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (editingExpense) {
      setTitle(editingExpense.title);
      setAmount(editingExpense.amount.toString());
      setCategoryId(editingExpense.category_id);
      setPaidByUserId(editingExpense.user_id);
      setSplitType(editingExpense.split_type);
      setExpenseDate(editingExpense.expense_date);
      setDescription(editingExpense.description || '');
    } else {
      setTitle('');
      setAmount('');
      setCategoryId(categories[0]?.id || '');
      setPaidByUserId(user?.id || allProfiles[0]?.id || '');
      setSplitType('SHARED_50_50');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setDescription('');
    }
    setMatchingSuggestions([]);
    setShowDropdown(false);
    setSelectedIndex(null);
  }, [editingExpense, isOpen, categories, user, allProfiles]);

  // Semantic Classifier Helper: Maps a label + description string to a database category ID
  const mapSemanticDescriptionToCategoryId = (text: string): string | null => {
    const t = text.toLowerCase();

    const targetCategory = categories.find((c) => {
      const catName = c.name.toLowerCase();

      // Dining Out & Food
      if (catName.includes('din') || catName.includes('food') || catName.includes('restaurant') || catName.includes('eat')) {
        if (
          t.includes('restaurant') || t.includes('fast food') || t.includes('eatery') || t.includes('diner') ||
          t.includes('cafe') || t.includes('bakery') || t.includes('burger') || t.includes('pizza') ||
          t.includes('bistro') || t.includes('bar') || t.includes('pub') || t.includes('swiggy') || t.includes('zomato') ||
          t.includes('kfc') || t.includes('mcdonald') || t.includes('domino') || t.includes('subway') || t.includes('starbucks')
        ) return true;
      }

      // Groceries & Daily Supplies
      if (catName.includes('groc') || catName.includes('supermarket') || catName.includes('supply')) {
        if (
          t.includes('dairy') || t.includes('milk') || t.includes('curd') || t.includes('paneer') ||
          t.includes('cheese') || t.includes('fruit') || t.includes('vegetable') || t.includes('grocery') ||
          t.includes('supermarket') || t.includes('grain') || t.includes('rice') || t.includes('flour') ||
          t.includes('bread') || t.includes('snack') || t.includes('biscuit') || t.includes('beverage') ||
          t.includes('chocolate') || t.includes('confectionery') || t.includes('sweet')
        ) return true;
      }

      // Utilities & Bills
      if (catName.includes('util') || catName.includes('bill') || catName.includes('electric') || catName.includes('power')) {
        if (
          t.includes('electric') || t.includes('power') || t.includes('utility') || t.includes('water') ||
          t.includes('telecom') || t.includes('broadband') || t.includes('internet') || t.includes('gas') ||
          t.includes('lpg') || t.includes('bescom') || t.includes('airtel') || t.includes('jio') || t.includes('act')
        ) return true;
      }

      // Travel & Commute
      if (catName.includes('travel') || catName.includes('commute') || catName.includes('fuel') || catName.includes('cab')) {
        if (
          t.includes('fuel') || t.includes('petrol') || t.includes('diesel') || t.includes('toll') ||
          t.includes('fastag') || t.includes('airline') || t.includes('transport') || t.includes('transit') ||
          t.includes('taxi') || t.includes('cab') || t.includes('uber') || t.includes('ola') || t.includes('railway')
        ) return true;
      }

      // Health & Medical
      if (catName.includes('health') || catName.includes('med') || catName.includes('pharm')) {
        if (
          t.includes('pharmacy') || t.includes('drug') || t.includes('medicine') || t.includes('hospital') ||
          t.includes('medical') || t.includes('doctor') || t.includes('clinic') || t.includes('healthcare')
        ) return true;
      }

      // Shopping & Apparel
      if (catName.includes('shop') || catName.includes('apparel') || catName.includes('cloth')) {
        if (
          t.includes('retailer') || t.includes('clothing') || t.includes('apparel') || t.includes('fashion') ||
          t.includes('e-commerce') || t.includes('store') || t.includes('amazon') || t.includes('flipkart')
        ) return true;
      }

      // Entertainment & Subscriptions
      if (catName.includes('entert') || catName.includes('subscr') || catName.includes('movie')) {
        if (
          t.includes('streaming') || t.includes('television') || t.includes('music') || t.includes('film') ||
          t.includes('cinema') || t.includes('netflix') || t.includes('spotify') || t.includes('prime')
        ) return true;
      }

      // Housing & Rent
      if (catName.includes('house') || catName.includes('rent') || catName.includes('maint')) {
        if (
          t.includes('apartment') || t.includes('housing') || t.includes('real estate') || t.includes('rent') ||
          t.includes('residential') || t.includes('maintenance') || t.includes('maid')
        ) return true;
      }

      return false;
    });

    return targetCategory ? targetCategory.id : null;
  };

  // Non-Intrusive Title Change Handler: Never overrides category or types ghost text automatically
  const handleTitleChange = (val: string) => {
    setTitle(val);
    setSelectedIndex(null);

    // Require minimum 3 characters before showing suggestions to avoid noise
    if (val.trim().length < 3) {
      setMatchingSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const query = val.trim().toLowerCase();

    // 1. Check Saved Expense History (Always safe and user-verified)
    const historyMatches: SuggestionItem[] = Array.from(
      new Set(expensesHistory.map((e) => e.title))
    )
      .filter((t) => t.toLowerCase().includes(query))
      .map((t) => {
        const histExp = expensesHistory.find((e) => e.title === t);
        return {
          title: t,
          source: 'history' as const,
          categoryHintId: histExp?.category_id,
        };
      });

    setMatchingSuggestions(historyMatches);
    setShowDropdown(historyMatches.length > 0);

    // 2. Fetch Wikidata Live Grounded & Filtered Entity Search (Debounced & Non-Intrusive)
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
            val
          )}&language=en&limit=8&format=json&origin=*`
        );

        if (res.ok) {
          const data = await res.json();
          const searchResults: Array<{ label: string; description?: string }> = data.search || [];

          // Filter out adult/inappropriate entities & non-household items
          const safeSemanticItems: SuggestionItem[] = searchResults
            .filter((item) => isHouseholdRelevantAndSafe(item.label, item.description || ''))
            .map((item) => {
              const desc = item.description || '';
              const matchedCatId = mapSemanticDescriptionToCategoryId(`${item.label} ${desc}`);
              return {
                title: item.label,
                source: 'wikidata' as const,
                description: desc,
                categoryHintId: matchedCatId || undefined,
              };
            })
            .slice(0, 5);

          const combined = [
            ...historyMatches,
            ...safeSemanticItems.filter(
              (s) => !historyMatches.some((h) => h.title.toLowerCase() === s.title.toLowerCase())
            ),
          ];

          setMatchingSuggestions(combined);
          setShowDropdown(combined.length > 0);
        }
      } catch (err) {
        // Fallback to history silently
      }
    }, 300);
  };

  // Only auto-assign category when the user EXPLICITLY selects a suggestion card!
  const selectSuggestion = (item: SuggestionItem) => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setTitle(item.title);
    setShowDropdown(false);
    setMatchingSuggestions([]);
    setSelectedIndex(null);

    if (item.categoryHintId) {
      setCategoryId(item.categoryHintId);
    } else {
      const catId = mapSemanticDescriptionToCategoryId(`${item.title} ${item.description || ''}`);
      if (catId) {
        setCategoryId(catId);
      }
    }
  };

  // Keyboard Navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && showDropdown) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev === null ? 0 : (prev + 1) % matchingSuggestions.length));
    } else if (e.key === 'ArrowUp' && showDropdown) {
      e.preventDefault();
      setSelectedIndex((prev) => (prev === null || prev === 0 ? matchingSuggestions.length - 1 : prev - 1));
    } else if (e.key === 'Enter' && selectedIndex !== null && matchingSuggestions[selectedIndex]) {
      e.preventDefault();
      selectSuggestion(matchingSuggestions[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setShowDropdown(false);
    setMatchingSuggestions([]);

    if (!title.trim() || !amount || parseFloat(amount) <= 0) {
      return;
    }

    const activeCatId = categoryId || categories[0]?.id;

    onSaveExpense({
      id: editingExpense ? editingExpense.id : undefined,
      title: title.trim(),
      amount: parseFloat(amount),
      category_id: activeCatId,
      user_id: paidByUserId || user?.id || allProfiles[0]?.id,
      split_type: splitType,
      expense_date: expenseDate,
      description: description.trim() || undefined,
    });

    if (!editingExpense) {
      try {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {
        // ignore fallback
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <h2 className="text-lg font-bold text-slate-100">
            {editingExpense ? 'Edit Expense' : 'Add New Expense'}
          </h2>
          <button
            onClick={() => {
              setShowDropdown(false);
              onClose();
            }}
            aria-label="Close Modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-slate-800/80 text-white pl-8 pr-4 py-2.5 text-sm font-semibold rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Title Input with Non-Intrusive Grounded Autocomplete */}
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Expense Title
              </label>
            </div>

            {/* Input Field */}
            <input
              ref={inputRef}
              type="text"
              required
              placeholder="e.g. KFC, Paneer, BESCOM, Fastag, Netflix"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onFocus={() => title.trim().length >= 3 && matchingSuggestions.length > 0 && setShowDropdown(true)}
              className="w-full bg-slate-800/80 text-white px-4 py-2.5 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none text-sm transition-colors"
            />

            {/* Non-Intrusive Grounded Dropdown Panel */}
            {showDropdown && matchingSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800 animate-fade-in max-h-56 overflow-y-auto">
                {matchingSuggestions.map((item, idx) => (
                  <button
                    type="button"
                    key={`${item.source}-${item.title}-${idx}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(item);
                    }}
                    className={`w-full px-4 py-2.5 text-left text-xs flex items-center justify-between transition-colors ${
                      idx === selectedIndex ? 'bg-indigo-600/30 text-indigo-200 font-semibold' : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      {item.source === 'history' ? (
                        <History className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <div className="font-semibold text-slate-200 truncate">{item.title}</div>
                        {item.description && (
                          <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                        )}
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-400 uppercase font-semibold tracking-wider shrink-0 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                      {item.source === 'history' ? 'Past Expense' : 'Wikidata Verified'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Category
              </label>
              {onOpenCategoryManager && (
                <button
                  type="button"
                  onClick={onOpenCategoryManager}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                >
                  + Add Category
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map((cat) => {
                const IconComponent = ICON_MAP[cat.icon] || MoreHorizontal;
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    type="button"
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium border transition-all text-left ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500 shadow-sm'
                        : 'bg-slate-800/50 text-slate-400 border-slate-700/60 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <div
                      className="w-5 h-5 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, color: cat.color }}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Paid By User & Date Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Paid By */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Paid By
              </label>
              <select
                value={paidByUserId}
                onChange={(e) => setPaidByUserId(e.target.value)}
                className="w-full bg-slate-800/80 text-white px-3 py-2 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none text-xs"
              >
                {allProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Date
              </label>
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full bg-slate-800/80 text-white px-3 py-2 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none text-xs"
              />
            </div>
          </div>

          {/* Sleek Horizontal 1-Row Expense Split Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Expense Allocation / Split
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  id: 'SHARED_50_50',
                  label: '50/50 Shared',
                  sub: 'Equal split',
                  icon: Users,
                },
                {
                  id: 'INDIVIDUAL_PAID_BY_ME',
                  label: 'Personal',
                  sub: 'Paid for me',
                  icon: UserCheck,
                },
                {
                  id: 'INDIVIDUAL_PAID_FOR_OTHER',
                  label: 'For Partner',
                  sub: 'Full owe back',
                  icon: UserPlus,
                },
              ].map((st) => {
                const StIcon = st.icon;
                const isSelected = splitType === st.id;
                return (
                  <button
                    type="button"
                    key={st.id}
                    onClick={() => setSplitType(st.id as SplitType)}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-sm'
                        : 'bg-slate-800/50 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                    }`}
                  >
                    <StIcon className={`w-3.5 h-3.5 mb-1 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span className="block text-xs font-bold leading-tight truncate">{st.label}</span>
                    <span className="block text-[10px] text-slate-400 mt-0.5 truncate">{st.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-emerald-500 hover:brightness-110 text-white font-semibold rounded-xl shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2 text-sm"
            >
              <Check className="w-4 h-4" />
              {editingExpense ? 'Save Changes' : 'Record Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
