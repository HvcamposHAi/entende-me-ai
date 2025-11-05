import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const AccessExpired = () => {
  const { signOut, userAccess, isAdmin, hasActiveAccess, isLoading, checkAccess } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const recheckAccess = async () => {
      const hasAccess = await checkAccess();
      if (isAdmin || hasAccess) {
        navigate('/overview', { replace: true });
      }
    };
    
    if (!isLoading) {
      recheckAccess();
    }
  }, [isLoading, checkAccess, isAdmin, navigate]);

  const expiredDate = userAccess?.access_expires_at 
    ? formatDistanceToNow(new Date(userAccess.access_expires_at), { locale: ptBR, addSuffix: true })
    : '';

  const handleTryAgain = async () => {
    setChecking(true);
    const hasAccess = await checkAccess();
    if (isAdmin || hasAccess) {
      toast({
        title: "Acesso verificado!",
        description: "Redirecionando para o dashboard...",
      });
      navigate('/overview', { replace: true });
    } else {
      toast({
        title: "Acesso ainda expirado",
        description: "Entre em contato com o administrador.",
        variant: "destructive"
      });
    }
    setChecking(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Acesso Expirado</CardTitle>
          <CardDescription>
            Seu período de teste terminou {expiredDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Para continuar usando o Dashboard Dengo, entre em contato com o administrador
            para renovar seu acesso.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Contato:</p>
            <p className="text-sm text-muted-foreground">admin@dengo.com.br</p>
          </div>
          <div className="space-y-2">
            <Button onClick={handleTryAgain} disabled={checking} className="w-full">
              {checking ? 'Verificando...' : 'Tentar novamente'}
            </Button>
            <Button onClick={signOut} variant="outline" className="w-full">
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessExpired;
