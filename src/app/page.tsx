'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { Header } from '@/components/layout/Header';
import { Navigation, TabType } from '@/components/layout/Navigation';
import { MinimalistHome } from '@/components/home/MinimalistHome';
import { AnalyticsDashboard } from '@/components/analytics/AnalyticsDashboard';
import { ExpenseList } from '@/components/expenses/ExpenseList';
import { ExpenseFormModal } from '@/components/expenses/ExpenseFormModal';
import { CategoryManagerModal } from '@/components/categories/CategoryManagerModal';
import { SettlementCard } from '@/components/settlement/SettlementCard';
import { InstallPwaPrompt } from '@/components/pwa/InstallPwaPrompt';

import { MOCK_CATEGORIES, MOCK_EXPENSES, MOCK_USERS } from '@/lib/mockData';
import { Category, Expense } from '@/types';

export default function Home() {
  const { user, allProfiles, isLoading } = useAuth();
  
  // Default to minimalist Home landing page
  const [activeTab, setActiveTab] = useState<TabType>('home');

  const [expenses, setExpenses] = useState<Expense[]>(MOCK_EXPENSES);
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const profiles = allProfiles.length > 0 ? allProfiles : MOCK_USERS;

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // If loading auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-xs font-semibold">
        Loading HomeAudit...
      </div>
    );
  }

  // If user is not authenticated, render protected Login Screen
  if (!user) {
    return <LoginPage />;
  }

  // Add Custom Category Handler
  const handleAddCategory = (newCat: Omit<Category, 'id'>) => {
    const created: Category = {
      id: `cat-${Date.now()}`,
      ...newCat,
    };
    setCategories((prev) => [...prev, created]);
  };

  // CRUD Expense Operations
  const handleSaveExpense = (expenseData: Partial<Expense>) => {
    if (expenseData.id) {
      setExpenses((prev) =>
        prev.map((e) =>
          e.id === expenseData.id
            ? { ...e, ...expenseData } as Expense
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

  const handleDeleteExpense = (expenseId: string) => {
    if (confirm('Are you sure you want to delete this expense entry?')) {
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    }
  };

  const handleEditClick = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddModalOpen(true);
  };

  const handleSettleAll = () => {
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
        {/* Tab 1: Minimalist Home (Hero Spend + Separate Add Button + Recent Feed + Calendar Heatmap below) */}
        {activeTab === 'home' && (
          <MinimalistHome
            expenses={expenses}
            profiles={profiles}
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
            profiles={profiles}
            onEditExpense={handleEditClick}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {/* Tab 3: Detailed Analytics View */}
        {activeTab === 'analytics' && (
          <AnalyticsDashboard
            expenses={expenses}
            categories={categories}
            profiles={profiles}
          />
        )}

        {/* Tab 4: Partner Settlement View */}
        {activeTab === 'settlement' && (
          <SettlementCard
            expenses={expenses}
            profiles={profiles}
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

      {/* Mobile PWA Home Screen Install Banner */}
      <InstallPwaPrompt />
    </div>
  );
}
