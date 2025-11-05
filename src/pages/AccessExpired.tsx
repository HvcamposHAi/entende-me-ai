import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const AccessExpired = () => {
  const { signOut, userAccess } = useAuth();

  const expiredDate = userAccess?.access_expires_at 
    ? formatDistanceToNow(new Date(userAccess.access_expires_at), { locale: ptBR, addSuffix: true })
    : '';

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
          <Button onClick={signOut} variant="outline" className="w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccessExpired;
