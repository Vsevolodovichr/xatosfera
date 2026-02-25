import React, { createContext, useContext, useState, useEffect } from 'react';
import pb from '@/integrations/pocketbase/client'; // Імпорт нового клієнта

export type UserRole = 'superuser' | 'top_manager' | 'manager';

interface Profile {
  id: string;
  full_name: string;
  created_at: string;
  role?: UserRole;
  phone?: string;
  avatar_url?: string;
  approved?: boolean;
  approved_at?: string;
}

interface AuthContextType {
  user: any | null; // PocketBase Record (замість Supabase User)
  profile: Profile | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasPermission: (action: string) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      // Завантажуємо профіль з колекції 'users' (non-sensitive поля)
      const profileData = await pb.collection('users').getOne(userId, {
        fields: 'id, full_name, role, created, phone, avatar_url, approved, approved_at, approved_by, updated',
      });

      if (profileData) {
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          created_at: profileData.created,
          phone: profileData.phone,
          avatar_url: profileData.avatar_url,
          role: profileData.role,
          approved: profileData.approved,
          approved_at: profileData.approved_at,
        });
        setRole(profileData.role as UserRole); // Припускаємо поле 'role' в users
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    // Слухаємо зміни автентифікації (callback без параметрів)
    const unsubscribe = pb.authStore.onChange(async () => {
      setUser(pb.authStore.model);

      if (pb.authStore.model) {
        await fetchProfile(pb.authStore.model.id);
      } else {
        setProfile(null);
        setRole(null);
      }
      setLoading(false);
    });

    // Ініціальна перевірка
    if (pb.authStore.isValid && pb.authStore.model) {
      setUser(pb.authStore.model);
      fetchProfile(pb.authStore.model.id);
    }
    setLoading(false);

    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await pb.collection('users').authWithPassword(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      // Створюємо користувача (role за замовчуванням 'manager' або налаштуйте в PocketBase)
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        full_name: fullName,
      });
      // Автоматичний логін після реєстрації (опціонально)
      await signIn(email, password);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    pb.authStore.clear();
  };

  const hasPermission = (action: string): boolean => {
    if (!role) return false;

    const permissions: Record<UserRole, string[]> = {
      superuser: [
        'manage_users', 'manage_all_users', 'manage_reports', 'manage_all_reports',
        'manage_properties', 'manage_all_properties', 'view_all_data'
      ],
      top_manager: [
        'manage_users', 'manage_managers', 'manage_reports', 'manage_all_reports',
        'manage_properties', 'manage_all_properties'
      ],
      manager: [
        'manage_own_reports', 'manage_own_properties'
      ],
    };

    return permissions[role]?.includes(action) || false;
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role,
      loading,
      signIn,
      signUp,
      signOut,
      hasPermission,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
