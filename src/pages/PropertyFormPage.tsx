import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Upload } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const districts = ['Центр', 'Ковалівка', '101-й', 'Черьомушки', 'Велика Балка', 'Завадівка', 'Кущівка', 'Лелеківка', 'Савицького', 'Новомиколаївка'];

export const PropertyFormPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', operation_type: 'sale', category: 'apartment', status: 'active', source: 'owner',
    district: 'Центр', street: '', building_number: '', block: '', floor: '', apartment: '', latitude: '', longitude: '',
    rooms: '', area_total: '', area_living: '', area_kitchen: '', floors_total: '', condition: 'no_repair', heating: 'central', bathroom: 'separate', balcony_type: 'none',
    price: '', currency: 'UAH', negotiable: 'no', additional_costs: '', owner_name: '', owner_phones: '', owner_email: '', owner_notes: '',
    tags: '', agent_notes: '', linked_client_id: '', linked_deal_id: '', description: '', photos: '',
  });

  const pricePerSqm = useMemo(() => {
    const price = Number(form.price);
    const area = Number(form.area_total);
    if (!price || !area) return 0;
    return Math.round((price / area) * 100) / 100;
  }, [form.price, form.area_total]);

  const handlePhotoDrop = (text: string) => {
    const current = form.photos ? form.photos.split(',').map((v) => v.trim()).filter(Boolean) : [];
    const incoming = text.split(/\s|,/).map((v) => v.trim()).filter((v) => /^https?:\/\//.test(v));
    const merged = [...new Set([...current, ...incoming])].slice(0, 30);
    setForm((prev) => ({ ...prev, photos: merged.join(', ') }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const photos = form.photos.split(',').map((v) => v.trim()).filter(Boolean).slice(0, 30);
      const ownerPhones = form.owner_phones.split(',').map((v) => v.trim()).filter(Boolean);
      const tags = form.tags.split(',').map((v) => v.trim()).filter(Boolean);

      const { error } = await pb.from('properties').insert({
        title: form.title,
        description: form.description || null,
        address: `${form.street} ${form.building_number}`.trim(),
        city: 'Кропивницький',
        price: form.price ? Number(form.price) : null,
        status: form.status,
        photos,
        documents: [],
        created_by: user.id,
        manager_id: user.id,
        operation_type: form.operation_type,
        category: form.category,
        source: form.source,
        district: form.district,
        street: form.street || null,
        building_number: form.building_number || null,
        block: form.block || null,
        floor: form.floor ? Number(form.floor) : null,
        apartment: form.apartment || null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        rooms: form.rooms ? Number(form.rooms) : null,
        area_total: form.area_total ? Number(form.area_total) : null,
        area_living: form.area_living ? Number(form.area_living) : null,
        area_kitchen: form.area_kitchen ? Number(form.area_kitchen) : null,
        floors_total: form.floors_total ? Number(form.floors_total) : null,
        property_condition: form.condition,
        heating: form.heating,
        bathroom: form.bathroom,
        balcony_type: form.balcony_type,
        currency: form.currency,
        price_per_sqm: pricePerSqm || null,
        negotiable: form.negotiable === 'yes',
        additional_costs: form.additional_costs || null,
        owner_name: form.owner_name || null,
        owner_phones: ownerPhones,
        owner_email: form.owner_email || null,
        owner_notes: form.owner_notes || null,
        tags,
        agent_notes: form.agent_notes || null,
        linked_client_id: form.linked_client_id || null,
        linked_deal_id: form.linked_deal_id || null,
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
      <div className="space-y-6 max-w-5xl">
        <Button variant="ghost" asChild className="px-0"><Link to="/properties"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Link></Button>
        <Card>
          <CardHeader><CardTitle>Новий об'єкт нерухомості</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Тип операції</Label><Select value={form.operation_type} onValueChange={(v) => setForm({ ...form, operation_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">Продаж</SelectItem><SelectItem value="rent">Оренда</SelectItem><SelectItem value="new_build">Новобудова</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Категорія</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apartment">Квартира</SelectItem><SelectItem value="house">Будинок</SelectItem><SelectItem value="commercial">Комерція</SelectItem><SelectItem value="other">Інше</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Статус</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Активний</SelectItem><SelectItem value="archived">Архів</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Джерело</Label><Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="owner">Власник</SelectItem><SelectItem value="database">База</SelectItem><SelectItem value="partner">Партнер</SelectItem><SelectItem value="other">Інше</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-2"><Label>Мікрорайон</Label><Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{districts.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>Вулиця</Label><Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
                <div className="space-y-2"><Label>Будинок</Label><Input required value={form.building_number} onChange={(e) => setForm({ ...form, building_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>Корпус</Label><Input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} /></div>
                <div className="space-y-2"><Label>Квартира</Label><Input value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Кімнат</Label><Input type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} /></div>
                <div className="space-y-2"><Label>Площа загальна (м²)</Label><Input type="number" value={form.area_total} onChange={(e) => setForm({ ...form, area_total: e.target.value })} /></div>
                <div className="space-y-2"><Label>Площа житлова (м²)</Label><Input type="number" value={form.area_living} onChange={(e) => setForm({ ...form, area_living: e.target.value })} /></div>
                <div className="space-y-2"><Label>Площа кухні (м²)</Label><Input type="number" value={form.area_kitchen} onChange={(e) => setForm({ ...form, area_kitchen: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-2"><Label>Поверх</Label><Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
                <div className="space-y-2"><Label>Поверхів у будинку</Label><Input type="number" value={form.floors_total} onChange={(e) => setForm({ ...form, floors_total: e.target.value })} /></div>
                <div className="space-y-2"><Label>Стан</Label><Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no_repair">Без ремонту</SelectItem><SelectItem value="cosmetic">Косметичний</SelectItem><SelectItem value="euro">Євроремонт</SelectItem><SelectItem value="furnished">З меблями</SelectItem><SelectItem value="after_build">Після будови</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Опалення</Label><Select value={form.heating} onValueChange={(v) => setForm({ ...form, heating: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="central">Централізоване</SelectItem><SelectItem value="autonomous">Автономне</SelectItem><SelectItem value="electric">Електро</SelectItem><SelectItem value="gas">Газ</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Санвузол</Label><Select value={form.bathroom} onValueChange={(v) => setForm({ ...form, bathroom: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="separate">Роздільний</SelectItem><SelectItem value="combined">Суміжний</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Балкон / лоджія / тераса</Label><Select value={form.balcony_type} onValueChange={(v) => setForm({ ...form, balcony_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Немає</SelectItem><SelectItem value="balcony">Балкон</SelectItem><SelectItem value="loggia">Лоджія</SelectItem><SelectItem value="terrace">Тераса</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Ціна</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-2"><Label>Валюта</Label><Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UAH">UAH</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Ціна за м²</Label><Input disabled value={pricePerSqm || ''} /></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>Торг</Label><Select value={form.negotiable} onValueChange={(v) => setForm({ ...form, negotiable: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">Так</SelectItem><SelectItem value="no">Ні</SelectItem></SelectContent></Select></div>
                <div className="space-y-2 md:col-span-3"><Label>Додаткові витрати</Label><Input value={form.additional_costs} onChange={(e) => setForm({ ...form, additional_costs: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>ПІБ власника</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Телефони власника (через кому)</Label><Input value={form.owner_phones} onChange={(e) => setForm({ ...form, owner_phones: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email власника</Label><Input value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Координати (широта/довгота)</Label><div className="grid grid-cols-2 gap-2"><Input placeholder="49.839" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /><Input placeholder="24.029" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div></div>
                <div className="space-y-2"><Label>Теги</Label><Input placeholder="терміново, ексклюзив" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              </div>

              <div className="space-y-2"><Label>Примітки щодо власника</Label><Textarea value={form.owner_notes} onChange={(e) => setForm({ ...form, owner_notes: e.target.value })} /></div>
              <div className="space-y-2"><Label>Нотатки агента (внутрішні)</Label><Textarea value={form.agent_notes} onChange={(e) => setForm({ ...form, agent_notes: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-4"><div className="space-y-2"><Label>ID клієнта</Label><Input value={form.linked_client_id} onChange={(e) => setForm({ ...form, linked_client_id: e.target.value })} /></div><div className="space-y-2"><Label>ID угоди</Label><Input value={form.linked_deal_id} onChange={(e) => setForm({ ...form, linked_deal_id: e.target.value })} /></div></div>
              <div className="space-y-2"><Label>Опис</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

              <div className="space-y-2">
                <Label>Фото (до 30 URL, drag-and-drop URL підтримується)</Label>
                <div
                  className="rounded-md border border-dashed p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const text = e.dataTransfer.getData('text');
                    if (text) handlePhotoDrop(text);
                  }}
                >
                  <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><Upload className="h-4 w-4" />Перетягніть URL фото у поле або вставте списком.</div>
                  <Textarea value={form.photos} onChange={(e) => setForm({ ...form, photos: e.target.value })} />
                </div>
              </div>

              <Button type="submit" disabled={loading}><Plus className="mr-2 h-4 w-4" />{loading ? 'Збереження...' : 'Створити'}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
