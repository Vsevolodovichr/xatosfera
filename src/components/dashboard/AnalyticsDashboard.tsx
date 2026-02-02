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
import { supabase } from '@/integrations/supabase/client';
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
  created_at: string;
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
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const createdDate = new Date(p.created_at);
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

  // Monthly data for line/bar charts
  const monthlyData = useMemo(() => {
    const months: { [key: string]: { added: number; sold: number; rented: number; commission: number } } = {};
    
    filteredProperties.forEach((p) => {
      const monthKey = format(new Date(p.created_at), 'MMM yyyy', { 
        locale: language === 'uk' ? uk : enUS 
      });
      
      if (!months[monthKey]) {
        months[monthKey] = { added: 0, sold: 0, rented: 0, commission: 0 };
      }
      
      months[monthKey].added++;
      
      if (p.status === 'sold') {
        months[monthKey].sold++;
        months[monthKey].commission += p.commission || 0;
      } else if (p.status === 'rented') {
        months[monthKey].rented++;
        months[monthKey].commission += p.commission || 0;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      ...data,
    }));
  }, [filteredProperties, language]);

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    const statusCounts: { [key: string]: number } = {};
    
    filteredProperties.forEach((p) => {
      const label = 
        p.status === 'available' ? (language === 'uk' ? 'Доступний' : 'Available') :
        p.status === 'sold' ? (language === 'uk' ? 'Продано' : 'Sold') :
        p.status === 'rented' ? (language === 'uk' ? 'Здано' : 'Rented') :
        p.status === 'not_sold' ? (language === 'uk' ? 'Не продано' : 'Not Sold') :
        (language === 'uk' ? 'Не здано' : 'Not Rented');
      
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  }, [filteredProperties, language]);

  // Property type distribution
  const typeData = useMemo(() => {
    const typeCounts: { [key: string]: number } = {};
    
    filteredProperties.forEach((p) => {
      const label = t(`property.${p.property_type}`);
      typeCounts[label] = (typeCounts[label] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([name, value]) => ({ name, value }));
  }, [filteredProperties, t]);

  // Summary stats
  const stats = useMemo(() => {
    const totalAdded = filteredProperties.length;
    const totalSold = filteredProperties.filter((p) => p.status === 'sold').length;
    const totalRented = filteredProperties.filter((p) => p.status === 'rented').length;
    const totalCommission = filteredProperties.reduce((sum, p) => sum + (p.commission || 0), 0);
    const totalAmount = filteredProperties.reduce((sum, p) => 
      (p.status === 'sold' || p.status === 'rented') ? sum + (p.closing_amount || p.price) : sum, 0
    );

    return { totalAdded, totalSold, totalRented, totalCommission, totalAmount };
  }, [filteredProperties]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-card border-0 animate-pulse">
            <CardContent className="p-6">
              <div className="h-64 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="shadow-card border-0">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>{language === 'uk' ? 'Від дати' : 'From Date'}</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'uk' ? 'До дати' : 'To Date'}</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'uk' ? 'Тип угоди' : 'Deal Type'}</Label>
              <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'uk' ? 'Всі' : 'All'}</SelectItem>
                  <SelectItem value="sale">{language === 'uk' ? 'Продаж' : 'Sale'}</SelectItem>
                  <SelectItem value="rent">{language === 'uk' ? 'Оренда' : 'Rent'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{language === 'uk' ? 'Тип нерухомості' : 'Property Type'}</Label>
              <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'uk' ? 'Всі' : 'All'}</SelectItem>
                  <SelectItem value="residential">{language === 'uk' ? 'Житлова' : 'Residential'}</SelectItem>
                  <SelectItem value="commercial">{language === 'uk' ? 'Комерційна' : 'Commercial'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalAdded}</p>
            <p className="text-sm text-muted-foreground">{language === 'uk' ? 'Додано' : 'Added'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{stats.totalSold}</p>
            <p className="text-sm text-muted-foreground">{language === 'uk' ? 'Продано' : 'Sold'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-info">{stats.totalRented}</p>
            <p className="text-sm text-muted-foreground">{language === 'uk' ? 'Здано' : 'Rented'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-success">
              ₴{new Intl.NumberFormat('uk-UA').format(stats.totalCommission)}
            </p>
            <p className="text-sm text-muted-foreground">{language === 'uk' ? 'Комісія' : 'Commission'}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-accent">
              ₴{new Intl.NumberFormat('uk-UA').format(stats.totalAmount)}
            </p>
            <p className="text-sm text-muted-foreground">{language === 'uk' ? 'Сума угод' : 'Deals Total'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Activity */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'uk' ? 'Активність по місяцях' : 'Monthly Activity'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="added" 
                    name={language === 'uk' ? 'Додано' : 'Added'} 
                    fill="hsl(220, 60%, 25%)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="sold" 
                    name={language === 'uk' ? 'Продано' : 'Sold'} 
                    fill="hsl(38, 92%, 50%)" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="rented" 
                    name={language === 'uk' ? 'Здано' : 'Rented'} 
                    fill="hsl(199, 89%, 48%)" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Commission Trend */}
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg">
              {language === 'uk' ? 'Динаміка комісії' : 'Commission Trend'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => `₴${new Intl.NumberFormat('uk-UA').format(value)}`}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="commission" 
                    name={language === 'uk' ? 'Комісія' : 'Commission'}
                    stroke="hsl(142, 71%, 45%)" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(142, 71%, 45%)' }}
                  />
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
