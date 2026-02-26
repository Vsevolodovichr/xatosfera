import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

type Task = { id: string; title: string; content: string | null; priority: string; done: boolean };

export const NotesPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');

  const load = async () => {
    if (!user) return;
    const { data } = await pb.from('notes').select('*').eq('created_by', user.id).order('created_at', { ascending: false });
    const mapped = (data ?? []).map((n: NoteRecord) => ({ id: n.id, title: n.title, content: n.content, priority: n.priority || 'medium', done: Boolean(n.done) }));
    setTasks(mapped);
  };

  useEffect(() => { void load(); }, [user]);

  const add = async () => {
    if (!user || !title) return;
    await pb.from('notes').insert({ title, content: null, created_by: user.id, priority: 'medium', done: false });
    setTitle('');
    void load();
  };

  const toggle = async (t: Task) => {
    await pb.from('notes').update({ done: !t.done }).eq('id', t.id);
    void load();
  };

  return (
    <AppLayout>
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">{t('notes.title')}</h1>
        <Card>
          <CardContent className="p-4 flex gap-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('notes.newTask')} />
            <Button onClick={add}><Plus className="h-4 w-4 mr-1" />{t('notes.add')}</Button>
          </CardContent>
        </Card>
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle>{t('notes.active')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tasks.filter((t) => !t.done).map((t) => (
                <button key={t.id} onClick={() => toggle(t)} className="w-full text-left border rounded p-3">
                  {t.title}
                </button>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>{t('notes.completed')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {tasks.filter((t) => t.done).map((t) => (
                <button key={t.id} onClick={() => toggle(t)} className="w-full text-left border rounded p-3 line-through text-muted-foreground">
                  {t.title}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};
