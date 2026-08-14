'use client';

import React, { useState, useEffect } from 'react';
import { Expense, Category, TabType } from '@/types';
import { MOCK_EXPENSES, MOCK_CATEGORIES } from '@/lib/mockData';
import { useAuth } from '@/context/AuthContext';
import { Header } from '@/components/layout/Header';
import { Navigation } from '@/components/layout/Navigation';
import { MinimalistHome } from '@/components/home/MinimalistHome';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { SettlementCard } from '@/components/settlement/SettlementCard';
import { ExpenseFormModal } from '@/components/expenses/ExpenseFormModal';
import { CategoryManagerModal } from '@/components/categories/CategoryManagerModal';
import { LoginPage } from '@/components/auth/LoginPage';
import { createClient } from '@/lib/supabase/client';

export default function Home() {
  const { user, allProfiles, isLoading, isDemoMode } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Sync Expenses & Categories from Supabase database with Realtime WebSocket Multi-Device Listener
  useEffect(() => {
    if (isDemoMode) {
      setExpenses(MOCK_EXPENSES);
      setCategories(MOCK_CATEGORIES);
      return;
    }

    const supabase = createClient();
    if (!supabase) return;

    const fetchData = async () => {
      try {
        // 1. Fetch Categories
        const { data: dbCategories } = await supabase
          .from('categories')
          .select('*')
          .order('created_at', { ascending: true });

        if (dbCategories && dbCategories.length > 0) {
          setCategories(dbCategories);
        }

        // 2. Fetch Expenses from live Supabase table
        const { data: dbExpenses } = await supabase
          .from('expenses')
          .select('*')
          .order('expense_date', { ascending: false });

        if (dbExpenses) {
          setExpenses(dbExpenses);
        }
      } catch (err) {
        // Fallback silently
      }
    };

    fetchData();

    // 3. Supabase Realtime Multi-Device Instant Sync WebSocket
    const channel = supabase
      .channel('realtime_expenses_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isDemoMode, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-semibold">
        Loading HomeAudit...
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Add Custom Category Handler
  const handleAddCategory = async (newCat: Omit<Category, 'id'>) => {
    const supabase = createClient();

    if (supabase && !isDemoMode) {
      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: newCat.name,
          icon: newCat.icon,
          color: newCat.color,
        })
        .select()
        .single();

      if (data && !error) {
        setCategories((prev) => [...prev, data]);
        return;
      }
    }

    const created: Category = {
      id: `cat-${Date.now()}`,
      ...newCat,
    };
    setCategories((prev) => [...prev, created]);
  };

  // CRUD Expense Operations
  const handleSaveExpense = async (expenseData: Partial<Expense>) => {
    const supabase = createClient();

    if (supabase && !isDemoMode) {
      if (expenseData.id && !expenseData.id.startsWith('exp-')) {
        // Update existing expense in Supabase
        const { data, error } = await supabase
          .from('expenses')
          .update({
            title: expenseData.title,
            amount: expenseData.amount,
            category_id: expenseData.category_id,
            user_id: expenseData.user_id || user.id,
            split_type: expenseData.split_type,
            expense_date: expenseData.expense_date,
            description: expenseData.description,
            updated_at: new Date().toISOString(),
          })
          .eq('id', expenseData.id)
          .select()
          .single();

        if (data && !error) {
          setExpenses((prev) => prev.map((e) => (e.id === data.id ? data : e)));
          return;
        }
      } else {
        // Insert new expense into Supabase
        const { data, error } = await supabase
          .from('expenses')
          .insert({
            title: expenseData.title,
            amount: expenseData.amount,
            category_id: expenseData.category_id,
            user_id: expenseData.user_id || user.id,
            split_type: expenseData.split_type,
            expense_date: expenseData.expense_date,
            description: expenseData.description,
          })
          .select()
          .single();

        if (data && !error) {
          setExpenses((prev) => [data, ...prev]);
          return;
        }
      }
    }

    // Local Fallback
    if (expenseData.id) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expenseData.id
            ? ({ ...e, ...expenseData } as Expense)
            : e
        )
      );
    } else {
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        user_id: expenseData.user_id || user.id,
        category_id: expenseData.category_id!,
        amount: expenseData.amount!,
        title: expenseData.title!,
        description: expenseData.description,
        expense_date: expenseData.expense_date!,
        split_type: expenseData.split_type!,
        created_at: new Date().toISOString(),
      };

      setExpenses((prev) => [newExp, ...prev]);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense entry?')) {
      const supabase = createClient();

      if (supabase && !isDemoMode && !expenseId.startsWith('exp-')) {
        await supabase.from('expenses').delete().eq('id', expenseId);
      }

      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    }
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddModalOpen(true);
  };

  const handleSettleAll = async () => {
    const supabase = createClient();

    if (supabase && !isDemoMode) {
      const sharedIds = expenses
        .filter((e) => e.split_type === 'SHARED_50_50' || e.split_type === 'INDIVIDUAL_PAID_FOR_OTHER')
        .map((e) => e.id);

      if (sharedIds.length > 0) {
        await supabase.from('expenses').delete().in('id', sharedIds);
      }
    }

    setExpenses((prev) => prev.filter((e) => e.split_type !== 'SHARED_50_50' && e.split_type !== 'INDIVIDUAL_PAID_FOR_OTHER'));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-24 md:pb-12 selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <Header onOpenCategoryManager={() => setIsCategoryModalOpen(true)} />

      {/* Navigation */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddModal={() => {
          setEditingExpense(null);
          setIsAddModalOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* Tab 1: Minimalist Home */}
        {activeTab === 'home' && (
          <MinimalistHome
            expenses={expenses}
            profiles={allProfiles}
            onOpenAddModal={() => {
              setEditingExpense(null);
              setIsAddModalOpen(true);
            }}
            onEditExpense={handleEditClick}
          />
        )}

        {/* Tab 2: Expenses Feed View */}
        {activeTab === 'expenses' && (
          <ExpenseList
            expenses={expenses}
            categories={categories}
            profiles={allProfiles}
            onEditExpense={handleEditClick}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {/* Tab 3: Detailed Analytics View */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            expenses={expenses}
            categories={categories}
            profiles={allProfiles}
          />
        )}

        {/* Tab 4: Partner Settlement View */}
        {activeTab === 'settlement' && (
          <SettlementCard
            expenses={expenses}
            profiles={allProfiles}
            onSettleAll={handleSettleAll}
          />
        )}
      </main>

      {/* Expense Form Modal */}
      <ExpenseFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        categories={categories}
        onSaveExpense={handleSaveExpense}
        editingExpense={editingExpense}
        expensesHistory={expenses}
        onOpenCategoryManager={() => {
          setIsAddModalOpen(false);
          setIsCategoryModalOpen(true);
        }}
      />

      {/* Custom Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        onAddCategory={handleAddCategory}
      />
    </div>
  );
}
