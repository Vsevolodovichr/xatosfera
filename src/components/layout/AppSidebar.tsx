import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ProfileSettingsDialog } from '@/components/profile/ProfileSettingsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  CalendarDays,
  FolderOpen,
  Home,
  KanbanSquare,
  Contact,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import pb from '@/integrations/pocketbase/client';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard', permission: null },
  { key: 'properties', icon: Building2, path: '/properties', permission: null },
  { key: 'clients', icon: Contact, path: '/clients', permission: null },
  { key: 'deals', icon: KanbanSquare, path: '/deals', permission: null },
  { key: 'calendar', icon: CalendarDays, path: '/calendar', permission: null },
  { key: 'tasks', icon: FolderOpen, path: '/notes', permission: null },
  { key: 'reports', icon: FileText, path: '/reports', permission: null },
  { key: 'documents', icon: FolderOpen, path: '/documents', permission: null },
  { key: 'users', icon: Users, path: '/users', permission: 'manage_users' },
];

export const AppSidebar = () => {
  const { t } = useLanguage();
  const { profile, role, signOut, hasPermission } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const getRoleLabel = () =>
    role === 'superuser' ? t('users.superuser') : role === 'top_manager' ? t('users.topManager') : t('users.manager');

  const getNavLabel = (key: string) => {
    const labels: Record<string, string> = {
      clients: 'Клієнти',
      deals: 'Воронка угод',
      tasks: 'Завдання',
      calendar: 'Календар',
      documents: 'Документи',
    };
    return labels[key] ?? t(`nav.${key}`);
  };

  const filteredItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));
  const avatarUrl = profile?.avatar_url ? pb.files.getUrl(profile, profile.avatar_url) : '';

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 lg:hidden bg-card shadow-lg border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
      </Button>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center shadow-accent">
                <Home className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground">Хатосфера</h1>
                <p className="text-xs text-sidebar-foreground/60">CRM System</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={cn(
                    'group flex items-center gap-4 px-4 py-3 rounded-lg transition-all hover:shadow-sm',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-accent'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className={cn('h-5 w-5 transition-transform group-hover:scale-110', isActive && 'text-sidebar-primary-foreground')} />
                  <span className="font-medium">{getNavLabel(item.key)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border space-y-4">
            <LanguageToggle />
            {profile && (
              <button
                onClick={() => setProfileOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-left"
              >
                <Avatar className="w-9 h-9">
                  {avatarUrl ? <AvatarImage src={avatarUrl} alt={profile.full_name} /> : <AvatarFallback>{profile.full_name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
                  <p className="text-xs text-sidebar-foreground/60">{getRoleLabel()}</p>
                </div>
              </button>
            )}
            <Button variant="ghost" className="w-full justify-start gap-3" onClick={signOut}>
              <LogOut className="h-5 w-5" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </aside>

      <ProfileSettingsDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
};
