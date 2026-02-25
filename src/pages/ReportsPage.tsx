import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useLanguage } from '@/contexts/LanguageContext';

type Property = { created_at: string; price: number | null; manager_id: string | null; status: string };

export const ReportsPage = () => {
  const { t, language } = useLanguage();
  const [items, setItems] = useState<Property[]>([]);
  const [range, setRange] = useState('30');

  useEffect(() => {
    const load = async () => {
      const { data } = await pb.from('properties').select('created_at,price,manager_id,status').order('created_at', { ascending: true });
      setItems((data ?? []) as Property[]);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    const since = new Date();
    since.setDate(since.getDate() - Number(range));
    return items.filter((i) => new Date(i.created_at) >= since);
  }, [items, range]);

  const metrics = useMemo(() => {
    const deals = filtered.filter((f) => ['sold', 'rented'].includes(f.status)).length;
    const avg = filtered.length ? filtered.reduce((sum, c) => sum + Number(c.price || 0), 0) / filtered.length : 0;
    const conversion = filtered.length ? Math.round((deals / filtered.length) * 100) : 0;
    return { deals, avg, conversion };
  }, [filtered]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { name: string; sales: number; avg: number; count: number }>();
    filtered.forEach((i) => {
      const k = new Date(i.created_at).toLocaleDateString(language === 'uk' ? 'uk-UA' : 'en-US', { month: 'short' });
      const row = map.get(k) ?? { name: k, sales: 0, avg: 0, count: 0 };
      row.sales += Number(i.price || 0);
      row.count += 1;
      row.avg = row.sales / row.count;
      map.set(k, row);
    });
    return [...map.values()];
  }, [filtered, language]);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
          <div className="flex gap-2">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('reports.days_7')}</SelectItem>
                <SelectItem value="30">{t('reports.days_30')}</SelectItem>
                <SelectItem value="90">{t('reports.days_90')}</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" />{t('reports.export')}</Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t('reports.deals_count')}</p><p className="text-2xl font-bold">{metrics.deals}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t('reports.conversion')}</p><p className="text-2xl font-bold">{metrics.conversion}%</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">{t('reports.avgPrice')}</p><p className="text-2xl font-bold">{Math.round(metrics.avg)} ₴</p></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('reports.sales_period')}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sales" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('reports.efficiency')}</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line dataKey="avg" stroke="#16a34a" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
