-- ========================================================
-- Household Expense Tracker: Supabase PostgreSQL Schema
-- ========================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (User Accounts: Husband & Wife)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS: All authenticated household members can read profiles
CREATE POLICY "Allow read profiles for authenticated users" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- Profiles RLS: Users can update their own profile
CREATE POLICY "Allow user update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#6366f1',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read categories for authenticated users" 
ON public.categories FOR SELECT 
TO authenticated 
USING (true);

-- Insert Default Household Categories
INSERT INTO public.categories (name, icon, color) VALUES
('Groceries & Supplies', 'ShoppingCart', '#10b981'),
('Utilities & Bills', 'Zap', '#f59e0b'),
('Housing & Rent', 'Home', '#3b82f6'),
('Dining Out & Swiggy/Zomato', 'Utensils', '#ef4444'),
('Shopping & Apparel', 'ShoppingBag', '#ec4899'),
('Health & Medical', 'HeartPulse', '#8b5cf6'),
('Travel & Commute', 'Car', '#06b6d4'),
('Entertainment & Subscriptions', 'Film', '#6366f1'),
('Personal Expenses', 'User', '#14b8a6'),
('Miscellaneous', 'MoreHorizontal', '#64748b')
ON CONFLICT (name) DO NOTHING;

-- 3. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    title TEXT NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    split_type TEXT NOT NULL CHECK (split_type IN ('SHARED_50_50', 'INDIVIDUAL_PAID_BY_ME', 'INDIVIDUAL_PAID_FOR_OTHER')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast analytics querying
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);

-- Enable RLS on expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Household members can read all shared household expenses
CREATE POLICY "Allow household read expenses" 
ON public.expenses FOR SELECT 
TO authenticated 
USING (true);

-- Household members can insert expenses
CREATE POLICY "Allow household insert expenses" 
ON public.expenses FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Users can update or delete expenses
CREATE POLICY "Allow household update expenses" 
ON public.expenses FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Allow household delete expenses" 
ON public.expenses FOR DELETE 
TO authenticated 
USING (true);

-- 4. BUDGETS TABLE
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES public.categories(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL means household-wide budget
    monthly_limit DECIMAL(12, 2) NOT NULL CHECK (monthly_limit > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(category_id, user_id)
);

-- Enable RLS on budgets
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow household read budgets" 
ON public.budgets FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow household insert/update budgets" 
ON public.budgets FOR ALL 
TO authenticated 
USING (true);

-- Automatically update profiles on Auth Sign Up trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger definition
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
