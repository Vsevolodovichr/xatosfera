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
import { useLanguage } from '@/contexts/LanguageContext';

type Client = { id: string; full_name: string; phone: string | null; email: string | null; segment: string; age: number | null; budget: number | null; tags: string[]; notes: string | null };
type Interaction = { client_id: string };

export const ClientsPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  
  const segments = useMemo(() => [
    { value: 'buyer', label: t('clients.buyer') },
    { value: 'seller', label: t('clients.seller') },
    { value: 'tenant', label: t('clients.tenant') },
  ], [t]);

  const tags = useMemo(() => [
    t('clients.tag_urgent'),
    t('clients.tag_exclusive'),
    t('clients.tag_no_agent'),
    t('clients.tag_mortgage'),
  ], [t]);

  const [clients, setClients] = useState<Client[]>([]);
  const [interactions, setInteractions] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('all');
  const [newClient, setNewClient] = useState({ full_name: '', phone: '', email: '', segment: 'buyer', age: '', budget: '', notes: '' });

  const load = async () => {
    const [{ data: clientsData }, { data: interactionsData }] = await Promise.all([
      pb.from('clients').select('*').order('created_at', { ascending: false }),
      pb.from('client_interactions').select('client_id'),
    ]);
    setClients((clientsData ?? []) as Client[]);
    const countMap: Record<string, number> = {};
    ((interactionsData ?? []) as Interaction[]).forEach((item) => {
      countMap[item.client_id] = (countMap[item.client_id] ?? 0) + 1;
    });
    setInteractions(countMap);
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
        <h1 className="text-2xl font-bold">{t('clients.title')}</h1>
        <Card>
          <CardContent className="p-4 grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="h-4 w-4 absolute top-1/2 -translate-y-1/2 left-3 text-muted-foreground" />
              <Input className="pl-9" placeholder={t('clients.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={segment} onValueChange={setSegment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('clients.allSegments')}</SelectItem>
                {segments.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t('clients.newClient')}</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-4 gap-3">
            <Input placeholder={t('clients.fullName')} value={newClient.full_name} onChange={(e) => setNewClient({ ...newClient, full_name: e.target.value })} />
            <Input placeholder={t('clients.phone')} value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
            <Input placeholder={t('clients.email')} value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
            <Button onClick={createClient}><Plus className="h-4 w-4 mr-2" />{t('clients.add')}</Button>
          </CardContent>
        </Card>

        <div className="flex gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">{t('clients.dragTags')}</span>
          {tags.map((tag) => (
            <Badge key={tag} draggable onDragStart={(e) => e.dataTransfer.setData('tag', tag)} className="cursor-grab">
              <Tag className="mr-1 h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client) => (
            <Card key={client.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { const tag = e.dataTransfer.getData('tag'); if (tag) void onTagDrop(client, tag); }}>
              <CardContent className="p-4 space-y-2">
                <h3 className="font-semibold">{client.full_name}</h3>
                <p className="text-sm text-muted-foreground">{client.phone || '—'} • {client.email || '—'}</p>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('clients.segment')}</span>
                  <Badge>{segments.find((s) => s.value === client.segment)?.label ?? client.segment}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('clients.ageBudget')}</span>
                  <span>{client.age ?? '—'} / {client.budget ? `${client.budget} ₴` : '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('clients.interactions')}</span>
                  <span>{interactions[client.id] ?? 0}</span>
                </div>
                <div className="flex flex-wrap gap-1">{client.tags?.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div>
                <p className="text-xs text-muted-foreground">{client.notes || t('clients.noNotes')}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};
