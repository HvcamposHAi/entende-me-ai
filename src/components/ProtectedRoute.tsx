import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { user, isAdmin, hasActiveAccess, isLoading } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user && !hasActiveAccess) {
      toast({
        title: "Acesso expirado",
        description: "Seu período de teste terminou. Entre em contato para renovar.",
        variant: "destructive"
      });
    }
  }, [isLoading, user, hasActiveAccess]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!hasActiveAccess && !isAdmin) {
    return <Navigate to="/access-expired" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/overview" replace />;
  }

  return <>{children}</>;
};
