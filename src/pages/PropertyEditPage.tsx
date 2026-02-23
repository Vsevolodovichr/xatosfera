import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, LocateFixed } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const PropertyEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', description: '', address: '', city: '', price: '', status: 'draft', photos: '', documents: '' });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data, error } = await pb.from('properties').select('*').eq('id', id).single();
      if (error || !data) return;
      setForm({
        title: data.title ?? '', description: data.description ?? '', address: data.address ?? '', city: data.city ?? '',
        price: data.price?.toString() ?? '', status: data.status ?? 'draft',
        photos: (data.photos ?? []).join(', '), documents: (data.documents ?? []).join(', '),
      });
    };
    void load();
  }, [id]);

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
    });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    try {
      const { error } = await pb.from('properties').update({
        title: form.title,
        description: form.description || null,
        address: form.address,
        city: form.city || null,
        price: form.price ? Number(form.price) : null,
        status: form.status,
        photos: form.photos.split(',').map((v) => v.trim()).filter(Boolean),
        documents: form.documents.split(',').map((v) => v.trim()).filter(Boolean),
      }).eq('id', id);
      if (error) throw error;
      navigate('/properties');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const mapQuery = encodeURIComponent(`${form.address} ${form.city}`.trim());

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" asChild className="px-0"><Link to="/properties"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Link></Button>
        <Card>
          <CardHeader><CardTitle>Редагування об'єкта + мапа</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Назва</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Ціна</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Адреса</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Місто</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Статус</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="available">Available</SelectItem><SelectItem value="sold">Sold</SelectItem><SelectItem value="rented">Rented</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Опис</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Фото (URL)</Label><Input value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} /></div>
              <div className="space-y-2"><Label>Документи (URL)</Label><Input value={form.documents} onChange={(e) => setForm({ ...form, documents: e.target.value })} /></div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Інтерактивна мапа</Label><Button type="button" variant="outline" onClick={useMyLocation}><LocateFixed className="mr-2 h-4 w-4" />Геолокація</Button></div>
                <iframe title="map" className="h-72 w-full rounded-md border" src={lat && lng ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}` : `https://www.openstreetmap.org/export/embed.html?bbox=30.3%2C50.3%2C30.7%2C50.6&layer=mapnik&query=${mapQuery}`} />
              </div>
              <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" />{loading ? 'Збереження...' : 'Зберегти'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
