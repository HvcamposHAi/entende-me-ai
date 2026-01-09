import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTracking } from '@/hooks/useTracking';
import { UserPlus } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserData {
  id: string;
  email: string;
  full_name: string;
  company: string;
  access_expires_at: string;
  is_active: boolean;
  last_seen: string;
  total_events: number;
  role: 'admin' | 'user';
}

const Admin = () => {
  useTracking();
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    company: '',
    role: 'user' as 'admin' | 'user',
    access_days: 5
  });
  const { toast } = useToast();

  const fetchUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, company');

      if (!profiles) return;

      const usersData = await Promise.all(
        profiles.map(async (profile) => {
          const [accessRes, roleRes, trackingRes] = await Promise.all([
            supabase.from('user_access').select('*').eq('user_id', profile.id).single(),
            supabase.from('user_roles').select('role').eq('user_id', profile.id).single(),
            supabase.from('usage_tracking')
              .select('created_at')
              .eq('user_id', profile.id)
              .order('created_at', { ascending: false })
              .limit(1)
          ]);

          const { count } = await supabase
            .from('usage_tracking')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id);

          return {
            ...profile,
            access_expires_at: accessRes.data?.access_expires_at || '',
            is_active: accessRes.data?.is_active || false,
            last_seen: trackingRes.data?.[0]?.created_at || '',
            total_events: count || 0,
            role: roleRes.data?.role || 'user'
          };
        })
      );

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Erro ao carregar usuários",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const extendAccess = async (userId: string, days: number) => {
    try {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + days);

      const { error } = await supabase
        .from('user_access')
        .update({
          access_expires_at: newExpiry.toISOString(),
          is_active: true
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Acesso estendido",
        description: `Acesso estendido por ${days} dias`
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "Erro ao estender acesso",
        variant: "destructive"
      });
    }
  };

  const revokeAccess = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('user_access')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Acesso revogado",
        description: "O usuário não poderá mais acessar o sistema"
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "Erro ao revogar acesso",
        variant: "destructive"
      });
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha email, senha e nome completo",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      // 1. Criar usuário via Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            company: newUser.company
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não criado");

      const userId = authData.user.id;

      // 2. Criar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: newUser.email,
          full_name: newUser.full_name,
          company: newUser.company
        });

      if (profileError) console.error('Profile error:', profileError);

      // 3. Criar acesso com período definido
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + newUser.access_days);

      const { error: accessError } = await supabase
        .from('user_access')
        .insert({
          user_id: userId,
          is_active: true,
          access_expires_at: expiresAt.toISOString()
        });

      if (accessError) console.error('Access error:', accessError);

      // 4. Definir role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: newUser.role
        });

      if (roleError) console.error('Role error:', roleError);

      toast({
        title: "Usuário criado com sucesso",
        description: `${newUser.full_name} foi cadastrado com acesso de ${newUser.access_days} dias`
      });

      // Reset form and close dialog
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        company: '',
        role: 'user',
        access_days: 5
      });
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Create user error:', error);
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro ao cadastrar o usuário",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.company?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeUsers = users.filter(u => u.is_active && new Date(u.access_expires_at) > new Date());
  const expiredUsers = users.filter(u => !u.is_active || new Date(u.access_expires_at) <= new Date());

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">Gerencie usuários e monitore uso do sistema</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo usuário no sistema.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={newUser.full_name}
                    onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="João Silva"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="joao@empresa.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Senha *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Empresa</Label>
                  <Input
                    id="company"
                    value={newUser.company}
                    onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
                    placeholder="Nome da empresa"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="role">Perfil</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: 'admin' | 'user') => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Usuário</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="access_days">Dias de Acesso</Label>
                    <Select
                      value={newUser.access_days.toString()}
                      onValueChange={(value) => setNewUser({ ...newUser, access_days: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 dias</SelectItem>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                        <SelectItem value="90">90 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={createUser} disabled={isCreating}>
                  {isCreating ? 'Criando...' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Usuários Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{activeUsers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Acessos Expirados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{expiredUsers.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gerenciar Usuários</CardTitle>
            <CardDescription>Visualize e gerencie o acesso de todos os usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Buscar por email, nome ou empresa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isLoading ? (
              <p>Carregando...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead>Eventos</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const isExpired = !user.is_active || new Date(user.access_expires_at) <= new Date();
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                            {user.role === 'admin' && (
                              <Badge variant="secondary" className="mt-1">Admin</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{user.company || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={isExpired ? "destructive" : "default"}>
                            {isExpired ? 'Expirado' : 'Ativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.access_expires_at
                            ? formatDistanceToNow(new Date(user.access_expires_at), { locale: ptBR, addSuffix: true })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {user.last_seen
                            ? formatDistanceToNow(new Date(user.last_seen), { locale: ptBR, addSuffix: true })
                            : 'Nunca'}
                        </TableCell>
                        <TableCell>{user.total_events}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => extendAccess(user.id, 5)}
                            >
                              +5 dias
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => revokeAccess(user.id)}
                            >
                              Revogar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Admin;
