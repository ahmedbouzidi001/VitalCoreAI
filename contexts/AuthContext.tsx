import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Linking } from 'react-native';
import { getSupabaseClient } from '@/template';
import { supabase } from '@/services/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { setAnalyticsUser, trackLogin, trackSignUp, trackLogout, trackSubscriptionChecked } from '@/services/analytics';
import { cacheGet, cacheSet, cacheDelete, CacheKeys } from '@/services/offlineCache';

interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

export interface SubscriptionState {
  subscribed: boolean;
  tier: 'free' | 'premium' | 'pro';
  subscriptionEnd: string | null;
  isLoading: boolean;
  lastChecked: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  operationLoading: boolean;
  subscription: SubscriptionState;
  signUpWithPassword: (email: string, password: string, metadata?: any) => Promise<{ error: string | null; user: AuthUser | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null; user: AuthUser | null }>;
  logout: () => Promise<{ error: string | null }>;
  checkSubscription: () => Promise<void>;
  startCheckout: (plan: 'premium' | 'pro') => Promise<{ error: string | null }>;
  openCustomerPortal: () => Promise<{ error: string | null }>;
  isPremium: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SUBSCRIPTION: SubscriptionState = {
  subscribed: false,
  tier: 'free',
  subscriptionEnd: null,
  isLoading: false,
  lastChecked: null,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionState>(DEFAULT_SUBSCRIPTION);
  const supabaseClient = getSupabaseClient();

  // ── Deep Link Handler for Stripe redirect ────────────────────────────────
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      if (url.includes('subscription/success')) {
        // Re-check subscription after successful checkout
        setTimeout(() => checkSubscription(), 2000);
      }
    };
    const sub = Linking.addEventListener('url', handleDeepLink);
    return () => sub.remove();
  }, []);

  // ── Auth State ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username,
        };
        setUser(u);
        setAnalyticsUser(u.id);
        loadCachedSubscription(u.id);
        checkSubscriptionAfterDelay(u.id);
      }
      setLoading(false);
    });

    const { data: { subscription: authSub } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = {
          id: session.user.id,
          email: session.user.email || '',
          username: session.user.user_metadata?.username,
        };
        setUser(u);
        setAnalyticsUser(u.id);
      } else {
        setUser(null);
        setAnalyticsUser(null);
        setSubscription(DEFAULT_SUBSCRIPTION);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  const loadCachedSubscription = async (userId: string) => {
    const cached = await cacheGet<SubscriptionState>(CacheKeys.subscription(userId));
    if (cached) setSubscription(cached);
  };

  const checkSubscriptionAfterDelay = (userId: string) => {
    setTimeout(() => checkSubscriptionForUser(userId), 1500);
  };

  const checkSubscriptionForUser = useCallback(async (userId?: string) => {
    const uid = userId || user?.id;
    if (!uid) return;

    // Don't re-check more than once per 5 minutes
    if (subscription.lastChecked && Date.now() - subscription.lastChecked < 5 * 60 * 1000) return;

    setSubscription(prev => ({ ...prev, isLoading: true }));

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {});

      if (error) {
        let errMsg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { errMsg = await error.context?.text() || error.message; } catch { }
        }
        console.warn('[Auth] Subscription check error:', errMsg);
        setSubscription(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const newSub: SubscriptionState = {
        subscribed: data?.subscribed || false,
        tier: data?.tier || 'free',
        subscriptionEnd: data?.subscription_end || null,
        isLoading: false,
        lastChecked: Date.now(),
      };

      setSubscription(newSub);
      trackSubscriptionChecked(newSub.subscribed, newSub.tier);

      // Cache for 5 minutes
      if (uid) await cacheSet(CacheKeys.subscription(uid), newSub, 300);
    } catch (err) {
      setSubscription(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, subscription.lastChecked]);

  const checkSubscription = useCallback(async () => {
    setSubscription(prev => ({ ...prev, lastChecked: null })); // Force refresh
    await checkSubscriptionForUser();
  }, [checkSubscriptionForUser]);

  const startCheckout = useCallback(async (plan: 'premium' | 'pro'): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan },
      });

      if (error) {
        let errMsg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { errMsg = await error.context?.text() || error.message; } catch { }
        }
        return { error: errMsg };
      }

      if (data?.already_subscribed) {
        return { error: 'Vous avez déjà un abonnement actif. Gérez-le via "Mon abonnement".' };
      }

      if (data?.url) {
        await Linking.openURL(data.url);
        return { error: null };
      }

      return { error: 'Impossible de créer la session de paiement' };
    } catch (err: any) {
      return { error: err.message || 'Erreur inattendue' };
    }
  }, []);

  const openCustomerPortal = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {});

      if (error) {
        let errMsg = error.message;
        if (error instanceof FunctionsHttpError) {
          try { errMsg = await error.context?.text() || error.message; } catch { }
        }
        return { error: errMsg };
      }

      if (data?.url) {
        await Linking.openURL(data.url);
        return { error: null };
      }

      return { error: 'Impossible d\'ouvrir le portail client' };
    } catch (err: any) {
      return { error: err.message || 'Erreur inattendue' };
    }
  }, []);

  const isPremium = useCallback(() => {
    return subscription.subscribed && (subscription.tier === 'premium' || subscription.tier === 'pro');
  }, [subscription]);

  const signUpWithPassword = async (email: string, password: string, metadata?: any) => {
    setOperationLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signUp({ email, password, options: { data: metadata } });
      if (error) return { error: error.message, user: null };
      const u = data.user ? { id: data.user.id, email: data.user.email || '', username: metadata?.username } : null;
      if (u) {
        setAnalyticsUser(u.id);
        trackSignUp();
      }
      return { error: null, user: u };
    } finally {
      setOperationLoading(false);
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    setOperationLoading(true);
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message, user: null };
      const u = data.user ? { id: data.user.id, email: data.user.email || '' } : null;
      if (u) {
        setAnalyticsUser(u.id);
        trackLogin('password');
        checkSubscriptionAfterDelay(u.id);
      }
      return { error: null, user: u };
    } finally {
      setOperationLoading(false);
    }
  };

  const logout = async () => {
    setOperationLoading(true);
    try {
      trackLogout();
      setAnalyticsUser(null);
      if (user) await cacheDelete(CacheKeys.subscription(user.id));
      const { error } = await supabaseClient.auth.signOut();
      setSubscription(DEFAULT_SUBSCRIPTION);
      return { error: error?.message || null };
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user, loading, operationLoading, subscription,
      signUpWithPassword, signInWithPassword, logout,
      checkSubscription, startCheckout, openCustomerPortal, isPremium,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
