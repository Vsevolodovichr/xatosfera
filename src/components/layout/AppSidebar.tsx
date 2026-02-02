import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { ProfileSettingsDialog } from '@/components/profile/ProfileSettingsDialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Users,
  LogOut,
  Menu,
  X,
  StickyNote,
  CalendarDays,
  FolderOpen,
  Home,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/dashboard', permission: null },
  { key: 'properties', icon: Building2, path: '/properties', permission: null },
  { key: 'documents', icon: FolderOpen, path: '/documents', permission: null },
  { key: 'reports', icon: FileText, path: '/reports', permission: null },
  { key: 'notes', icon: StickyNote, path: '/notes', permission: null },
  { key: 'calendar', icon: CalendarDays, path: '/calendar', permission: null },
  { key: 'users', icon: Users, path: '/users', permission: 'manage_users' },
];

export const AppSidebar = () => {
  const { t, language } = useLanguage();
  const { profile, role, signOut, hasPermission } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const getRoleLabel = () => {
    switch (role) {
      case 'superuser':
        return t('users.superuser');
      case 'top_manager':
        return t('users.topManager');
      case 'manager':
        return t('users.manager');
      default:
        return '';
    }
  };

  const getNavLabel = (key: string) => {
    if (key === 'notes') return language === 'uk' ? 'Нотатки' : 'Notes';
    if (key === 'calendar') return language === 'uk' ? 'Календар' : 'Calendar';
    if (key === 'documents') return language === 'uk' ? 'Документи' : 'Documents';
    return t(`nav.${key}`);
  };

  const filteredItems = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
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

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.key}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-accent'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 transition-transform group-hover:scale-110',
                  isActive && 'text-sidebar-primary-foreground'
                )}
              />
              <span className="font-medium">{getNavLabel(item.key)}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info & Footer */}
      <div className="p-4 border-t border-sidebar-border space-y-4">
        <LanguageToggle />
        
        {profile && (
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-left"
          >
            <Avatar className="w-9 h-9">
              {(profile as any).avatar_url ? (
                <AvatarImage src={(profile as any).avatar_url} alt={profile.full_name} />
              ) : (
                <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
                  {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name}
              </p>
              <p className="text-xs text-sidebar-foreground/60">{getRoleLabel()}</p>
            </div>
          </button>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5" />
          {t('nav.logout')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Toggle - positioned at bottom left corner */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 lg:hidden bg-card shadow-lg border border-border"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5 text-foreground" /> : <Menu className="h-5 w-5 text-foreground" />}
      </Button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Profile Settings Dialog */}
      <ProfileSettingsDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
};
