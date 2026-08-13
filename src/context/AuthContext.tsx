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

// Demo password map for independent accounts
const DEMO_PASSWORDS: Record<string, string> = {
  'usr-husband-01': 'rahul123',
  'usr-wife-02': 'apeksha123',
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>(MOCK_USERS);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currency, setCurrencyState] = useState<CurrencyCode>('INR');

  useEffect(() => {
    // Load persisted currency setting from localStorage if available
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

          if (profile) {
            setUser(profile);
          }
        }
      } catch (error) {
        // demo fallback
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

        setUser(profile || null);
      } else {
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (userId: string, password?: string) => {
    const targetProfile = allProfiles.find((p) => p.id === userId);
    if (!targetProfile) {
      return { success: false, error: 'User account not found' };
    }

    const expectedPassword = DEMO_PASSWORDS[userId];
    if (expectedPassword && password !== expectedPassword) {
      return { success: false, error: 'Incorrect password for selected user.' };
    }

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
