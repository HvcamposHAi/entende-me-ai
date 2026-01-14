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
import { fr } from 'date-fns/locale';
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
        title: "Erreur lors du chargement des utilisateurs",
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
        title: "Accès prolongé",
        description: `Accès prolongé de ${days} jours`
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "Erreur lors de la prolongation de l'accès",
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
        title: "Accès révoqué",
        description: "L'utilisateur ne pourra plus accéder au système"
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "Erreur lors de la révocation de l'accès",
        variant: "destructive"
      });
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast({
        title: "Champs obligatoires",
        description: "Veuillez remplir l'email, le mot de passe et le nom complet",
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
      if (!authData.user) throw new Error("Utilisateur non créé");

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
        title: "Utilisateur créé avec succès",
        description: `${newUser.full_name} a été enregistré avec un accès de ${newUser.access_days} jours`
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
        title: "Erreur lors de la création de l'utilisateur",
        description: error.message || "Une erreur s'est produite lors de l'enregistrement de l'utilisateur",
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
            <h1 className="text-3xl font-bold">Panneau Administratif</h1>
            <p className="text-muted-foreground">Gérez les utilisateurs et surveillez l'utilisation du système</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Nouvel Utilisateur
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Enregistrer un Nouvel Utilisateur</DialogTitle>
                <DialogDescription>
                  Remplissez les informations pour créer un nouvel utilisateur dans le système.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="full_name">Nom Complet *</Label>
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
                  <Label htmlFor="password">Mot de passe *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 6 caractères"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="company">Entreprise</Label>
                  <Input
                    id="company"
                    value={newUser.company}
                    onChange={(e) => setNewUser({ ...newUser, company: e.target.value })}
                    placeholder="Nom de l'entreprise"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="role">Profil</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: 'admin' | 'user') => setNewUser({ ...newUser, role: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Utilisateur</SelectItem>
                        <SelectItem value="admin">Administrateur</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="access_days">Jours d'Accès</Label>
                    <Select
                      value={newUser.access_days.toString()}
                      onValueChange={(value) => setNewUser({ ...newUser, access_days: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 jours</SelectItem>
                        <SelectItem value="7">7 jours</SelectItem>
                        <SelectItem value="15">15 jours</SelectItem>
                        <SelectItem value="30">30 jours</SelectItem>
                        <SelectItem value="90">90 jours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={createUser} disabled={isCreating}>
                  {isCreating ? 'Création...' : 'Créer Utilisateur'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total d'Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{users.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs Actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{activeUsers.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Accès Expirés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">{expiredUsers.length}</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gérer les Utilisateurs</CardTitle>
            <CardDescription>Visualisez et gérez l'accès de tous les utilisateurs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Input
                placeholder="Rechercher par email, nom ou entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {isLoading ? (
              <p>Chargement...</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expire dans</TableHead>
                    <TableHead>Dernier accès</TableHead>
                    <TableHead>Événements</TableHead>
                    <TableHead>Actions</TableHead>
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
                            {isExpired ? 'Expiré' : 'Actif'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.access_expires_at
                            ? formatDistanceToNow(new Date(user.access_expires_at), { locale: fr, addSuffix: true })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          {user.last_seen
                            ? formatDistanceToNow(new Date(user.last_seen), { locale: fr, addSuffix: true })
                            : 'Jamais'}
                        </TableCell>
                        <TableCell>{user.total_events}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => extendAccess(user.id, 5)}
                            >
                              +5 jours
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => revokeAccess(user.id)}>
                              Révoquer
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
