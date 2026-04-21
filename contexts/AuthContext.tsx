import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getSupabaseClient } from '@/template';

interface AuthUser {
  id: string;
  email: string;
  username?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  operationLoading: boolean;
  signUpWithPassword: (email: string, password: string, metadata?: any) => Promise<{ error: string | null; user: AuthUser | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null; user: AuthUser | null }>;
  logout: () => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const supabase = getSupabaseClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '', username: session.user.user_metadata?.username });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email || '', username: session.user.user_metadata?.username });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpWithPassword = async (email: string, password: string, metadata?: any) => {
    setOperationLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: metadata } });
      if (error) return { error: error.message, user: null };
      const u = data.user ? { id: data.user.id, email: data.user.email || '', username: metadata?.username } : null;
      return { error: null, user: u };
    } finally {
      setOperationLoading(false);
    }
  };

  const signInWithPassword = async (email: string, password: string) => {
    setOperationLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message, user: null };
      const u = data.user ? { id: data.user.id, email: data.user.email || '' } : null;
      return { error: null, user: u };
    } finally {
      setOperationLoading(false);
    }
  };

  const logout = async () => {
    setOperationLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error?.message || null };
    } finally {
      setOperationLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, operationLoading, signUpWithPassword, signInWithPassword, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
