'use client';

import React, { useState } from 'react';
import { Category } from '@/types';
import { X, Plus, Check, Tag, ShoppingCart, Zap, Home, Utensils, ShoppingBag, HeartPulse, Car, Film, User, MoreHorizontal, Sparkles, Gift, Coffee, Dumbbell, BookOpen, GraduationCap, Plane, ShieldAlert } from 'lucide-react';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onAddCategory: (category: Omit<Category, 'id'>) => void;
}

const AVAILABLE_ICONS = [
  { name: 'Tag', component: Tag },
  { name: 'ShoppingCart', component: ShoppingCart },
  { name: 'Zap', component: Zap },
  { name: 'Home', component: Home },
  { name: 'Utensils', component: Utensils },
  { name: 'Coffee', component: Coffee },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Gift', component: Gift },
  { name: 'HeartPulse', component: HeartPulse },
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'Car', component: Car },
  { name: 'Plane', component: Plane },
  { name: 'Film', component: Film },
  { name: 'BookOpen', component: BookOpen },
  { name: 'GraduationCap', component: GraduationCap },
  { name: 'User', component: User },
  { name: 'MoreHorizontal', component: MoreHorizontal },
];

const PRESET_COLORS = [
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#f97316', // Orange
  '#84cc16', // Lime
  '#64748b', // Slate
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  onAddCategory,
}) => {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Tag');
  const [isAdding, setIsAdding] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddCategory({
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon,
    });

    setName('');
    setIsAdding(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Household Categories</h2>
              <p className="text-xs text-slate-400">View or add custom expense categories</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close Category Modal"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Add Category Form Toggle */}
          {!isAdding ? (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-3 px-4 bg-slate-800/80 hover:bg-slate-800 text-indigo-400 font-semibold text-xs rounded-xl border border-dashed border-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" /> Add New Custom Category
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="bg-slate-950/60 p-4 rounded-xl border border-indigo-500/30 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Create Category
              </h3>

              {/* Name */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pet Care, Subscriptions, Gym & Fitness"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 focus:border-indigo-500 focus:outline-none text-xs"
                />
              </div>

              {/* Color Selector */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Badge Color</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      type="button"
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-7 h-7 rounded-full transition-transform flex items-center justify-center ${
                        selectedColor === color ? 'scale-110 ring-2 ring-white' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {selectedColor === color && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 font-medium">Category Icon</label>
                <div className="grid grid-cols-6 gap-2">
                  {AVAILABLE_ICONS.map((iconObj) => {
                    const IconComp = iconObj.component;
                    const isSelected = selectedIcon === iconObj.name;
                    return (
                      <button
                        type="button"
                        key={iconObj.name}
                        onClick={() => setSelectedIcon(iconObj.name)}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white ring-1 ring-indigo-400'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition-colors"
                >
                  Save Category
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* List of Existing Categories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Existing Categories ({categories.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 text-slate-200 text-xs"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                  >
                    <Tag className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium truncate">{cat.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
