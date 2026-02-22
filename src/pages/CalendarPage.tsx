import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CalendarDays,
  Plus,
  Clock,
  Phone,
  User,
  Building2,
  Edit,
  Trash2,
} from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { toast } from 'sonner';
import { format, isSameDay } from 'date-fns';
import { uk } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  start_time: string;
  end_time: string | null;
  property_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  created_at: string;
}

const eventTypeColors: Record<string, string> = {
  meeting: 'bg-primary/10 text-primary border-primary/20',
  call: 'bg-info/10 text-info border-info/20',
  viewing: 'bg-success/10 text-success border-success/20',
  other: 'bg-muted text-muted-foreground border-muted-foreground/20',
};

const eventTypeLabels: Record<string, { uk: string; en: string }> = {
  meeting: { uk: 'Зустріч', en: 'Meeting' },
  call: { uk: 'Дзвінок', en: 'Call' },
  viewing: { uk: 'Показ', en: 'Viewing' },
  other: { uk: 'Інше', en: 'Other' },
};

export const CalendarPage = () => {
  const { language } = useLanguage();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState('meeting');
  const [startTime, setStartTime] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await pb
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Помилка завантаження подій');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !title.trim() || !startTime) {
      toast.error('Заповніть обов\'язкові поля');
      return;
    }

    const startDateTime = new Date(selectedDate);
    const [hours, minutes] = startTime.split(':');
    startDateTime.setHours(parseInt(hours), parseInt(minutes));

    try {
      if (editingEvent) {
        const { error } = await pb
          .from('calendar_events')
          .update({
            title,
            description,
            event_type: eventType,
            start_time: startDateTime.toISOString(),
            client_name: clientName || null,
            client_phone: clientPhone || null,
          })
          .eq('id', editingEvent.id);

        if (error) throw error;
        toast.success('Подію оновлено');
      } else {
        const { error } = await pb
          .from('calendar_events')
          .insert({
            user_id: user.id,
            title,
            description,
            event_type: eventType,
            start_time: startDateTime.toISOString(),
            client_name: clientName || null,
            client_phone: clientPhone || null,
          });

        if (error) throw error;
        toast.success('Подію створено');
      }

      resetForm();
      setDialogOpen(false);
      fetchEvents();
    } catch (error: any) {
      console.error('Error saving event:', error);
      toast.error('Помилка збереження');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Видалити цю подію?')) return;

    try {
      const { error } = await pb
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Подію видалено');
      fetchEvents();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast.error('Помилка видалення');
    }
  };

  const resetForm = () => {
    setEditingEvent(null);
    setTitle('');
    setDescription('');
    setEventType('meeting');
    setStartTime('');
    setClientName('');
    setClientPhone('');
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (event: CalendarEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setEventType(event.event_type);
    setStartTime(format(new Date(event.start_time), 'HH:mm'));
    setClientName(event.client_name || '');
    setClientPhone(event.client_phone || '');
    setSelectedDate(new Date(event.start_time));
    setDialogOpen(true);
  };

  const eventsForSelectedDate = events.filter((e) =>
    isSameDay(new Date(e.start_time), selectedDate)
  );

  const datesWithEvents = events.map((e) => new Date(e.start_time));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {language === 'uk' ? 'Календар' : 'Calendar'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {language === 'uk'
                ? 'Плануйте зустрічі та дзвінки'
                : 'Plan meetings and calls'}
            </p>
          </div>
          <Button onClick={openCreateDialog} className="gradient-primary shadow-accent">
            <Plus className="mr-2 h-4 w-4" />
            {language === 'uk' ? 'Додати подію' : 'Add Event'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="shadow-card border-0 lg:col-span-1">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                locale={language === 'uk' ? uk : undefined}
                modifiers={{ hasEvent: datesWithEvents }}
                modifiersClassNames={{
                  hasEvent: 'bg-primary/10 font-bold',
                }}
                className="rounded-md"
              />
            </CardContent>
          </Card>

          {/* Events for selected date */}
          <Card className="shadow-card border-0 lg:col-span-2">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                {format(selectedDate, 'd MMMM yyyy', {
                  locale: language === 'uk' ? uk : undefined,
                })}
              </h2>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : eventsForSelectedDate.length > 0 ? (
                <div className="space-y-3">
                  {eventsForSelectedDate.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={`${eventTypeColors[event.event_type]} border`}
                          >
                            {eventTypeLabels[event.event_type]?.[language] ||
                              event.event_type}
                          </Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.start_time), 'HH:mm')}
                          </span>
                        </div>
                        <h3 className="font-semibold">{event.title}</h3>
                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {event.description}
                          </p>
                        )}
                        {(event.client_name || event.client_phone) && (
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {event.client_name && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {event.client_name}
                              </span>
                            )}
                            {event.client_phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {event.client_phone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(event)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(event.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'uk'
                      ? 'На цей день подій немає'
                      : 'No events for this day'}
                  </p>
                  <Button
                    variant="link"
                    onClick={openCreateDialog}
                    className="mt-2"
                  >
                    {language === 'uk' ? 'Додати подію' : 'Add event'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingEvent
                  ? language === 'uk'
                    ? 'Редагувати подію'
                    : 'Edit Event'
                  : language === 'uk'
                  ? 'Нова подія'
                  : 'New Event'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'uk' ? 'Назва *' : 'Title *'}</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    language === 'uk' ? 'Назва події' : 'Event title'
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'uk' ? 'Тип' : 'Type'}</Label>
                  <Select value={eventType} onValueChange={setEventType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(eventTypeLabels).map(([key, labels]) => (
                        <SelectItem key={key} value={key}>
                          {labels[language]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{language === 'uk' ? 'Час *' : 'Time *'}</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'uk' ? 'Опис' : 'Description'}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'uk' ? 'Клієнт' : 'Client'}</Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder={language === 'uk' ? "Ім'я клієнта" : 'Client name'}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{language === 'uk' ? 'Телефон' : 'Phone'}</Label>
                  <Input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+380..."
                  />
                </div>
              </div>

              <Button onClick={handleSave} className="w-full gradient-primary">
                {t('common.save')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};
