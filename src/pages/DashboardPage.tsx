import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AnalyticsDashboard } from '@/components/dashboard/AnalyticsDashboard';
import {
  Building2,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Plus,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

export const DashboardPage = () => {
  const { t, language } = useLanguage();
  const { profile, role, user } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    closed: 0,
    commission: 0,
  });

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('status, commission');

      if (error) throw error;

      const total = data?.length || 0;
      const active = data?.filter((p) => p.status === 'available').length || 0;
      const closed = data?.filter((p) => p.status === 'sold' || p.status === 'rented').length || 0;
      const commission = data?.reduce((sum, p) => sum + (p.commission || 0), 0) || 0;

      setStats({ total, active, closed, commission });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statsData = [
    {
      title: t('dashboard.totalProperties'),
      value: stats.total.toString(),
      change: '+0%',
      icon: Building2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('dashboard.activeListings'),
      value: stats.active.toString(),
      change: '+0%',
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      title: t('dashboard.closedDeals'),
      value: stats.closed.toString(),
      change: '+0%',
      icon: CheckCircle,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: t('dashboard.totalCommission'),
      value: `₴${new Intl.NumberFormat('uk-UA').format(stats.commission)}`,
      change: '+0%',
      icon: DollarSign,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
  ];

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

  return (
    <AppLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Welcome Section */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('dashboard.welcome')}, {profile?.full_name || 'Користувач'}! 👋
            </h1>
            <p className="text-muted-foreground mt-1">
              {getRoleLabel()} • {t('dashboard.thisMonth')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild className="gradient-accent text-accent-foreground shadow-accent hover:opacity-90">
              <Link to="/properties/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('properties.add')}
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {statsData.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card
                key={index}
                className="shadow-card hover:shadow-lg transition-all duration-300 border-0 bg-card animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="flex items-center gap-1 text-sm font-medium text-success">
                      <ArrowUpRight className="h-4 w-4" />
                      {stat.change}
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-2xl lg:text-3xl font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs for Overview and Analytics */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Building2 className="h-4 w-4" />
              {language === 'uk' ? 'Огляд' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              {language === 'uk' ? 'Аналітика' : 'Analytics'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Quick Actions & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card className="shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {language === 'uk' ? 'Швидкі дії' : 'Quick Actions'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button asChild variant="outline" className="w-full justify-start h-12">
                    <Link to="/properties/new">
                      <Building2 className="mr-3 h-5 w-5 text-primary" />
                      {t('properties.add')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start h-12">
                    <Link to="/reports/new">
                      <TrendingUp className="mr-3 h-5 w-5 text-info" />
                      {t('reports.create')}
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start h-12">
                    <Link to="/properties">
                      <CheckCircle className="mr-3 h-5 w-5 text-success" />
                      {language === 'uk' ? 'Переглянути об\'єкти' : 'View Properties'}
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="shadow-card border-0">
                <CardHeader>
                  <CardTitle className="text-lg">{t('dashboard.recentActivity')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">{t('common.noData')}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {language === 'uk' 
                        ? 'Додайте перший об\'єкт для початку роботи' 
                        : 'Add your first property to get started'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};
