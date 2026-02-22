import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, Loader2, Upload, FileText, Trash2, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import pb from '@/integrations/pocketbase/client';
import { toast } from 'sonner';

interface Manager {
  id: string;
  full_name: string;
}

export const PropertyEditPage = () => {
  const { t, language } = useLanguage();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [managers, setManagers] = useState<Manager[]>([]);

  const [formData, setFormData] = useState({
    address: '',
    owner_name: '',
    owner_phone: '',
    description: '',
    property_type: 'apartment',
    deal_type: 'sale',
    price: '',
    external_link: '',
    photos: [] as string[],
    area: '',
    floor: '',
    heating: '',
    rooms: '',
    condition: '',
    documents: [] as string[],
    assigned_manager_id: '',
  });

  const [documentFiles, setDocumentFiles] = useState<{ name: string; url: string }[]>([]);

  const canAssignManager = role === 'superuser' || role === 'top_manager';

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
    if (canAssignManager) {
      fetchManagers();
    }
  }, [id, canAssignManager]);

  const fetchProperty = async () => {
    try {
      const record = await pb.collection('properties').getOne(id!);

      setFormData({
        address: record.address || '',
        owner_name: record.owner_name || '',
        owner_phone: record.owner_phone || '',
        description: record.description || '',
        property_type: record.property_type || 'apartment',
        deal_type: record.deal_type || 'sale',
        price: record.price?.toString() || '',
        external_link: record.external_link || '',
        photos: record.photos || [],
        area: record.area?.toString() || '',
        floor: record.floor?.toString() || '',
        heating: record.heating || '',
        rooms: record.rooms?.toString() || '',
        condition: record.condition || '',
        documents: record.documents || [],
        assigned_manager_id: record.assigned_manager_id || '',
      });

      // Генерація URL для документів
      const docs = (record.documents || []).map((docName: string) => ({
        name: docName,
        url: pb.files.getUrl(record, docName),
      }));
      setDocumentFiles(docs);
    } catch (error: any) {
      console.error('Помилка завантаження об’єкта:', error);
      toast.error('Не вдалося завантажити об’єкт');
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const data = await pb.collection('users').getFullList({
        sort: 'full_name',
        fields: 'id, full_name',
      });
      setManagers(data.map((item: any) => ({ id: item.id, full_name: item.full_name })));
    } catch (error) {
      console.error('Помилка завантаження менеджерів:', error);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !id) return;

    setUploadingDocs(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('documents', file);
      });

      const updated = await pb.collection('properties').update(id, formData);

      const newDocs = (updated.documents || []).map((docName: string) => ({
        name: docName,
        url: pb.files.getUrl(updated, docName),
      }));

      setDocumentFiles(newDocs);
      setFormData((prev) => ({ ...prev, documents: updated.documents }));

      toast.success('Документи додано');
    } catch (error: any) {
      console.error('Помилка завантаження документів:', error);
      toast.error(error.message || 'Не вдалося завантажити документи');
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeDocument = async (index: number) => {
    try {
      const currentDocs = [...formData.documents];
      currentDocs.splice(index, 1);

      await pb.collection('properties').update(id!, { documents: currentDocs });

      const updatedDocs = currentDocs.map((docName: string) => ({
        name: docName,
        url: pb.files.getUrl({ id: id! } as any, docName),
      }));

      setDocumentFiles(updatedDocs);
      setFormData((prev) => ({ ...prev, documents: currentDocs }));

      toast.success('Документ видалено');
    } catch (error: any) {
      console.error('Помилка видалення документа:', error);
      toast.error('Не вдалося видалити документ');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setLoading(true);
    try {
      await pb.collection('properties').update(id, {
        address: formData.address,
        owner_name: formData.owner_name,
        owner_phone: formData.owner_phone,
        description: formData.description,
        property_type: formData.property_type,
        deal_type: formData.deal_type,
        price: parseFloat(formData.price) || 0,
        external_link: formData.external_link,
        area: parseFloat(formData.area) || null,
        floor: parseInt(formData.floor) || null,
        heating: formData.heating,
        rooms: parseInt(formData.rooms) || null,
        condition: formData.condition,
        assigned_manager_id: formData.assigned_manager_id || null,
      });

      toast.success(t('common.success'));
      navigate('/properties');
    } catch (error: any) {
      console.error('Помилка збереження об’єкта:', error);
      toast.error(error.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/properties">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{t('properties.edit')}</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle>{t('properties.edit')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Основні поля */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="address">{t('properties.address')}</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">{t('properties.price')}</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                  />
                </div>
              </div>

              {/* Тип та угода */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>{t('properties.type')}</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(v) => handleChange('property_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">{t('property.apartment')}</SelectItem>
                      <SelectItem value="house">{t('property.house')}</SelectItem>
                      <SelectItem value="commercial">{t('property.commercial')}</SelectItem>
                      <SelectItem value="land">{t('property.land')}</SelectItem>
                      <SelectItem value="office">{t('property.office')}</SelectItem>
                      <SelectItem value="other">{t('property.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('properties.dealType')}</Label>
                  <Select
                    value={formData.deal_type}
                    onValueChange={(v) => handleChange('deal_type', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sale">{t('deal.sale')}</SelectItem>
                      <SelectItem value="rent">{t('deal.rent')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Власник */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="owner_name">{t('properties.ownerName')}</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => handleChange('owner_name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_phone">{t('properties.ownerPhone')}</Label>
                  <Input
                    id="owner_phone"
                    value={formData.owner_phone}
                    onChange={(e) => handleChange('owner_phone', e.target.value)}
                  />
                </div>
              </div>

              {/* Призначення менеджера (якщо права дозволяють) */}
              {canAssignManager && (
                <div className="space-y-2">
                  <Label htmlFor="assigned_manager_id">
                    {language === 'uk' ? 'Призначений менеджер' : 'Assigned Manager'}
                  </Label>
                  <Select
                    value={formData.assigned_manager_id}
                    onValueChange={(v) => handleChange('assigned_manager_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'uk' ? 'Оберіть менеджера' : 'Select manager'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">{language === 'uk' ? 'Не призначено' : 'Not assigned'}</SelectItem>
                      {managers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Додаткові характеристики */}
              <Accordion type="single" collapsible>
                <AccordionItem value="details">
                  <AccordionTrigger>{language === 'uk' ? 'Додаткові характеристики' : 'Additional Details'}</AccordionTrigger>
                  <AccordionContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="area">{language === 'uk' ? 'Площа (м²)' : 'Area (m²)'}</Label>
                        <Input
                          id="area"
                          type="number"
                          value={formData.area}
                          onChange={(e) => handleChange('area', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rooms">{language === 'uk' ? 'Кімнат' : 'Rooms'}</Label>
                        <Input
                          id="rooms"
                          type="number"
                          value={formData.rooms}
                          onChange={(e) => handleChange('rooms', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="floor">{language === 'uk' ? 'Поверх' : 'Floor'}</Label>
                        <Input
                          id="floor"
                          type="number"
                          value={formData.floor}
                          onChange={(e) => handleChange('floor', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="heating">{language === 'uk' ? 'Опалення' : 'Heating'}</Label>
                        <Input
                          id="heating"
                          value={formData.heating}
                          onChange={(e) => handleChange('heating', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="condition">{language === 'uk' ? 'Стан' : 'Condition'}</Label>
                        <Input
                          id="condition"
                          value={formData.condition}
                          onChange={(e) => handleChange('condition', e.target.value)}
                        />
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Документи */}
              <Accordion type="single" collapsible>
                <AccordionItem value="documents">
                  <AccordionTrigger>{t('properties.documents') || 'Документи'}</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block">
                        {language === 'uk' ? 'Додати документи' : 'Add documents'}
                      </Label>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('doc-upload')?.click()}
                          disabled={uploadingDocs}
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          {language === 'uk' ? 'Завантажити' : 'Upload'}
                        </Button>
                        {uploadingDocs && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                      <input
                        id="doc-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleDocumentUpload}
                      />
                    </div>

                    {documentFiles.length > 0 && (
                      <div className="space-y-2 mt-4">
                        {documentFiles.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-3 bg-muted rounded-md"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="h-5 w-5 text-primary" />
                              <span className="text-sm truncate max-w-[240px]">{doc.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeDocument(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Опис */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('properties.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={5}
                  placeholder={language === 'uk' ? 'Детальний опис об’єкта...' : 'Detailed property description...'}
                />
              </div>

              {/* Посилання */}
              <div className="space-y-2">
                <Label htmlFor="external_link">{t('properties.link')}</Label>
                <Input
                  id="external_link"
                  value={formData.external_link}
                  onChange={(e) => handleChange('external_link', e.target.value)}
                  placeholder="https://..."
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="submit"
                  className="flex-1 gradient-primary text-primary-foreground"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('common.save')
                  )}
                </Button>

                <Button type="button" variant="outline" asChild>
                  <Link to="/properties">{t('common.cancel')}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </AppLayout>
  );
};