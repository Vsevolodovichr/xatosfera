import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Key,
  Mail,
  Calendar,
  Shield,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  secret_key: string | null;
  created_at: string;
  role: string;
}

export const UsersPage = () => {
  const { t } = useLanguage();
  const { user, role: currentUserRole, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    if (!user) return;

    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

      if (rolesError) throw rolesError;

      // Combine data
      const combined = profiles?.map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          ...profile,
          email: '', // We don't have access to auth.users email directly
          role: userRole?.role || 'manager',
        };
      }) || [];

      setUsers(combined);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Помилка завантаження користувачів');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    // Check permissions
    if (currentUserRole === 'top_manager' && newRole !== 'manager') {
      toast.error('Ви можете призначати тільки роль менеджера');
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole as any })
        .eq('user_id', selectedUser.id);

      if (error) throw error;

      toast.success('Роль оновлено');
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Помилка оновлення ролі');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цього користувача?')) return;

    try {
      // Note: This will cascade delete the profile and roles
      // In production, you'd typically use an admin API to delete auth users
      const { error } = await supabase.from('profiles').delete().eq('id', userId);

      if (error) throw error;

      toast.success('Користувача видалено');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Помилка видалення користувача');
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, { label: string; className: string; icon: typeof Shield }> = {
      superuser: {
        label: t('users.superuser'),
        className: 'bg-destructive/10 text-destructive border-destructive/20',
        icon: Shield,
      },
      top_manager: {
        label: t('users.topManager'),
        className: 'bg-primary/10 text-primary border-primary/20',
        icon: Shield,
      },
      manager: {
        label: t('users.manager'),
        className: 'bg-info/10 text-info border-info/20',
        icon: Shield,
      },
    };
    const variant = variants[role] || { label: role, className: '', icon: Shield };
    return (
      <Badge className={`${variant.className} border`}>
        {variant.label}
      </Badge>
    );
  };

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const canEditUser = (userRole: string) => {
    if (currentUserRole === 'superuser') return true;
    if (currentUserRole === 'top_manager' && userRole === 'manager') return true;
    return false;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
            <p className="text-muted-foreground mt-1">
              Управління користувачами системи
            </p>
          </div>
        </div>

        {/* Search */}
        <Card className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Пошук користувачів..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-card border-0 animate-pulse">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-muted" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/4" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-4">
            {filteredUsers.map((userItem, index) => (
              <Card
                key={userItem.id}
                className="shadow-card border-0 hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Avatar & Name */}
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-lg font-semibold text-primary-foreground">
                        {userItem.full_name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-foreground">
                          {userItem.full_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {getRoleBadge(userItem.role)}
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(userItem.created_at), 'd MMM yyyy', { locale: uk })}
                        </span>
                      </div>
                      {userItem.secret_key && (
                        <div className="flex items-center gap-2">
                          <Key className="h-4 w-4 text-success" />
                          <span className="text-success">Ключ активний</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {canEditUser(userItem.role) && userItem.id !== user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser(userItem);
                              setNewRole(userItem.role);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Змінити роль
                          </DropdownMenuItem>
                          {currentUserRole === 'superuser' && (
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(userItem.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t('users.delete')}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Users className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('common.noData')}</h3>
              <p className="text-muted-foreground">Користувачів не знайдено</p>
            </CardContent>
          </Card>
        )}

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Змінити роль користувача</DialogTitle>
              <DialogDescription>
                {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t('users.role')}</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUserRole === 'superuser' && (
                      <>
                        <SelectItem value="superuser">{t('users.superuser')}</SelectItem>
                        <SelectItem value="top_manager">{t('users.topManager')}</SelectItem>
                      </>
                    )}
                    <SelectItem value="manager">{t('users.manager')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleUpdateRole} className="w-full gradient-primary">
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};
