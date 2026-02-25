import { FormEvent, useMemo, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, ImagePlus, Loader2 } from 'lucide-react';
import { cloudflareApi } from '@/integrations/cloudflare/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'https://crm-api.0991597753r.workers.dev';
const districts = ['Центр', 'Ковалівка', '101-й', 'Черьомушки', 'Велика Балка', 'Завадівка', 'Кущівка', 'Лелеківка', 'Савицького', 'Новомиколаївка'];

export const PropertyFormPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    title: '', operation_type: 'sale', category: 'apartment', status: 'active', source: 'owner',
    district: 'Центр', street: '', building_number: '', block: '', floor: '', apartment: '', latitude: '', longitude: '',
    rooms: '', area_total: '', area_living: '', area_kitchen: '', floors_total: '', condition: 'no_repair', heating: 'central', bathroom: 'separate', balcony_type: 'none',
    price: '', currency: 'UAH', negotiable: 'no', additional_costs: '', owner_name: '', owner_phones: '', owner_email: '', owner_notes: '',
    tags: '', agent_notes: '', linked_client_id: '', linked_deal_id: '', description: '',
  });

  const pricePerSqm = useMemo(() => {
    const price = Number(form.price);
    const area = Number(form.area_total);
    if (!price || !area) return 0;
    return Math.round((price / area) * 100) / 100;
  }, [form.price, form.area_total]);

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    
    setUploadingPhotos(true);
    const newPhotos: string[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, 30 - uploadedPhotos.length); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const path = `properties/${Date.now()}_${file.name}`;
        const { data, error } = await cloudflareApi.storage.from('properties').upload(path, file);
        
        if (!error && data) {
          newPhotos.push(path);
        }
      }

      setUploadedPhotos(prev => [...prev, ...newPhotos]);
      toast.success(t('property.success_upload').replace('{count}', newPhotos.length.toString()));
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(t('property.error_upload'));
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    setUploadedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const ownerPhones = form.owner_phones.split(',').map((v) => v.trim()).filter(Boolean);
      const tags = form.tags.split(',').map((v) => v.trim()).filter(Boolean);

      const { error } = await cloudflareApi.from('properties').insert({
        title: form.title || `${form.category} ${form.street}`,
        description: form.description || null,
        address: `${form.street} ${form.building_number}`.trim(),
        city: 'Кропивницький',
        price: form.price ? Number(form.price) : null,
        status: form.status,
        photos: uploadedPhotos,
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
      toast.success(t('property.success_create'));
      navigate('/properties');
    } catch (err) {
      console.error('Create property failed', err);
      toast.error(t('property.error_create'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl">
        <Button variant="ghost" asChild className="px-0"><Link to="/properties"><ArrowLeft className="mr-2 h-4 w-4" />{t('property.back')}</Link></Button>
        <Card>
          <CardHeader><CardTitle>{t('property.new')}</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>{t('property.operation')}</Label><Select value={form.operation_type} onValueChange={(v) => setForm({ ...form, operation_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">{t('properties.sale')}</SelectItem><SelectItem value="rent">{t('properties.rent')}</SelectItem><SelectItem value="new_build">{t('properties.newBuild')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.category')}</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apartment">{t('properties.apartment')}</SelectItem><SelectItem value="house">{t('properties.house')}</SelectItem><SelectItem value="commercial">{t('properties.commercial')}</SelectItem><SelectItem value="other">{t('properties.other')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.status')}</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{t('properties.active')}</SelectItem><SelectItem value="archived">{t('properties.archived')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.source')}</Label><Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="owner">{t('property.owner_src')}</SelectItem><SelectItem value="database">{t('property.database_src')}</SelectItem><SelectItem value="partner">{t('property.partner_src')}</SelectItem><SelectItem value="other">{t('properties.other')}</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-2"><Label>{t('property.district')}</Label><Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{districts.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.street')}</Label><Input required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.building')}</Label><Input required value={form.building_number} onChange={(e) => setForm({ ...form, building_number: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.block')}</Label><Input value={form.block} onChange={(e) => setForm({ ...form, block: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.apartment')}</Label><Input value={form.apartment} onChange={(e) => setForm({ ...form, apartment: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>{t('property.rooms')}</Label><Input type="number" value={form.rooms} onChange={(e) => setForm({ ...form, rooms: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.area_total')}</Label><Input type="number" value={form.area_total} onChange={(e) => setForm({ ...form, area_total: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.area_living')}</Label><Input type="number" value={form.area_living} onChange={(e) => setForm({ ...form, area_living: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.area_kitchen')}</Label><Input type="number" value={form.area_kitchen} onChange={(e) => setForm({ ...form, area_kitchen: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-5 gap-4">
                <div className="space-y-2"><Label>{t('property.floor')}</Label><Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.floors_total')}</Label><Input type="number" value={form.floors_total} onChange={(e) => setForm({ ...form, floors_total: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.condition')}</Label><Select value={form.condition} onValueChange={(v) => setForm({ ...form, condition: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="no_repair">{t('property.no_repair')}</SelectItem><SelectItem value="cosmetic">{t('property.cosmetic')}</SelectItem><SelectItem value="euro">{t('property.euro')}</SelectItem><SelectItem value="furnished">{t('property.furnished')}</SelectItem><SelectItem value="after_build">{t('property.after_build')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.heating')}</Label><Select value={form.heating} onValueChange={(v) => setForm({ ...form, heating: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="central">{t('property.central')}</SelectItem><SelectItem value="autonomous">{t('property.autonomous')}</SelectItem><SelectItem value="electric">{t('property.electric')}</SelectItem><SelectItem value="gas">{t('property.gas')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.bathroom')}</Label><Select value={form.bathroom} onValueChange={(v) => setForm({ ...form, bathroom: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="separate">{t('property.separate')}</SelectItem><SelectItem value="combined">{t('property.combined')}</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>{t('property.balcony')}</Label><Select value={form.balcony_type} onValueChange={(v) => setForm({ ...form, balcony_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t('property.no')}</SelectItem><SelectItem value="balcony">{t('property.balcony_item')}</SelectItem><SelectItem value="loggia">{t('property.loggia')}</SelectItem><SelectItem value="terrace">{t('property.terrace')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.price')}</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.currency')}</Label><Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="UAH">UAH</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.price_sqm')}</Label><Input disabled value={pricePerSqm || ''} /></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>{t('property.negotiable')}</Label><Select value={form.negotiable} onValueChange={(v) => setForm({ ...form, negotiable: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">{t('property.yes')}</SelectItem><SelectItem value="no">{t('property.no')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2 md:col-span-3"><Label>{t('property.additional_costs')}</Label><Input value={form.additional_costs} onChange={(e) => setForm({ ...form, additional_costs: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>{t('property.owner_name')}</Label><Input value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.owner_phones')}</Label><Input value={form.owner_phones} onChange={(e) => setForm({ ...form, owner_phones: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.owner_email')}</Label><Input value={form.owner_email} onChange={(e) => setForm({ ...form, owner_email: e.target.value })} /></div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{t('property.coords')}</Label><div className="grid grid-cols-2 gap-2"><Input placeholder="49.839" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /><Input placeholder="24.029" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div></div>
                <div className="space-y-2"><Label>{t('property.tags')}</Label><Input placeholder="терміново, ексклюзив" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              </div>

              <div className="space-y-2"><Label>{t('property.owner_notes')}</Label><Textarea value={form.owner_notes} onChange={(e) => setForm({ ...form, owner_notes: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('property.agent_notes')}</Label><Textarea value={form.agent_notes} onChange={(e) => setForm({ ...form, agent_notes: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-4"><div className="space-y-2"><Label>{t('property.client_id')}</Label><Input value={form.linked_client_id} onChange={(e) => setForm({ ...form, linked_client_id: e.target.value })} /></div><div className="space-y-2"><Label>{t('property.deal_id')}</Label><Input value={form.linked_deal_id} onChange={(e) => setForm({ ...form, linked_deal_id: e.target.value })} /></div></div>
              <div className="space-y-2"><Label>{t('property.description')}</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>

              {/* Photo Upload Section */}
              <div className="space-y-3">
                <Label>{t('property.photos')}</Label>
                <div
                  className="rounded-lg border-2 border-dashed p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handlePhotoUpload(e.dataTransfer.files);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                  />
                  {uploadingPhotos ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <ImagePlus className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        {t('property.upload_prompt')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t('property.upload_hint')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Photo Preview Grid */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mt-4">
                    {uploadedPhotos.map((photoKey, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img
                          src={`${API_URL}/api/files/${encodeURIComponent(photoKey)}`}
                          alt={`Фото ${index + 1}`}
                          className="w-full h-full object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('property.uploaded_count')}: {uploadedPhotos.length} / 30
                </p>
              </div>

              <Button type="submit" disabled={loading} className="w-full gradient-primary">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t('common.loading')}</> : t('property.create')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
