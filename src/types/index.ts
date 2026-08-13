export type SplitType = 'SHARED_50_50' | 'INDIVIDUAL_PAID_BY_ME' | 'INDIVIDUAL_PAID_FOR_OTHER';

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  title: string;
  description?: string;
  expense_date: string;
  split_type: SplitType;
  created_at?: string;
  updated_at?: string;
  // Joined fields for display
  user?: Profile;
  category?: Category;
}

export interface Budget {
  id: string;
  category_id: string;
  user_id?: string | null;
  monthly_limit: number;
  category?: Category;
}

export type Timeframe = 'monthly' | 'quarterly' | 'yearly';

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  color: string;
  totalAmount: number;
  percentage: number;
}

export interface UserAnalytics {
  userId: string;
  userName: string;
  totalSpent: number;
  sharedContribution: number;
  individualSpent: number;
}

export interface SettlementSummary {
  userA: Profile;
  userB: Profile;
  userASpentForShared: number;
  userBSpentForShared: number;
  netSettlement: number; // Positive: User B owes User A; Negative: User A owes User B
  owesUser: Profile | null;
}
