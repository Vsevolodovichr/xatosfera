import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateSafeFilename, ALLOWED_IMAGE_TYPES, ALLOWED_IMAGE_EXTENSIONS, MAX_FILE_SIZE } from '@/lib/file-validation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Phone, Moon, Sun, Camera, Loader2 } from 'lucide-react';

interface ProfileSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileSettingsDialog = ({ open, onOpenChange }: ProfileSettingsDialogProps) => {
  const { t } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarPath, setAvatarPath] = useState(''); // Store path, not URL
  const [avatarSignedUrl, setAvatarSignedUrl] = useState(''); // Signed URL for display
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Function to get signed URL for avatar
  const getSignedAvatarUrl = useCallback(async (path: string) => {
    if (!path) {
      setAvatarSignedUrl('');
      return;
    }
    
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(path, 3600); // 1 hour expiry
      
      if (error) throw error;
      setAvatarSignedUrl(data.signedUrl);
    } catch (error) {
      console.error('Error getting signed URL:', error);
      setAvatarSignedUrl('');
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setPhone((profile as any).phone || '');
      const path = (profile as any).avatar_url || '';
      setAvatarPath(path);
      // Get signed URL for display
      if (path) {
        getSignedAvatarUrl(path);
      }
    }
  }, [profile, getSignedAvatarUrl]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Файл занадто великий. Максимум: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }

    const allowedMimeTypes = Object.keys(ALLOWED_IMAGE_TYPES);
    if (!allowedMimeTypes.includes(file.type)) {
      toast.error(`Непідтримуваний формат. Дозволені: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`);
      return;
    }

    setUploading(true);
    try {
      // Generate safe filename
      const fileName = generateSafeFilename(user.id, file.name);

      // Delete old avatar if exists
      if (avatarPath) {
        await supabase.storage.from('avatars').remove([avatarPath]);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Store path (not public URL since bucket is now private)
      setAvatarPath(fileName);
      
      // Get signed URL for display
      await getSignedAvatarUrl(fileName);
      
      toast.success('Фото завантажено');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Помилка завантаження фото');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone: phone,
          avatar_url: avatarPath || null, // Store path, not URL
        })
        .eq('id', user.id);

      if (error) throw error;

      if (refreshProfile) {
        await refreshProfile();
      }

      toast.success(t('common.success'));
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error(t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('nav.settings')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="w-24 h-24">
                {avatarSignedUrl ? (
                  <AvatarImage src={avatarSignedUrl} alt={fullName} />
                ) : (
                  <AvatarFallback className="gradient-primary text-primary-foreground text-2xl">
                    {fullName?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </Avatar>
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                {uploading ? (
                  <Loader2 className="w-4 h-4 text-primary-foreground animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-primary-foreground" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Натисніть на іконку камери для завантаження фото
            </p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('auth.fullName')}
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Телефон
            </Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380..."
            />
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              Темна тема
            </Label>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            className="w-full gradient-primary"
            disabled={saving}
          >
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
