import { createContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../supabaseClient";

interface AuthContextType {
  user: any;
  loading: boolean;
  signIn: (credentials: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: () => boolean;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user != null && !isAdmin()) {
      setUser(null);
      signOut();
      setError("You are not authorized to access this page");
    }
  }, [user]);

  const signIn = async ({ email, password }: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    setLoading(false);
    
    if (error) {
      setError(error.message);
    } else if (data.user) {
      // Check if the newly signed-in user is admin
      const isUserAdmin = data.user.user_metadata?.is_admin ?? false;
      if (!isUserAdmin) {
        // If user is not admin, sign them out immediately
        await signOut();
        setError("You are not authorized to access this page");
      }
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setError(null);
  };

  const isAdmin = () => {
    return user?.user_metadata?.is_admin ?? false;
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signOut,
    isAdmin,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 