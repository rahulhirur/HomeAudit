'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Profile } from '@/types';
import { MOCK_USERS } from '@/lib/mockData';
import { createClient } from '@/lib/supabase/client';

export type CurrencyCode = 'INR' | 'USD' | 'EUR';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
};

interface AuthContextType {
  user: Profile | null;
  allProfiles: Profile[];
  isDemoMode: boolean;
  isLoading: boolean;
  currency: CurrencyCode;
  currencySymbol: string;
  setCurrency: (currency: CurrencyCode) => void;
  login: (userId: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  allProfiles: [],
  isDemoMode: true,
  isLoading: true,
  currency: 'INR',
  currencySymbol: '₹',
  setCurrency: () => {},
  login: async () => ({ success: false }),
  logout: async () => {},
});

// Accounts configured in Supabase Auth Users
const ACCOUNT_EMAILS: Record<string, { email: string; name: string }> = {
  'usr-husband-01': { email: 'rahul@homeaudit.internal', name: 'Rahul' },
  'usr-wife-02': { email: 'apeksha@homeaudit.internal', name: 'Apeksha' },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>(MOCK_USERS);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currency, setCurrencyState] = useState<CurrencyCode>('INR');

  useEffect(() => {
    const savedCurrency = localStorage.getItem('homeaudit_currency') as CurrencyCode;
    if (savedCurrency && (savedCurrency === 'INR' || savedCurrency === 'USD' || savedCurrency === 'EUR')) {
      setCurrencyState(savedCurrency);
    }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem('homeaudit_currency', c);
  };

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setIsDemoMode(true);
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsDemoMode(false);

    const getInitialUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          const acctName = session.user.email?.includes('apeksha') ? 'Apeksha' : 'Rahul';

          setUser(profile || {
            id: session.user.id,
            display_name: acctName,
            email: session.user.email || '',
            created_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        // Fallback silently
      } finally {
        setIsLoading(false);
      }
    };

    getInitialUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        const acctName = session.user.email?.includes('apeksha') ? 'Apeksha' : 'Rahul';

        setUser(profile || {
          id: session.user.id,
          display_name: acctName,
          email: session.user.email || '',
          created_at: new Date().toISOString(),
        });
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Strict Supabase Auth Sign In (No auto-registration)
  const login = async (userId: string, password?: string) => {
    if (!password || password.trim().length === 0) {
      return { success: false, error: 'Please enter your password.' };
    }

    const supabase = createClient();

    if (supabase) {
      const acct = ACCOUNT_EMAILS[userId] || { email: 'rahul@homeaudit.internal', name: 'Rahul' };

      // Strictly verify password against Supabase Auth Users
      const { data, error } = await supabase.auth.signInWithPassword({
        email: acct.email,
        password: password,
      });

      if (error) {
        return { success: false, error: 'Invalid password. Please check your password.' };
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        setUser(profile || {
          id: data.user.id,
          display_name: acct.name,
          email: acct.email,
          created_at: new Date().toISOString(),
        });

        return { success: true };
      }
    }

    // Demo Mode fallback
    const targetProfile = allProfiles.find((p) => p.id === userId) || allProfiles[0];
    setUser(targetProfile);
    return { success: true };
  };

  const logout = async () => {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        allProfiles,
        isDemoMode,
        isLoading,
        currency,
        currencySymbol: CURRENCY_SYMBOLS[currency] || '₹',
        setCurrency,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
