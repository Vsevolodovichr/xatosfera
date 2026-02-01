import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { ArrowLeft, Loader2, Link as LinkIcon, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

export const PropertyFormPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  
  const [formData, setFormData] = useState({
    address: '',
    owner_name: '',
    owner_phone: '',
    description: '',
    property_type: 'apartment',
    deal_type: 'sale',
    price: '',
    status: 'available',
    status_date_from: '',
    status_date_to: '',
    closing_amount: '',
    commission: '',
    external_link: '',
    photos: [] as string[],
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleImport = async () => {
    if (!importUrl) return;

    // Check if it's a valid OLX or DomRia link
    if (!importUrl.includes('olx.ua') && !importUrl.includes('dom.ria.com')) {
      toast.error('Підтримуються тільки посилання з OLX.ua та DomRia');
      return;
    }

    setImportLoading(true);
    try {
      // For now, just set the external link since scraping requires backend
      setFormData((prev) => ({ ...prev, external_link: importUrl }));
      toast.info('Посилання додано. Заповніть решту полів вручну.');
    } catch (error) {
      toast.error('Помилка імпорту даних');
    } finally {
      setImportLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('properties').insert({
        user_id: user.id,
        address: formData.address,
        owner_name: formData.owner_name,
        owner_phone: formData.owner_phone,
        description: formData.description || null,
        property_type: formData.property_type as any,
        deal_type: formData.deal_type as any,
        price: parseFloat(formData.price),
        status: formData.status as any,
        status_date_from: formData.status_date_from || null,
        status_date_to: formData.status_date_to || null,
        closing_amount: formData.closing_amount ? parseFloat(formData.closing_amount) : null,
        commission: formData.commission ? parseFloat(formData.commission) : null,
        external_link: formData.external_link || null,
        photos: formData.photos,
      });

      if (error) throw error;

      toast.success('Об\'єкт успішно додано');
      navigate('/properties');
    } catch (error: any) {
      console.error('Error creating property:', error);
      toast.error(error.message || 'Помилка створення об\'єкту');
    } finally {
      setLoading(false);
    }
  };

  const showClosingFields = formData.status === 'sold' || formData.status === 'rented';

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
            <h1 className="text-2xl font-bold text-foreground">{t('properties.add')}</h1>
            <p className="text-muted-foreground">Заповніть інформацію про об'єкт</p>
          </div>
        </div>

        {/* Import Section */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-primary" />
              {t('properties.importLink')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder={t('properties.importPlaceholder')}
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleImport}
                disabled={importLoading || !importUrl}
                variant="outline"
              >
                {importLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t('properties.import')
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

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
                      <SelectItem value="land">{t('property.land')}</SelectItem>
                      <SelectItem value="office">{t('property.office')}</SelectItem>
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

              {/* Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('properties.status')} *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => handleChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="available">{t('status.available')}</SelectItem>
                      <SelectItem value="sold">{t('status.sold')}</SelectItem>
                      <SelectItem value="rented">{t('status.rented')}</SelectItem>
                      <SelectItem value="not_sold">{t('status.notSold')}</SelectItem>
                      <SelectItem value="not_rented">{t('status.notRented')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_date_from">{t('properties.dateFrom')}</Label>
                  <Input
                    id="status_date_from"
                    type="date"
                    value={formData.status_date_from}
                    onChange={(e) => handleChange('status_date_from', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status_date_to">{t('properties.dateTo')}</Label>
                  <Input
                    id="status_date_to"
                    type="date"
                    value={formData.status_date_to}
                    onChange={(e) => handleChange('status_date_to', e.target.value)}
                  />
                </div>
              </div>

              {/* Closing Fields (conditionally shown) */}
              {showClosingFields && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-success/5 rounded-lg border border-success/20">
                  <div className="space-y-2">
                    <Label htmlFor="closing_amount">{t('properties.closingAmount')} (₴)</Label>
                    <Input
                      id="closing_amount"
                      type="number"
                      value={formData.closing_amount}
                      onChange={(e) => handleChange('closing_amount', e.target.value)}
                      placeholder="100000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commission">{t('properties.commission')} (₴)</Label>
                    <Input
                      id="commission"
                      type="number"
                      value={formData.commission}
                      onChange={(e) => handleChange('commission', e.target.value)}
                      placeholder="5000"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('properties.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Опис об'єкту нерухомості..."
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
