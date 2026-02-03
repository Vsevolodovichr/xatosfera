import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Plus,
  Calendar,
  Building2,
  DollarSign,
  CheckCircle,
  Send,
  Key,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { uk } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Report {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  added_properties_count: number;
  closed_cases_count: number;
  total_amount: number;
  total_commission: number;
  signature: string | null;
  signed_at: string | null;
  sent_at: string | null;
  created_at: string;
}

export const ReportsPage = () => {
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly'>('weekly');
  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [secretKey, setSecretKey] = useState('');

  useEffect(() => {
    fetchReports();
  }, [user]);

  const fetchReports = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error: any) {
      console.error('Error fetching reports:', error);
      toast.error('Помилка завантаження звітів');
    } finally {
      setLoading(false);
    }
  };

  const calculateReportData = async (periodStart: Date, periodEnd: Date) => {
    if (!user) return { added: 0, closed: 0, amount: 0, commission: 0 };

    try {
      // Fetch properties added in this period
      const { data: addedProperties } = await supabase
        .from('properties')
        .select('id')
        .gte('created_at', periodStart.toISOString())
        .lte('created_at', periodEnd.toISOString());

      // Fetch closed cases (properties with status sold/rented and updated in period)
      const { data: closedCases } = await supabase
        .from('properties')
        .select('closing_amount, commission')
        .in('status', ['sold', 'rented'])
        .gte('updated_at', periodStart.toISOString())
        .lte('updated_at', periodEnd.toISOString());

      const added = addedProperties?.length || 0;
      const closed = closedCases?.length || 0;
      const amount = closedCases?.reduce((sum, p) => sum + (Number(p.closing_amount) || 0), 0) || 0;
      const commission = closedCases?.reduce((sum, p) => sum + (Number(p.commission) || 0), 0) || 0;

      return { added, closed, amount, commission };
    } catch (error) {
      console.error('Error calculating report data:', error);
      return { added: 0, closed: 0, amount: 0, commission: 0 };
    }
  };

  const handleCreateReport = async () => {
    if (!user) return;

    setCreating(true);
    try {
      const now = new Date();
      let periodStart: Date;
      let periodEnd: Date;

      if (reportType === 'weekly') {
        periodStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
        periodEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      } else {
        periodStart = startOfMonth(subMonths(now, 1));
        periodEnd = endOfMonth(subMonths(now, 1));
      }

      const { added, closed, amount, commission } = await calculateReportData(periodStart, periodEnd);

      const { error } = await supabase.from('reports').insert({
        user_id: user.id,
        report_type: reportType,
        period_start: format(periodStart, 'yyyy-MM-dd'),
        period_end: format(periodEnd, 'yyyy-MM-dd'),
        added_properties_count: added,
        closed_cases_count: closed,
        total_amount: amount,
        total_commission: commission,
      });

      if (error) throw error;

      toast.success('Звіт успішно створено');
      fetchReports();
    } catch (error: any) {
      console.error('Error creating report:', error);
      toast.error('Помилка створення звіту');
    } finally {
      setCreating(false);
    }
  };

  const handleSignReport = async () => {
    if (!selectedReport || !secretKey) return;

    try {
      // Call edge function to validate secret key and sign report server-side
      const { data, error } = await supabase.functions.invoke('sign-report', {
        body: {
          reportId: selectedReport.id,
          secretKey: secretKey,
        },
      });

      if (error) {
        console.error('Error signing report:', error);
        toast.error('Помилка підписання звіту');
        return;
      }

      if (data?.error) {
        if (data.error === 'Invalid secret key') {
          toast.error('Невірний секретний ключ');
        } else {
          toast.error(data.error);
        }
        return;
      }

      toast.success('Звіт підписано та відправлено');
      setSignDialogOpen(false);
      setSecretKey('');
      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      console.error('Error signing report:', error);
      toast.error('Помилка підписання звіту');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(amount);
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('reports.title')}</h1>
            <p className="text-muted-foreground mt-1">
              Створюйте та управляйте звітами
            </p>
          </div>
          <div className="flex gap-3">
            <Select value={reportType} onValueChange={(v) => setReportType(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="weekly">{t('reports.weekly')}</SelectItem>
                <SelectItem value="monthly">{t('reports.monthly')}</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleCreateReport}
              disabled={creating}
              className="gradient-accent text-accent-foreground shadow-accent hover:opacity-90"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('reports.create')}
            </Button>
          </div>
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-card border-0 animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/4 mb-4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : reports.length > 0 ? (
          <div className="space-y-4">
            {reports.map((report, index) => (
              <Card
                key={report.id}
                className="shadow-card border-0 hover:shadow-lg transition-all animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Report Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant={report.report_type === 'weekly' ? 'default' : 'secondary'}>
                          {report.report_type === 'weekly' ? t('reports.weekly') : t('reports.monthly')}
                        </Badge>
                        {report.signed_at ? (
                          <Badge className="bg-success/10 text-success border-success/20">
                            <CheckCircle className="mr-1 h-3 w-3" />
                            {t('reports.signed')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-warning border-warning/20">
                            {t('reports.pending')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-lg font-semibold text-foreground">
                        {format(new Date(report.period_start), 'd MMM', { locale: uk })} -{' '}
                        {format(new Date(report.period_end), 'd MMM yyyy', { locale: uk })}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Building2 className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('reports.addedProperties')}</p>
                          <p className="font-semibold">{report.added_properties_count}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-success/10">
                          <CheckCircle className="h-4 w-4 text-success" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('reports.closedCases')}</p>
                          <p className="font-semibold">{report.closed_cases_count}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-info/10">
                          <DollarSign className="h-4 w-4 text-info" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('reports.totalAmount')}</p>
                          <p className="font-semibold">{formatCurrency(Number(report.total_amount))}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <DollarSign className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">{t('reports.totalCommission')}</p>
                          <p className="font-semibold">{formatCurrency(Number(report.total_commission))}</p>
                        </div>
                      </div>
                    </div>

                    {/* Sign Button */}
                    {!report.signed_at && (
                      <Dialog open={signDialogOpen && selectedReport?.id === report.id} onOpenChange={(open) => {
                        setSignDialogOpen(open);
                        if (!open) setSelectedReport(null);
                      }}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="shrink-0"
                            onClick={() => setSelectedReport(report)}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            {t('reports.sign')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Підписати звіт</DialogTitle>
                            <DialogDescription>
                              Введіть ваш секретний ключ для підпису та відправки звіту топ-менеджеру
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="secretKey">Секретний ключ</Label>
                              <Input
                                id="secretKey"
                                type="password"
                                value={secretKey}
                                onChange={(e) => setSecretKey(e.target.value)}
                                placeholder="Введіть ваш секретний ключ"
                              />
                            </div>
                            <Button onClick={handleSignReport} className="w-full gradient-primary">
                              <Send className="mr-2 h-4 w-4" />
                              Підписати та відправити
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('common.noData')}</h3>
              <p className="text-muted-foreground text-center mb-6">
                Створіть перший звіт для відстеження результатів
              </p>
              <Button
                onClick={handleCreateReport}
                disabled={creating}
                className="gradient-accent text-accent-foreground shadow-accent"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('reports.create')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};
