import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ProfileSettingsDialog } from '@/components/profile/ProfileSettingsDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
  Settings,
  MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

const navItems = [
  { key: 'dashboard', label: 'Головна', icon: LayoutDashboard, path: '/dashboard', permission: null },
  { key: 'matches', label: 'Повідомлення (Метчі)', icon: MessageCircle, path: '/matches', permission: null, badge: 3 },
  { key: 'properties', label: 'Об\'єкти', icon: Building2, path: '/properties', permission: null },
  { key: 'clients', label: 'Клієнти', icon: Contact, path: '/clients', permission: null },
  { key: 'deals', label: 'Угоди', icon: KanbanSquare, path: '/deals', permission: null },
  { key: 'calendar', label: 'Календар', icon: CalendarDays, path: '/calendar', permission: null },
  { key: 'tasks', label: 'Завдання', icon: FolderOpen, path: '/notes', permission: null },
  { key: 'reports', label: 'Звіти', icon: FileText, path: '/reports', permission: null },
  { key: 'documents', label: 'Документи', icon: FolderOpen, path: '/documents', permission: null },
  { key: 'users', label: 'Користувачі', icon: Users, path: '/users', permission: 'manage_users' },
];

export const AppSidebar = () => {
  const { profile, role, signOut, hasPermission } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const getRoleLabel = () => {
    if (role === 'superuser') return 'Суперадмін';
    if (role === 'top_manager') return 'Топ-менеджер';
    return 'Менеджер';
  };

  const filteredItems = navItems.filter((item) => !item.permission || hasPermission(item.permission));
  
  // Get avatar URL
  const getAvatarUrl = () => {
    if (!profile?.avatar_url) return '';
    if (profile.avatar_url.startsWith('http')) return profile.avatar_url;
    return `${API_URL}/api/files/${encodeURIComponent(profile.avatar_url)}`;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-16 bg-blue-600 z-50 lg:hidden flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-primary h-12 w-12"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="bg-accent h-10 w-10" />}
          </Button>
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <Home className="h-5 w-5 text-blue-600" />
          </div>
          <span className="font-bold text-white text-lg">Хатосфера</span>
        </div>
      </div>

      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-[55] lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-[60] w-64 bg-sidebar transform transition-transform duration-300 lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg gradient-accent flex items-center justify-center shadow-accent">
                <Home className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-sidebar-foreground">Хатосфера</h1>
                <p className="text-xs text-sidebar-foreground/60">CRM Нерухомості</p>
              </div>
            </div>
          </div>

          {/* User Profile */}
          {profile && (
            <div className="p-4 border-b border-sidebar-border">
              <button
                onClick={() => setProfileOpen(true)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-colors text-left"
              >
                <Avatar className="w-10 h-10">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={profile.full_name} />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {profile.full_name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{profile.full_name}</p>
                  <p className="text-xs text-sidebar-foreground/60">{getRoleLabel()}</p>
                </div>
                <Settings className="h-4 w-4 text-sidebar-foreground/40" />
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'group flex items-center gap-4 px-4 py-3 rounded-lg transition-all hover:shadow-sm',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-accent'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )}
                >
                  <Icon className={cn('h-5 w-5 transition-transform group-hover:scale-110', isActive && 'text-sidebar-primary-foreground')} />
                  <span className="font-medium flex-1">{item.label}</span>
                  {item.badge && !isActive && (
                    <Badge variant="destructive" className="h-5 w-5 flex items-center justify-center p-0 text-[10px] animate-pulse">
                      {item.badge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-sidebar-border">
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent" 
              onClick={signOut}
            >
              <LogOut className="h-5 w-5" />
              Вийти
            </Button>
          </div>
        </div>
      </aside>

      <ProfileSettingsDialog open={profileOpen} onOpenChange={setProfileOpen} />
    </>
  );
};
