import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Target, Wallet, Mail, Send, MessageCircle, Clock, Zap } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

type Stats = { properties: number; closedDeals: number; conversion: number; avgPrice: number };

export const DashboardPage = () => {
  const { t, language } = useLanguage();
  const { role, user } = useAuth();
  const [stats, setStats] = useState<Stats>({ properties: 0, closedDeals: 0, conversion: 0, avgPrice: 0 });

  const msgTemplates = [
    { id: 1, name: 'Презентація об\'єкта', type: 'Email', icon: Mail, color: 'text-blue-500' },
    { id: 2, name: 'Перший контакт', type: 'WhatsApp', icon: MessageCircle, color: 'text-green-500' },
    { id: 3, name: 'Нагадування про перегляд', type: 'Telegram', icon: Send, color: 'text-sky-500' },
  ];

  const quickActions = [
    { id: 1, name: 'Створити об\'єкт', path: '/properties/new', icon: Building2 },
    { id: 2, name: 'Запланувати зустріч', path: '/calendar', icon: Clock },
  ];

  useEffect(() => {
    const load = async () => {
      const propertiesQuery = role === 'manager'
        ? pb.from('properties').select('id,price,status').eq('manager_id', user?.id)
        : pb.from('properties').select('id,price,status');

      const [{ data: properties }, { data: deals }] = await Promise.all([
        propertiesQuery,
        pb.from('deals').select('id,stage'),
      ]);
      const totalProperties = properties?.length ?? 0;
      const prices = (properties ?? []).map((p: PropertyRecord) => Number(p.price)).filter(Boolean);
      const avgPrice = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
      const totalDeals = deals?.length ?? 0;
      const closedDeals = (deals ?? []).filter((d: DealRecord) => d.stage === 'closed').length;
      setStats({ properties: totalProperties, closedDeals, conversion: totalDeals ? Math.round((closedDeals / totalDeals) * 100) : 0, avgPrice });
    };
    void load();
  }, [role, user?.id]);

  const cards = [
    { title: role === 'manager' ? t('dashboard.myProperties') : t('dashboard.allProperties'), value: stats.properties, icon: Building2 },
    { title: t('dashboard.closedDeals'), value: stats.closedDeals, icon: CheckCircle2 },
    { title: t('dashboard.conversion'), value: `${stats.conversion}%`, icon: Target },
    { title: t('dashboard.avgPrice'), value: `${Math.round(stats.avgPrice)} ₴`, icon: Wallet },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <div className="flex gap-2">
            <Button asChild>
              <Link to="/deals">{t('dashboard.funnel')}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/reports">{t('reports.title')}</Link>
            </Button>
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((item) => (
            <Card key={item.title}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.title}</p>
                  <p className="text-2xl font-bold">{item.value}</p>
                </div>
                <item.icon className="h-5 w-5" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Templates Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                {language === 'uk' ? 'Шаблони повідомлень' : 'Message Templates'}
              </CardTitle>
              <CardDescription>
                {language === 'uk' ? 'Швидка відправка клієнтам' : 'Quick send to clients'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {msgTemplates.map((tmp) => (
                <div key={tmp.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-md bg-muted ${tmp.color}`}>
                      <tmp.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tmp.name}</p>
                      <p className="text-xs text-muted-foreground">{tmp.type}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity">
                    {language === 'uk' ? 'Використати' : 'Use'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick Actions & Suggestions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{language === 'uk' ? 'Швидкі дії' : 'Quick Actions'}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                {quickActions.map(action => (
                  <Button key={action.id} variant="outline" className="h-20 flex flex-col gap-2" asChild>
                    <Link to={action.path}>
                      <action.icon className="h-5 w-5" />
                      <span className="text-xs">{action.name}</span>
                    </Link>
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700">{language === 'uk' ? 'Порада дня' : 'Tip of the Day'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-blue-800 font-medium">
                  {language === 'uk' 
                    ? 'Спробуйте розділ "Метчі" для швидкого підбору об\'єктів під нових клієнтів.' 
                    : 'Try the "Matches" section for quick property selection for new clients.'}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.automation')}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t('dashboard.automationDescription')}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
