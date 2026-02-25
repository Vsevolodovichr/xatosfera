import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import pb from '@/integrations/pocketbase/client'; // Імпорт PocketBase клієнта
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { UserPlus, Mail, Lock, User } from 'lucide-react';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserCreated: () => void;
  canCreateTopManager: boolean;
}

export const CreateUserDialog = ({
  open,
  onOpenChange,
  onUserCreated,
  canCreateTopManager,
}: CreateUserDialogProps) => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('manager');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!email || !password || !fullName) {
      toast.error(t('users.fillAllFields'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        full_name: fullName,
        role,
      });

      toast.success(t('users.success_create'));

      setEmail('');
      setPassword('');
      setFullName('');
      setRole('manager');

      onOpenChange(false);
      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errMsg = error?.data?.message || error?.message || t('users.error_create');
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t('users.add')}
          </DialogTitle>
          <DialogDescription>
            {t('users.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('auth.fullName')}
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t('users.fullNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              {t('auth.email')}
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              {t('auth.password')}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('users.passwordHint')}
            />
          </div>

          {/* Роль */}
          <div className="space-y-2">
            <Label>{t('users.role')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">{t('users.manager')}</SelectItem>
                {canCreateTopManager && (
                  <SelectItem value="top_manager">{t('users.topManager')}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCreate}
            className="w-full gradient-primary"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};v className="space-y-2">
            <Label>{t('users.role')}</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">{t('users.manager')}</SelectItem>
                {canCreateTopManager && (
                  <SelectItem value="top_manager">{t('users.topManager')}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleCreate}
            className="w-full gradient-primary"
            disabled={loading}
          >
            {loading ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};