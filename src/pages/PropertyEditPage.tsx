import { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, LocateFixed, ImagePlus, X, Loader2 } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

import { GoogleMap } from '@/components/ui/GoogleMap';

export const PropertyEditPage = () => {
  const { t } = useLanguage();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [form, setForm] = useState({
    title: '', address: '', district: 'Центр', status: 'active', operation_type: 'sale', category: 'apartment',
    price: '', currency: 'UAH', area_total: '', rooms: '', latitude: '', longitude: '', owner_phones: '', tags: '',
    description: '', agent_notes: '',
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
        agent_notes: data.agent_notes ?? '',
      });
      setUploadedPhotos(data.photos ?? []);
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

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    
    setUploadingPhotos(true);
    const token = localStorage.getItem('access_token');
    const newPhotos: string[] = [];

    try {
      for (let i = 0; i < Math.min(files.length, 30 - uploadedPhotos.length); i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'properties');

        const response = await fetch(`${API_URL}/api/files/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newPhotos.push(data.key);
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

  const getPhotoUrl = (photo: string) => {
    if (photo.startsWith('http')) return photo;
    return `${API_URL}/api/files/${encodeURIComponent(photo)}`;
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
        photos: uploadedPhotos,
        price_per_sqm: pricePerSqm || null,
        agent_notes: form.agent_notes || null,
      }).eq('id', id);
      if (error) throw error;
      toast.success(t('property.success_update'));
      navigate('/properties');
    } catch (err) {
      console.error(err);
      toast.error(t('property.error_update'));
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
        <Button variant="ghost" asChild className="px-0"><Link to="/properties"><ArrowLeft className="mr-2 h-4 w-4" />{t('property.back')}</Link></Button>
        <Card>
          <CardHeader><CardTitle>{t('property.edit_title')}</CardTitle></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>{t('property.name')}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.operation')}</Label><Select value={form.operation_type} onValueChange={(v) => setForm({ ...form, operation_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sale">{t('properties.sale')}</SelectItem><SelectItem value="rent">{t('properties.rent')}</SelectItem><SelectItem value="new_build">{t('properties.newBuild')}</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>{t('property.category')}</Label><Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="apartment">{t('properties.apartment')}</SelectItem><SelectItem value="house">{t('properties.house')}</SelectItem><SelectItem value="commercial">{t('properties.commercial')}</SelectItem><SelectItem value="other">{t('properties.other')}</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2"><Label>{t('property.address')}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.district')}</Label><Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.status')}</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{t('properties.active')}</SelectItem><SelectItem value="archived">{t('properties.archived')}</SelectItem></SelectContent></Select></div>
              </div>

              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>{t('property.price')}</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.currency')}</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.area')}</Label><Input type="number" value={form.area_total} onChange={(e) => setForm({ ...form, area_total: e.target.value })} /></div>
                <div className="space-y-2"><Label>{t('property.price_sqm')}</Label><Input disabled value={pricePerSqm || ''} /></div>
              </div>

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
                    </div>
                  )}
                </div>

                {/* Photo Preview Grid */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mt-4">
                    {uploadedPhotos.map((photo, index) => (
                      <div key={index} className="relative group aspect-square">
                        <img
                          src={getPhotoUrl(photo)}
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

              <div className="space-y-2"><Label>{t('property.owner_phones_label')}</Label><Input value={form.owner_phones} onChange={(e) => setForm({ ...form, owner_phones: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('property.tags')}</Label><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('property.agent_notes')}</Label><Textarea value={form.agent_notes} onChange={(e) => setForm({ ...form, agent_notes: e.target.value })} /></div>

              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label>{t('property.map_title')}</Label><Button type="button" variant="outline" onClick={useMyLocation}><LocateFixed className="mr-2 h-4 w-4" />{t('property.my_location')}</Button></div>
                <div className="grid grid-cols-2 gap-3"><Input placeholder={t('property.lat')} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /><Input placeholder={t('property.lng')} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></div>
                <div className="h-72 w-full">
                  <GoogleMap 
                    lat={Number(form.latitude)} 
                    lng={Number(form.longitude)} 
                    onLocationSelect={(lat, lng) => setForm(prev => ({ ...prev, latitude: String(lat), longitude: String(lng) }))} 
                  />
                </div>
              </div>

              <Button type="submit" disabled={loading}><Save className="mr-2 h-4 w-4" />{loading ? t('common.save') : t('common.save')}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};
