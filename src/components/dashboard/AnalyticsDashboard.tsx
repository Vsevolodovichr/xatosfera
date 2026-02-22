import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import pb from '@/integrations/pocketbase/client'; // Імпорт PocketBase клієнта
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';

interface Property {
  id: string;
  property_type: string;
  deal_type: string;
  status: string;
  price: number;
  commission: number | null;
  closing_amount: number | null;
  created: string; // PocketBase використовує 'created' замість 'created_at'
}

const COLORS = ['hsl(220, 60%, 25%)', 'hsl(38, 92%, 50%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)', 'hsl(0, 72%, 51%)'];

export const AnalyticsDashboard = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => 
    format(startOfMonth(subMonths(new Date(), 5)), 'yyyy-MM-dd')
  );
  const [dateTo, setDateTo] = useState(() => 
    format(endOfMonth(new Date()), 'yyyy-MM-dd')
  );
  const [dealTypeFilter, setDealTypeFilter] = useState('all');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      // Отримання всіх властивостей з колекції 'properties'
      const data = await pb.collection('properties').getFullList({
        sort: '+created',
      });
      setProperties((data || []).map((record: any) => ({
        id: record.id,
        property_type: record.property_type,
        deal_type: record.deal_type,
        status: record.status,
        price: record.price,
        commission: record.commission,
        closing_amount: record.closing_amount,
        created: record.created,
      })));
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const createdDate = new Date(p.created);
      const fromDate = new Date(dateFrom);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);

      const inDateRange = createdDate >= fromDate && createdDate <= toDate;
      const matchesDealType = dealTypeFilter === 'all' || p.deal_type === dealTypeFilter;
      const isCommercial = p.property_type === 'commercial' || p.property_type === 'office';
      const matchesPropertyType =
        propertyTypeFilter === 'all' ||
        (propertyTypeFilter === 'commercial' && isCommercial) ||
        (propertyTypeFilter === 'residential' && !isCommercial);

      return inDateRange && matchesDealType && matchesPropertyType;
    });
  }, [properties, dateFrom, dateTo, dealTypeFilter, propertyTypeFilter]);

  // Решта коду без змін (розрахунок даних для графіків, UI тощо)
  // ... (вставте сюди весь залишок оригінального коду з графіками, оскільки він не залежить від бекенду)
  // Для повноти я вставлю ключові частини, але припускаю, що ви скопіюєте з оригіналу

  const monthlyData = useMemo(() => {
    const data = [];
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    for (let d = new Date(start); d <= end; d.setMonth(d.getMonth() + 1)) {
      const monthKey = format(d, 'MMM yyyy', { locale: language === 'uk' ? uk : enUS });
      const monthProperties = filteredProperties.filter(p => 
        format(parseISO(p.created), 'yyyy-MM') === format(d, 'yyyy-MM')
      );
      data.push({
        month: monthKey,
        count: monthProperties.length,
        revenue: monthProperties.reduce((sum, p) => sum + (p.closing_amount || 0), 0),
        commission: monthProperties.reduce((sum, p) => sum + (p.commission || 0), 0),
      });
    }
    return data;
  }, [filteredProperties, dateFrom, dateTo, language]);

  const typeData = useMemo(() => {
    const types = filteredProperties.reduce((acc, p) => {
      const type = p.property_type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [filteredProperties]);

  const statusData = useMemo(() => {
    const statuses = filteredProperties.reduce((acc, p) => {
      const status = p.status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  }, [filteredProperties]);

  const totalStats = useMemo(() => {
    return {
      properties: filteredProperties.length,
      revenue: filteredProperties.reduce((sum, p) => sum + (p.closing_amount || 0), 0),
      commission: filteredProperties.reduce((sum, p) => sum + (p.commission || 0), 0),
      averagePrice: filteredProperties.length > 0 
        ? filteredProperties.reduce((sum, p) => sum + p.price, 0) / filteredProperties.length 
        : 0,
    };
  }, [filteredProperties]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Фільтри */}
      <Card className="shadow-card border-0">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>{t('properties.dateFrom')}</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('properties.dateTo')}</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <Label>{t('properties.dealType')}</Label>
            <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('properties.all')}</SelectItem>
                <SelectItem value="sale">{t('deal.sale')}</SelectItem>
                <SelectItem value="rent">{t('deal.rent')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t('properties.type')}</Label>
            <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('properties.all')}</SelectItem>
                <SelectItem value="residential">
                  {language === 'uk' ? 'Житлова' : 'Residential'}
                </SelectItem>
                <SelectItem value="commercial">
                  {language === 'uk' ? 'Комерційна' : 'Commercial'}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Total Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('dashboard.totalProperties')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStats.properties}</div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'uk' ? 'Загальна сума угод' : 'Total Revenue'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat(language, { style: 'currency', currency: 'UAH' }).format(totalStats.revenue)}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('dashboard.totalCommission')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat(language, { style: 'currency', currency: 'UAH' }).format(totalStats.commission)}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {language === 'uk' ? 'Середня ціна' : 'Average Price'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat(language, { style: 'currency', currency: 'UAH' }).format(totalStats.averagePrice)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <Card className="shadow-card border-0 col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'uk' ? 'Щомісячні тенденції' : 'Monthly Trends'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value) => typeof value === 'number' ? `${new Intl.NumberFormat('uk-UA').format(value)}` : value}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="count" 
                    name={language === 'uk' ? 'Кількість' : 'Count'}
                    stroke="hsl(199, 89%, 48%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(199, 89%, 48%)' }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="revenue" 
                    name={language === 'uk' ? 'Дохід' : 'Revenue'}
                    stroke="hsl(38, 92%, 50%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(38, 92%, 50%)' }}
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="commission" 
                    name={language === 'uk' ? 'Комісія' : 'Commission'}
                    stroke="hsl(142, 71%, 45%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 71%, 45%)' }}
                  />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'uk' ? 'Розподіл по статусах' : 'Status Distribution'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Property Type Distribution */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'uk' ? 'Типи нерухомості' : 'Property Types'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {typeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};