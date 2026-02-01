import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { LanguageToggle } from '@/components/LanguageToggle';

export const LoginPage = () => {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      toast.success(t('common.success'));
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
        
        <div className="relative z-10 flex flex-col justify-center px-12 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-accent">
              <Building2 className="h-8 w-8 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">RealEstate CRM</h1>
              <p className="text-white/70">{t('auth.subtitle')}</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-bold leading-tight">
              {t('auth.welcome')}
            </h2>
            <p className="text-lg text-white/80 max-w-md">
              Керуйте об'єктами нерухомості, відстежуйте угоди та створюйте звіти в одному місці.
            </p>
          </div>
          
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur">
              <div className="text-3xl font-bold text-accent">150+</div>
              <div className="text-sm text-white/60">Об'єктів</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur">
              <div className="text-3xl font-bold text-accent">50+</div>
              <div className="text-sm text-white/60">Угод</div>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur">
              <div className="text-3xl font-bold text-accent">₴2M+</div>
              <div className="text-sm text-white/60">Комісії</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 bg-background">
        <div className="absolute top-4 right-4">
          <LanguageToggle variant="default" />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center shadow-accent">
              <Building2 className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">RealEstate CRM</span>
          </div>

          <Card className="shadow-lg border-0 bg-card">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-2xl font-bold text-center">
                {t('auth.loginTitle')}
              </CardTitle>
              <CardDescription className="text-center">
                Увійдіть до свого акаунту для продовження
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gradient-primary text-primary-foreground hover:opacity-90 transition-opacity"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('auth.login')
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {t('auth.noAccount')}{' '}
                  <Link to="/register" className="font-medium text-primary hover:underline">
                    {t('auth.createAccount')}
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
