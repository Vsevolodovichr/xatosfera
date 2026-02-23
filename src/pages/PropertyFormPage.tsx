import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const PropertyFormPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    address: '',
    city: '',
    price: '',
    status: 'draft',
    photos: '',
    documents: '',
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const photos = form.photos.split(',').map((v) => v.trim()).filter(Boolean);
      const documents = form.documents.split(',').map((v) => v.trim()).filter(Boolean);
      const { error } = await pb.from('properties').insert({
        title: form.title,
        description: form.description || null,
        address: form.address,
        city: form.city || null,
        price: form.price ? Number(form.price) : null,
        status: form.status,
        photos,
        documents,
        created_by: user.id,
        manager_id: user.id,
      });
      if (error) throw error;
      navigate('/properties');
    } catch (err) {
      console.error('Create property failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        <Button variant="ghost" asChild className="px-0"><Link to="/properties"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Link></Button>
        <Card>
          <CardHeader><CardTitle>Новий об'єкт</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2"><Label>Назва</Label><Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Адреса</Label><Input required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Місто</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Ціна</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Статус</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="sold">Sold</SelectItem><SelectItem value="rented">Rented</SelectItem></SelectContent></Select></div>
              </div>
              <div className="space-y-2"><Label>Опис</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Фото (URL через кому)</Label><Input value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} /></div>
              <div className="space-y-2"><Label>Документи (URL через кому)</Label><Input value={form.documents} onChange={(e) => setForm({ ...form, documents: e.target.value })} /></div>
              <Button type="submit" disabled={loading}><Plus className="mr-2 h-4 w-4" />{loading ? 'Збереження...' : 'Створити'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
