import { useEffect, useState, useMemo } from 'react';
import { cloudflareApi as pb } from '@/integrations/cloudflare/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';

const stages = ['lead', 'viewing', 'offer', 'deal', 'closed'];

const stageColor: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-700',
  viewing: 'bg-blue-100 text-blue-700',
  offer: 'bg-yellow-100 text-yellow-700',
  deal: 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
};

type Deal = { id: string; title: string; stage: string; assigned_agent_id: string | null; property_id?: string; client_id?: string };
type Property = { id: string; title: string; address: string };
type Client = { id: string; full_name: string };

export const DealsPage = () => {
  const { t, language } = useLanguage();
  const { role, user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const stageLabel: Record<string, string> = useMemo(() => ({
    lead: t('deals.stage_lead'),
    viewing: t('deals.stage_viewing'),
    offer: t('deals.stage_offer'),
    deal: t('deals.stage_deal'),
    closed: t('deals.stage_closed'),
  }), [t]);

  const load = async () => {
    const { data } = await pb.from('deals').select('*').order('created_at', { ascending: false });
    setDeals((data ?? []) as Deal[]);
  };

  const loadSelectionData = async () => {
    const { data: props } = await pb.from('properties').select('id, title, address');
    const { data: cls } = await pb.from('clients').select('id, full_name');
    setProperties((props ?? []) as Property[]);
    setClients((cls ?? []) as Client[]);
  };

  useEffect(() => { 
    void load();
    void loadSelectionData();
  }, []);

  const moveDeal = async (deal: Deal) => {
    const idx = stages.indexOf(deal.stage);
    if (idx < 0 || idx === stages.length - 1) return;
    await pb.from('deals').update({ stage: stages[idx + 1] }).eq('id', deal.id);
    void load();
  };

  const handleCreateDeal = async () => {
    if (!user) return;
    if (!selectedPropertyId && !selectedClientId) {
      toast.error(language === 'uk' ? 'Виберіть об\'єкт або клієнта' : 'Select a property or client');
      return;
    }

    const property = properties.find(p => p.id === selectedPropertyId);
    const client = clients.find(c => c.id === selectedClientId);
    
    const dealTitle = property 
      ? `Угода: ${property.title}` 
      : `Угода: ${client?.full_name}`;

    const { error } = await pb.from('deals').insert({ 
      title: dealTitle, 
      stage: 'lead', 
      property_id: selectedPropertyId || null,
      client_id: selectedClientId || null,
      created_by: user.id, 
      assigned_agent_id: role === 'manager' ? user.id : null 
    });

    if (error) {
      toast.error(t('common.error'));
    } else {
      toast.success(language === 'uk' ? 'Угоду створено' : 'Deal created');
      setIsDialogOpen(false);
      setSelectedPropertyId('');
      setSelectedClientId('');
      void load();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{t('deals.title')}</h1>
          <Button onClick={() => setIsDialogOpen(true)}>{t('deals.add')}</Button>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'uk' ? 'Створити нову угоду' : 'Create New Deal'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{language === 'uk' ? 'Виберіть об\'єкт' : 'Select Property'}</Label>
                <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'uk' ? 'Пошук об\'єкта...' : 'Search property...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'uk' ? 'Не вибрано' : 'Not selected'}</SelectItem>
                    {properties.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.title} ({p.address})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{language === 'uk' ? 'АБО' : 'OR'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'uk' ? 'Виберіть клієнта' : 'Select Client'}</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'uk' ? 'Пошук клієнта...' : 'Search client...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{language === 'uk' ? 'Не вибрано' : 'Not selected'}</SelectItem>
                    {clients.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 space-y-2">
                <Label className="text-xs text-muted-foreground">{language === 'uk' ? 'Швидкий пошук/додавання' : 'Quick search/add'}</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder={language === 'uk' ? 'Назва або ID...' : 'Name or ID...'} 
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button className="w-full gradient-primary" onClick={handleCreateDeal}>
                {language === 'uk' ? 'Створити угоду' : 'Create Deal'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid xl:grid-cols-5 md:grid-cols-2 gap-3">
          {stages.map((stage) => (
            <Card key={stage}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{stageLabel[stage]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.filter((d) => d.stage === stage).map((deal) => (
                  <div key={deal.id} className="rounded-md border p-3 space-y-2 bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{deal.title}</p>
                      <Badge className={stageColor[deal.stage]}>{stageLabel[deal.stage]}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => moveDeal(deal)}>
                      {t('deals.moveNext')}
                    </Button>
                    {role === 'top_manager' && (
                      <p className="text-xs text-muted-foreground">
                        {t('deals.topManagerNote')}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

        <div className="grid xl:grid-cols-5 md:grid-cols-2 gap-3">
          {stages.map((stage) => (
            <Card key={stage}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{stageLabel[stage]}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.filter((d) => d.stage === stage).map((deal) => (
                  <div key={deal.id} className="rounded-md border p-3 space-y-2 bg-card">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm">{deal.title}</p>
                      <Badge className={stageColor[deal.stage]}>{stageLabel[deal.stage]}</Badge>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => moveDeal(deal)}>
                      {t('deals.moveNext')}
                    </Button>
                    {role === 'top_manager' && (
                      <p className="text-xs text-muted-foreground">
                        {t('deals.topManagerNote')}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};
