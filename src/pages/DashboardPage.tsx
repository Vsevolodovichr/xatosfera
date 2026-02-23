import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, CheckCircle2, Target, Wallet } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Stats = { properties: number; closedDeals: number; conversion: number; avgPrice: number };

export const DashboardPage = () => {
  const [stats, setStats] = useState<Stats>({ properties: 0, closedDeals: 0, conversion: 0, avgPrice: 0 });

  useEffect(() => {
    const load = async () => {
      const [{ data: properties }, { data: deals }] = await Promise.all([
        pb.from('properties').select('id,price,status'),
        pb.from('deals').select('id,stage'),
      ]);
      const totalProperties = properties?.length ?? 0;
      const prices = (properties ?? []).map((p: any) => Number(p.price)).filter(Boolean);
      const avgPrice = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : 0;
      const totalDeals = deals?.length ?? 0;
      const closedDeals = (deals ?? []).filter((d: any) => d.stage === 'closed').length;
      setStats({ properties: totalProperties, closedDeals, conversion: totalDeals ? Math.round((closedDeals / totalDeals) * 100) : 0, avgPrice });
    };
    void load();
  }, []);

  const cards = [
    { title: 'Кількість обʼєктів', value: stats.properties, icon: Building2 },
    { title: 'Закриті угоди', value: stats.closedDeals, icon: CheckCircle2 },
    { title: 'Конверсія', value: `${stats.conversion}%`, icon: Target },
    { title: 'Середня ціна', value: `${Math.round(stats.avgPrice)} ₴`, icon: Wallet },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Дашборд</h1>
          <div className="flex gap-2"><Button asChild><Link to="/deals">Pipeline</Link></Button><Button variant="outline" asChild><Link to="/reports">Звіти</Link></Button></div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {cards.map((item) => <Card key={item.title}><CardContent className="p-4 flex items-center justify-between"><div><p className="text-sm text-muted-foreground">{item.title}</p><p className="text-2xl font-bold">{item.value}</p></div><item.icon className="h-5 w-5" /></CardContent></Card>)}
        </div>
        <Card>
          <CardHeader><CardTitle>Управління угодами</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Канбан-дошка та реальний рух етапів доступні в розділі Deals Pipeline. Підтримується клік для переходу на наступний етап, кольорові статуси, призначення агентів топ-менеджером.
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
