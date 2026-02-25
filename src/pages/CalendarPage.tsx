import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { uk, enUS } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { cloudflareApi } from '@/integrations/cloudflare/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type EventItem = { id: string; title: string; starts_at: string; ends_at: string | null; description: string | null; event_type: string; status: string };

export const CalendarPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [title, setTitle] = useState('');
  const [eventType, setEventType] = useState('meeting');

  const locale = language === 'uk' ? uk : enUS;

  const load = async () => {
    if (!user) return;
    const { data } = await cloudflareApi.from('calendar_events').select('*').eq('user_id', user.id).order('starts_at', { ascending: true });
    setEvents((data ?? []) as EventItem[]);
  };

  useEffect(() => { void load(); }, [user]);

  const addTask = async () => {
    if (!title || !user) return;
    await cloudflareApi.from('calendar_events').insert({
      title,
      starts_at: new Date().toISOString(),
      user_id: user.id,
      event_type: eventType,
      status: 'planned',
    });
    setTitle('');
    void load();
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">{t('calendar.title')}</h1>
        <Card>
          <CardHeader><CardTitle>{t('calendar.newEvent')}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('calendar.placeholder')} />
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">meeting</SelectItem>
                <SelectItem value="viewing">viewing</SelectItem>
                <SelectItem value="deadline">deadline</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">{t('calendar.syncGoogle')}</Button>
            <Button onClick={addTask}><Plus className="mr-2 h-4 w-4" />{t('calendar.add')}</Button>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>{t('calendar.weeklyView')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {events.slice(0, 7).map((event) => (
                <div key={event.id} className="border rounded p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="text-sm text-muted-foreground">{format(new Date(event.starts_at), 'dd.MM.yyyy HH:mm', { locale })}</p>
                  </div>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('calendar.monthlyView')}</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• {t('calendar.reminder1')}</p>
              <p>• {t('calendar.reminder2')}</p>
              <p>• {t('calendar.reminder3')}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
