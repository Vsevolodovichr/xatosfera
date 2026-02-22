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
import { validateFile, generateSafeFilename } from '@/lib/file-validation';
import pb from '@/integrations/pocketbase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

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
      const { data, error } = await pb
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          address: data.address || '',
          owner_name: data.owner_name || '',
          owner_phone: data.owner_phone || '',
          description: data.description || '',
          property_type: data.property_type || 'apartment',
          deal_type: data.deal_type || 'sale',
          price: data.price?.toString() || '',
          external_link: data.external_link || '',
          photos: data.photos || [],
          area: data.area?.toString() || '',
          floor: data.floor?.toString() || '',
          heating: data.heating || '',
          rooms: data.rooms?.toString() || '',
          condition: data.condition || '',
          documents: data.documents || [],
          assigned_manager_id: data.assigned_manager_id || '',
        });

        if (data.documents && data.documents.length > 0) {
          setDocumentFiles(data.documents.map((url: string) => ({
            name: url.split('/').pop() || 'document',
            url,
          })));
        }
      }
    } catch (error: any) {
      console.error('Error fetching property:', error);
      toast.error('Помилка завантаження об\'єкту');
      navigate('/properties');
    } finally {
      setFetchLoading(false);
    }
  };

  const fetchManagers = async () => {
    try {
      const { data } = await pb
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (data) {
        setManagers(data);
      }
    } catch (error) {
      console.error('Error fetching managers:', error);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploadingDocs(true);
    try {
      const newDocs: { name: string; url: string }[] = [];
      const fileArray = Array.from(files);

      for (const file of fileArray) {
        const validation = validateFile(file);
        if (!validation.valid) {
          toast.error(`${file.name}: ${validation.error}`);
          continue;
        }

        const safeFileName = generateSafeFilename(user.id, file.name);

        const { error: uploadError } = await pb.storage
          .from('property-documents')
          .upload(safeFileName, file);

        if (uploadError) throw uploadError;

        newDocs.push({ name: file.name, url: safeFileName });
      }

      if (newDocs.length > 0) {
        setDocumentFiles((prev) => [...prev, ...newDocs]);
        setFormData((prev) => ({
          ...prev,
          documents: [...prev.documents, ...newDocs.map((d) => d.url)],
        }));
        toast.success('Документи завантажено');
      }
    } catch (error: any) {
      console.error('Error uploading documents:', error);
      toast.error('Помилка завантаження документів');
    } finally {
      setUploadingDocs(false);
    }
  };

  const removeDocument = async (index: number) => {
    const doc = documentFiles[index];
    try {
      const filePath = doc.url.split('/').slice(-2).join('/');
      await pb.storage.from('property-documents').remove([filePath]);

      setDocumentFiles((prev) => prev.filter((_, i) => i !== index));
      setFormData((prev) => ({
        ...prev,
        documents: prev.documents.filter((_, i) => i !== index),
      }));
    } catch (error) {
      console.error('Error removing document:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;

    setLoading(true);
    try {
      const { error } = await pb
        .from('properties')
        .update({
          address: formData.address,
          owner_name: formData.owner_name,
          owner_phone: formData.owner_phone,
          description: formData.description || null,
          property_type: formData.property_type as any,
          deal_type: formData.deal_type as any,
          price: parseFloat(formData.price),
          external_link: formData.external_link || null,
          photos: formData.photos,
          area: formData.area ? parseFloat(formData.area) : null,
          floor: formData.floor ? parseInt(formData.floor) : null,
          heating: formData.heating || null,
          rooms: formData.rooms ? parseInt(formData.rooms) : null,
          condition: formData.condition || null,
          documents: formData.documents,
          assigned_manager_id: formData.assigned_manager_id || null,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Об\'єкт успішно оновлено');
      navigate('/properties');
    } catch (error: any) {
      console.error('Error updating property:', error);
      toast.error(error.message || 'Помилка оновлення об\'єкту');
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link to="/properties">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'uk' ? 'Редагувати об\'єкт' : 'Edit Property'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'uk' ? 'Оновіть інформацію про об\'єкт' : 'Update property information'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card className="shadow-card border-0">
            <CardContent className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">{t('properties.address')} *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    placeholder="вул. Хрещатик, 1, м. Київ"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_name">{t('properties.ownerName')} *</Label>
                  <Input
                    id="owner_name"
                    value={formData.owner_name}
                    onChange={(e) => handleChange('owner_name', e.target.value)}
                    placeholder="Іваненко Іван Іванович"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="owner_phone">{t('properties.ownerPhone')} *</Label>
                  <Input
                    id="owner_phone"
                    value={formData.owner_phone}
                    onChange={(e) => handleChange('owner_phone', e.target.value)}
                    placeholder="+380 XX XXX XX XX"
                    required
                  />
                </div>
              </div>

              {/* Property Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('properties.type')} *</Label>
                  <Select
                    value={formData.property_type}
                    onValueChange={(value) => handleChange('property_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="apartment">{t('property.apartment')}</SelectItem>
                      <SelectItem value="house">{t('property.house')}</SelectItem>
                      <SelectItem value="commercial">{t('property.commercial')}</SelectItem>
                      <SelectItem value="other">{t('property.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t('properties.dealType')} *</Label>
                  <Select
                    value={formData.deal_type}
                    onValueChange={(value) => handleChange('deal_type', value)}
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

                <div className="space-y-2">
                  <Label htmlFor="price">{t('properties.price')} (₴) *</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => handleChange('price', e.target.value)}
                    placeholder="100000"
                    required
                  />
                </div>
              </div>

              {/* Assigned Manager (only for top_manager and superuser) */}
              {canAssignManager && (
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {language === 'uk' ? 'Відповідальний менеджер' : 'Assigned Manager'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Select
                      value={formData.assigned_manager_id}
                      onValueChange={(value) => handleChange('assigned_manager_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'uk' ? 'Оберіть менеджера (необов\'язково)' : 'Select manager (optional)'} />
                      </SelectTrigger>
                      <SelectContent>
                        {managers.map((manager) => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      {language === 'uk' 
                        ? 'Якщо не обрано, відповідальним буде той, хто додав об\'єкт' 
                        : 'If not selected, the creator will be the responsible manager'}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* General Info Accordion */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="general">
                  <AccordionTrigger className="text-base font-medium">
                    {language === 'uk' ? 'Загальне' : 'General'}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                      <div className="space-y-2">
                        <Label htmlFor="area">
                          {language === 'uk' ? 'Площа (м²)' : 'Area (m²)'}
                        </Label>
                        <Input
                          id="area"
                          type="number"
                          step="0.1"
                          value={formData.area}
                          onChange={(e) => handleChange('area', e.target.value)}
                          placeholder="50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="floor">
                          {language === 'uk' ? 'Поверх' : 'Floor'}
                        </Label>
                        <Input
                          id="floor"
                          type="number"
                          value={formData.floor}
                          onChange={(e) => handleChange('floor', e.target.value)}
                          placeholder="5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="rooms">
                          {language === 'uk' ? 'Кількість кімнат' : 'Rooms'}
                        </Label>
                        <Input
                          id="rooms"
                          type="number"
                          value={formData.rooms}
                          onChange={(e) => handleChange('rooms', e.target.value)}
                          placeholder="2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>{language === 'uk' ? 'Опалення' : 'Heating'}</Label>
                        <Select
                          value={formData.heating}
                          onValueChange={(value) => handleChange('heating', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'uk' ? 'Оберіть' : 'Select'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="central">
                              {language === 'uk' ? 'Центральне' : 'Central'}
                            </SelectItem>
                            <SelectItem value="individual">
                              {language === 'uk' ? 'Індивідуальне' : 'Individual'}
                            </SelectItem>
                            <SelectItem value="gas">
                              {language === 'uk' ? 'Газове' : 'Gas'}
                            </SelectItem>
                            <SelectItem value="electric">
                              {language === 'uk' ? 'Електричне' : 'Electric'}
                            </SelectItem>
                            <SelectItem value="none">
                              {language === 'uk' ? 'Відсутнє' : 'None'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>{language === 'uk' ? 'Стан' : 'Condition'}</Label>
                        <Select
                          value={formData.condition}
                          onValueChange={(value) => handleChange('condition', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={language === 'uk' ? 'Оберіть' : 'Select'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">
                              {language === 'uk' ? 'Новобудова' : 'New'}
                            </SelectItem>
                            <SelectItem value="renovated">
                              {language === 'uk' ? 'З ремонтом' : 'Renovated'}
                            </SelectItem>
                            <SelectItem value="good">
                              {language === 'uk' ? 'Хороший' : 'Good'}
                            </SelectItem>
                            <SelectItem value="needs_repair">
                              {language === 'uk' ? 'Потребує ремонту' : 'Needs Repair'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="documents">
                  <AccordionTrigger className="text-base font-medium">
                    {language === 'uk' ? 'Документи' : 'Documents'}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={handleDocumentUpload}
                          className="hidden"
                          id="doc-upload"
                          disabled={uploadingDocs}
                        />
                        <label htmlFor="doc-upload" className="cursor-pointer">
                          {uploadingDocs ? (
                            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
                          ) : (
                            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                          )}
                          <p className="text-sm text-muted-foreground mt-2">
                            {language === 'uk'
                              ? 'Натисніть для завантаження документів'
                              : 'Click to upload documents'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            PDF, JPG, PNG, DOC
                          </p>
                        </label>
                      </div>

                      {documentFiles.length > 0 && (
                        <div className="space-y-2">
                          {documentFiles.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="h-5 w-5 text-primary" />
                                <span className="text-sm truncate max-w-[200px]">{doc.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDocument(index)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('properties.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder={language === 'uk' ? 'Опис об\'єкту нерухомості...' : 'Property description...'}
                  rows={4}
                />
              </div>

              {/* External Link */}
              <div className="space-y-2">
                <Label htmlFor="external_link">{t('properties.link')}</Label>
                <Input
                  id="external_link"
                  value={formData.external_link}
                  onChange={(e) => handleChange('external_link', e.target.value)}
                  placeholder="https://www.olx.ua/..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
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
