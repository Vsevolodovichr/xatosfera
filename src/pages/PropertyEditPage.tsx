import { FormEvent, useEffect, useMemo, useState } from 'react';
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
  const [form, setForm] = useState({
    title: '', address: '', district: 'Центр', status: 'active', operation_type: 'sale', category: 'apartment',
    price: '', currency: 'UAH', area_total: '', rooms: '', latitude: '', longitude: '', owner_phones: '', tags: '',
    description: '', photos: '', agent_notes: '',
  });

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data, error } = await pb.from('properties').select('*').eq('id', id).single();
      if (error || !data) return;
      setForm({
        title: data.title ?? '',
        address: data.address ?? '',
        district: data.district ?? 'Центр',
        status: data.status ?? 'active',
        operation_type: data.operation_type ?? 'sale',
        category: data.category ?? 'apartment',
        price: data.price?.toString() ?? '',
        currency: data.currency ?? 'UAH',
        area_total: data.area_total?.toString() ?? '',
        rooms: data.rooms?.toString() ?? '',
        latitude: data.latitude?.toString() ?? '',
        longitude: data.longitude?.toString() ?? '',
        owner_phones: (data.owner_phones ?? []).join(', '),
        tags: (data.tags ?? []).join(', '),
        description: data.description ?? '',
        photos: (data.photos ?? []).join(', '),
        agent_notes: data.agent_notes ?? '',
      });
    };
    void load();
  }, [id]);

  const useMyLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setForm((prev) => ({ ...prev, latitude: String(pos.coords.latitude), longitude: String(pos.coords.longitude) }));
    });
  };

  const pricePerSqm = useMemo(() => {
    const price = Number(form.price);
    const area = Number(form.area_total);
    if (!price || !area) return 0;
    return Math.round((price / area) * 100) / 100;
  }, [form.price, form.area_total]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setLoading(true);
    try {
      const { error } = await pb.from('properties').update({
        title: form.title,
        description: form.description || null,
        address: form.address,
        district: form.district,
        status: form.status,
        operation_type: form.operation_type,
        category: form.category,
        price: form.price ? Number(form.price) : null,
        currency: form.currency,
        area_total: form.area_total ? Number(form.area_total) : null,
        rooms: form.rooms ? Number(form.rooms) : null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        owner_phones: form.owner_phones.split(',').map((v) => v.trim()).filter(Boolean),
        tags: form.tags.split(',').map((v) => v.trim()).filter(Boolean),
        photos: form.photos.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 30),
        price_per_sqm: pricePerSqm || null,
        agent_notes: form.agent_notes || null,
      }).eq('id', id);
      if (error) throw error;
      navigate('/properties');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const lat = Number(form.latitude);
  const lng = Number(form.longitude);
  const hasPoint = !Number.isNaN(lat) && !Number.isNaN(lng) && lat && lng;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-4xl">
        <Button variant="ghost" asChild className="px-0"><Link to="/properties"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Link></Button>
        <Card>
          <CardHeader><CardTitle>Редагування об'єкта</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Назва</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Тип операції</Label><Select value={form.operation_type} onValueChange={(v) => setForm({ ...form, operation_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">Продаж</SelectItem><SelectItem value="rent">Оренда</SelectItem><SelectItem value="new_build">Новобудова</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Категорія</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apartment">Квартира</SelectItem><SelectItem value="house">Будинок</SelectItem><SelectItem value="commercial">Комерція</SelectItem><SelectItem value="other">Інше</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>Адреса</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>Мікрорайон</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
                <div className="space-y-2"><Label>Статус</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Активний</SelectItem><SelectItem value="archived">Архів</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Ціна</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Валюта</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                <div className="space-y-2"><Label>Площа</Label><Input type="number" value={form.area_total} onChange={(e) => setForm({ ...form, area_total: e.target.value })} /></div>
                <div className="space-y-2"><Label>Ціна за м²</Label><Input disabled value={pricePerSqm || ''} /></div>
              </div>

              <div className="space-y-2"><Label>Фото URL (до 30)</Label><Textarea value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} /></div>
              <div className="space-y-2"><Label>Телефони власника</Label><Input value={form.owner_phones} onChange={(e) => setForm({ ...form, owner_phones: e.target.value })} /></div>
              <div className="space-y-2"><Label>Теги</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="space-y-2"><Label>Нотатки агента</Label><Textarea value={form.agent_notes} onChange={(e) => setForm({ ...form, agent_notes: e.target.value })} /></div>

              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>Координати та карта</Label><Button type="button" variant="outline" onClick={useMyLocation}><LocateFixed className="mr-2 h-4 w-4" />Моя геолокація</Button></div>
                <div className="grid grid-cols-2 gap-3"><Input placeholder="Широта" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /><Input placeholder="Довгота" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
                <iframe title="map" className="h-72 w-full rounded-md border" src={hasPoint ? `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}` : 'https://www.openstreetmap.org/export/embed.html?bbox=32.18%2C48.48%2C32.32%2C48.56&layer=mapnik'} />
              </div>

              <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" />{loading ? 'Збереження...' : 'Зберегти'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
