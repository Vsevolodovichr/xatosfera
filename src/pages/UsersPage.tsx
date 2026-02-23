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
import pb from '@/integrations/pocketbase/client'; // Імпорт PocketBase клієнта
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
      // Отримання всіх користувачів з колекції 'users' (вибірка полів для безпеки)
      const userRecords = await pb.collection('users').getFullList({
        sort: '-created',
        fields: 'id, full_name, email, created, role, approved, approved_at, approved_by, phone, avatar_url',
      });

      const combined = userRecords.map((record: any) => ({
        id: record.id,
        full_name: record.full_name,
        email: record.email,
        created_at: record.created,
        role: record.role || 'manager',
        approved: record.approved ?? false,
        approved_at: record.approved_at,
      }));

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
      await pb.collection('users').update(userId, {
        approved: true,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      });

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
      await pb.collection('users').update(selectedUser.id, { role: newRole });

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
      await pb.collection('users').delete(userId);

      toast.success('Користувача видалено');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Помилка видалення користувача');
    }
  };

  const canEditUser = (userRole: string) => {
    if (currentUserRole === 'superuser') return true;
    if (currentUserRole === 'top_manager') return userRole === 'manager';
    return false;
  };

  const filteredUsers = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('users.title')}</h1>
              <p className="text-muted-foreground">
                {language === 'uk' ? 'Керування користувачами системи' : 'Manage system users'}
              </p>
            </div>
          </div>
          {hasPermission('manage_users') && (
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="gradient-primary text-primary-foreground"
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
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'uk' ? 'Пошук користувачів...' : 'Search users...'}
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Users List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredUsers.map((userItem) => (
              <Card key={userItem.id} className="shadow-card border-0 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={userItem.approved ? 'default' : 'secondary'}>
                        {userItem.approved
                          ? language === 'uk' ? 'Підтверджено' : 'Approved'
                          : language === 'uk' ? 'Очікує' : 'Pending'}
                      </Badge>
                    </div>
                    <Badge
                      variant={
                        userItem.role === 'superuser'
                          ? 'destructive'
                          : userItem.role === 'top_manager'
                          ? 'secondary'
                          : 'default'
                      }
                    >
                      {t(`users.${userItem.role}`)}
                    </Badge>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{userItem.full_name}</h3>
                      <p className="text-sm text-muted-foreground">{userItem.email}</p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(userItem.created_at), 'dd MMMM yyyy', {
                        locale: language === 'uk' ? uk : undefined,
                      })}
                    </div>

                    {userItem.approved_at && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-success" />
                        {language === 'uk' ? 'Підтверджено' : 'Approved'}{' '}
                        {format(new Date(userItem.approved_at), 'dd.MM.yyyy HH:mm')}
                      </div>
                    )}

                    {!userItem.approved && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 text-warning" />
                        {language === 'uk' ? 'Очікує підтвердження' : 'Pending approval'}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="p-4 border-t flex justify-end">
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
                    {!userItem.approved && canEditUser(userItem.role) && userItem.id !== user?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApproveUser(userItem.id)}
                        className="text-success border-success/30 hover:bg-success/10 ml-2"
                      >
                        <UserCheck className="w-4 h-4 mr-1" />
                        {language === 'uk' ? 'Підтвердити' : 'Approve'}
                      </Button>
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