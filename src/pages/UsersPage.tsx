import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
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
  Calendar,
  Shield,
  CheckCircle,
  Clock,
  UserCheck,
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
} from '@/components/ui/dialog';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { CreateUserDialog } from '@/components/users/CreateUserDialog';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  has_secret_key: boolean; // Only store presence, never the actual key
  created_at: string;
  role: string;
  approved: boolean;
  approved_at: string | null;
}

export const UsersPage = () => {
  const { t, language } = useLanguage();
  const { user, role: currentUserRole, hasPermission } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    if (!user) return;

    try {
      // SECURITY: Explicitly select columns, excluding secret_key to prevent exposure
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, phone, avatar_url, approved, approved_at, approved_by, updated_at');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // SECURITY: Check for secret_key presence server-side only via RPC if needed
      // For now, we simply don't expose this information to the client
      const combined = profiles?.map((profile) => {
        const userRole = roles?.find((r) => r.user_id === profile.id);
        return {
          id: profile.id,
          full_name: profile.full_name,
          email: '',
          has_secret_key: false, // This info is no longer sent to client for security
          created_at: profile.created_at,
          role: userRole?.role || 'manager',
          approved: profile.approved ?? false,
          approved_at: profile.approved_at,
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

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          approved: true,
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Користувача підтверджено');
      fetchUsers();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast.error('Помилка підтвердження');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

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
    const variants: Record<string, { label: string; className: string }> = {
      superuser: {
        label: t('users.superuser'),
        className: 'bg-destructive/10 text-destructive border-destructive/20',
      },
      top_manager: {
        label: t('users.topManager'),
        className: 'bg-primary/10 text-primary border-primary/20',
      },
      manager: {
        label: t('users.manager'),
        className: 'bg-info/10 text-info border-info/20',
      },
    };
    const variant = variants[role] || { label: role, className: '' };
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

  const canCreateUser = currentUserRole === 'superuser' || currentUserRole === 'top_manager';

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('users.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {language === 'uk' ? 'Управління користувачами системи' : 'System user management'}
            </p>
          </div>
          {canCreateUser && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gradient-primary shadow-accent"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('users.add')}
            </Button>
          )}
        </div>

        {/* Search */}
        <Card className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'uk' ? 'Пошук користувачів' : 'Search users'}
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
                          {userItem.approved ? (
                            <Badge className="bg-success/10 text-success border-success/20 border">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {language === 'uk' ? 'Підтверджено' : 'Approved'}
                            </Badge>
                          ) : (
                            <Badge className="bg-warning/10 text-warning border-warning/20 border">
                              <Clock className="w-3 h-3 mr-1" />
                              {language === 'uk' ? 'Очікує' : 'Pending'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(userItem.created_at), 'd MMM yyyy', {
                            locale: language === 'uk' ? uk : undefined,
                          })}
                        </span>
                      </div>
                      {/* Secret key status removed for security - keys are handled server-side only */}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {/* Approve button for pending users */}
                      {!userItem.approved && canEditUser(userItem.role) && userItem.id !== user?.id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveUser(userItem.id)}
                          className="text-success border-success/30 hover:bg-success/10"
                        >
                          <UserCheck className="w-4 h-4 mr-1" />
                          {language === 'uk' ? 'Підтвердити' : 'Approve'}
                        </Button>
                      )}
                      
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
                              {language === 'uk' ? 'Змінити роль' : 'Change role'}
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
              <p className="text-muted-foreground">
                {language === 'uk' ? 'Користувачів не знайдено' : 'No users found'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Edit Role Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {language === 'uk' ? 'Змінити роль користувача' : 'Change user role'}
              </DialogTitle>
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

        {/* Create User Dialog */}
        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onUserCreated={fetchUsers}
          canCreateTopManager={currentUserRole === 'superuser'}
        />
      </div>
    </AppLayout>
  );
};