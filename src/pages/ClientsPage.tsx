import { useEffect, useMemo, useState } from 'react';
import { Search, Tag, Plus } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';

type Client = { id: string; full_name: string; phone: string | null; email: string | null; segment: string; age: number | null; budget: number | null; tags: string[]; notes: string | null };
const segments = ['buyer', 'seller', 'tenant'];

export const ClientsPage = () => {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', email: '', segment: 'buyer', age: '', budget: '', notes: '' });

  const load = async () => {
    const { data } = await pb.from('clients').select('*').order('created_at', { ascending: false });
    setClients((data ?? []) as Client[]);
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => clients.filter((c) => {
    const q = search.toLowerCase();
    const matches = c.full_name.toLowerCase().includes(q) || (c.phone ?? '').includes(q) || (c.email ?? '').toLowerCase().includes(q);
    const seg = segment === 'all' || c.segment === segment;
    return matches && seg;
  }), [clients, search, segment]);

  const createClient = async () => {
    if (!user || !newClient.full_name) return;
    await pb.from('clients').insert({
      full_name: newClient.full_name,
      phone: newClient.phone || null,
      email: newClient.email || null,
      segment: newClient.segment,
      age: newClient.age ? Number(newClient.age) : null,
      budget: newClient.budget ? Number(newClient.budget) : null,
      notes: newClient.notes || null,
      tags: [],
      created_by: user.id,
    });
    setNewClient({ full_name: '', phone: '', email: '', segment: 'buyer', age: '', budget: '', notes: '' });
    void load();
  };

  const onTagDrop = async (client: Client, tag: string) => {
    if (client.tags.includes(tag)) return;
    await pb.from('clients').update({ tags: [...client.tags, tag] }).eq('id', client.id);
    void load();
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Клієнти</h1>
        <Card><CardContent className="p-4 grid md:grid-cols-2 gap-4"><div className="relative"><Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2 left-3 text-muted-foreground" /><Input className="pl-9" placeholder="Пошук по ПІБ/контактам" value={search} onChange={(e) => setSearch(e.target.value)} /></div><Select value={segment} onValueChange={setSegment}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Всі сегменти</SelectItem>{segments.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></CardContent></Card>

        <Card>
          <CardHeader><CardTitle>Новий клієнт</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3">
            <Input placeholder="ПІБ" value={newClient.full_name} onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })} />
            <Input placeholder="Телефон" value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
            <Input placeholder="Email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            <Button onClick={createClient}><Plus className="h-4 w-4 mr-2" />Додати</Button>
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap"><span className="text-sm text-muted-foreground">Перетягніть тег на карточку:</span>{['vip', 'гарячий', 'іпотека'].map((tag) => <Badge key={tag} draggable onDragStart={(e) => e.dataTransfer.setData('tag', tag)} className="cursor-grab"><Tag className="mr-1 h-3 w-3" />{tag}</Badge>)}</div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const tag = e.dataTransfer.getData('tag'); if (tag) void onTagDrop(client, tag); }}>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold">{client.full_name}</h3>
                <p className="text-sm text-muted-foreground">{client.phone || '—'} • {client.email || '—'}</p>
                <div className="flex items-center justify-between text-sm"><span>Сегмент</span><Badge>{client.segment}</Badge></div>
                <div className="flex items-center justify-between text-sm"><span>Вік / Бюджет</span><span>{client.age ?? '—'} / {client.budget ? `${client.budget} ₴` : '—'}</span></div>
                <div className="flex flex-wrap gap-1">{client.tags?.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
                <p className="text-xs text-muted-foreground">{client.notes || 'Нотаток немає'}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};
