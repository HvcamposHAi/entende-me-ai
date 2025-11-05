import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface UserAccess {
  access_expires_at: string;
  is_active: boolean;
}

interface UserRole {
  role: 'admin' | 'user';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userAccess: UserAccess | null;
  userRole: UserRole | null;
  isAdmin: boolean;
  isLoading: boolean;
  hasActiveAccess: boolean;
  signUp: (email: string, password: string, fullName: string, company?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  checkAccess: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  const isAdmin = userRole?.role === 'admin';
  const hasActiveAccess = userAccess?.is_active && 
    new Date(userAccess.access_expires_at) > new Date();

  const fetchUserData = async (userId: string) => {
    try {
      const [accessRes, roleRes] = await Promise.all([
        supabase.from('user_access').select('*').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).single()
      ]);

      if (accessRes.data) setUserAccess(accessRes.data);
      if (roleRes.data) setUserRole(roleRes.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserData(session.user.id);
          }, 0);
        } else {
          setUserAccess(null);
          setUserRole(null);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, fullName: string, company?: string) => {
    const redirectUrl = `${window.location.origin}/overview`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          company: company || ''
        }
      }
    });

    if (!error) {
      toast({
        title: "Cadastro realizado!",
        description: "Você receberá acesso por 5 dias.",
      });
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const checkAccess = async (): Promise<boolean> => {
    if (!user) return false;
    
    const { data } = await supabase
      .from('user_access')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setUserAccess(data);
      return data.is_active && new Date(data.access_expires_at) > new Date();
    }
    
    return false;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userAccess,
      userRole,
      isAdmin,
      isLoading,
      hasActiveAccess,
      signUp,
      signIn,
      signOut,
      checkAccess
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
