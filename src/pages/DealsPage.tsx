import { useEffect, useState } from 'react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const stages = ['lead', 'viewing', 'offer', 'deal', 'closed'];
const stageLabel: Record<string, string> = {
  lead: 'Лід',
  viewing: 'Перегляд',
  offer: 'Пропозиція',
  deal: 'Угода',
  closed: 'Закрито',
};
const stageColor: Record<string, string> = {
  lead: 'bg-slate-100 text-slate-700',
  viewing: 'bg-blue-100 text-blue-700',
  offer: 'bg-yellow-100 text-yellow-700',
  deal: 'bg-purple-100 text-purple-700',
  closed: 'bg-green-100 text-green-700',
};

type Deal = { id: string; title: string; stage: string; assigned_agent_id: string | null };

export const DealsPage = () => {
  const { role, user } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);

  const load = async () => {
    const { data } = await pb.from('deals').select('id,title,stage,assigned_agent_id').order('created_at', { ascending: false });
    setDeals((data ?? []) as Deal[]);
  };
  useEffect(() => { void load(); }, []);

  const moveDeal = async (deal: Deal) => {
    const idx = stages.indexOf(deal.stage);
    if (idx < 0 || idx === stages.length - 1) return;
    await pb.from('deals').update({ stage: stages[idx + 1] }).eq('id', deal.id);
    void load();
  };

  const createDeal = async () => {
    if (!user) return;
    await pb.from('deals').insert({ title: `Нова угода ${new Date().toLocaleTimeString()}`, stage: 'lead', created_by: user.id, assigned_agent_id: role === 'manager' ? user.id : null });
    void load();
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Воронка угод</h1><Button onClick={createDeal}>Додати угоду</Button></div>
        <div className="grid xl:grid-cols-5 md:grid-cols-2 gap-3">
          {stages.map((stage) => (
            <Card key={stage}>
              <CardHeader className="pb-2"><CardTitle className="text-base">{stageLabel[stage]}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {deals.filter((d) => d.stage === stage).map((deal) => (
                  <div key={deal.id} className="rounded-md border p-3 space-y-2 bg-card">
                    <div className="flex items-center justify-between gap-2"><p className="font-medium text-sm">{deal.title}</p><Badge className={stageColor[deal.stage]}>{stageLabel[deal.stage]}</Badge></div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => moveDeal(deal)}>Перевести на наступний етап</Button>
                    {role === 'top_manager' && <p className="text-xs text-muted-foreground">Топ-менеджер: доступне призначення агентів, аудит історії угод і перевірка документів.</p>}
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
