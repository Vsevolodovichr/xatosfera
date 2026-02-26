import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, MapPin, Image as ImageIcon } from 'lucide-react';
import pb from '@/integrations/pocketbase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { useLanguage } from '@/contexts/LanguageContext';

type Property = {
  id: string;
  title: string;
  address: string;
  district: string | null;
  operation_type: string | null;
  category: string | null;
  status: string;
  price: number | null;
  currency: string | null;
  area_total: number | null;
  rooms: number | null;
  owner_phones: string[] | null;
  photos: string[];
  created_at: string;
};

const statusColor: Record<string, string> = {
  active: 'bg-success/10 text-success',
  archived: 'bg-muted text-muted-foreground',
};

export const PropertiesPage = () => {
  const { t } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [operationType, setOperationType] = useState('all');
  const [category, setCategory] = useState('all');
  const [priceFrom, setPriceFrom] = useState('');
  const [priceTo, setPriceTo] = useState('');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await pb
          .from('properties')
          .select('id,title,address,district,operation_type,category,status,price,currency,area_total,rooms,owner_phones,photos,created_at')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setProperties((data ?? []) as Property[]);
      } catch (err) {
        console.error('Error fetching properties', err);
      } finally {
        setLoading(false);
      }
    };

    void fetchProperties();
  }, []);

  const filteredProperties = useMemo(
    () =>
      properties.filter((p) => {
        const q = search.toLowerCase().trim();
        const matchesSearch = !q
          || p.id.toLowerCase().includes(q)
          || p.title.toLowerCase().includes(q)
          || p.address.toLowerCase().includes(q)
          || (p.district ?? '').toLowerCase().includes(q)
          || (p.owner_phones ?? []).some((phone) => phone.includes(q));

        const matchesStatus = status === 'all' || p.status === status;
        const matchesOperation = operationType === 'all' || p.operation_type === operationType;
        const matchesCategory = category === 'all' || p.category === category;
        const matchesPriceFrom = !priceFrom || Number(p.price ?? 0) >= Number(priceFrom);
        const matchesPriceTo = !priceTo || Number(p.price ?? 0) <= Number(priceTo);
        return matchesSearch && matchesStatus && matchesOperation && matchesCategory && matchesPriceFrom && matchesPriceTo;
      }),
    [properties, search, status, operationType, category, priceFrom, priceTo],
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold">{t('properties.title')}</h1>
          <Button asChild>
            <Link to="/properties/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('properties.add')}
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle>{t('properties.quickSearch')}</CardTitle></CardHeader>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('properties.searchPlaceholder')} />
            </div>
            <Input type="number" value={priceFrom} onChange={(e) => setPriceFrom(e.target.value)} placeholder={t('properties.priceFrom')} />
            <Input type="number" value={priceTo} onChange={(e) => setPriceTo(e.target.value)} placeholder={t('properties.priceTo')} />
          </CardContent>
        </Card>

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// ... existing code ...

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="filters" className="border-none">
            <Card>
              <AccordionTrigger className="px-6 hover:no-underline font-bold py-4">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  {t('properties.advancedFilter')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('properties.operationType')}</label>
                    <Select value={operationType} onValueChange={setOperationType}>
                      <SelectTrigger><SelectValue placeholder={t('properties.operationType')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('properties.allOperations')}</SelectItem>
                        <SelectItem value="sale">{t('properties.sale')}</SelectItem>
                        <SelectItem value="rent">{t('properties.rent')}</SelectItem>
                        <SelectItem value="new_build">{t('properties.newBuild')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('properties.type')}</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder={t('properties.type')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('properties.allCategories')}</SelectItem>
                        <SelectItem value="apartment">{t('properties.apartment')}</SelectItem>
                        <SelectItem value="house">{t('properties.house')}</SelectItem>
                        <SelectItem value="commercial">{t('properties.commercial')}</SelectItem>
                        <SelectItem value="other">{t('properties.other')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">{t('properties.status')}</label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger><SelectValue placeholder={t('properties.status')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('properties.allStatuses')}</SelectItem>
                        <SelectItem value="active">{t('properties.active')}</SelectItem>
                        <SelectItem value="archived">{t('properties.archived')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" className="w-full" onClick={() => { setStatus('all'); setOperationType('all'); setCategory('all'); setPriceFrom(''); setPriceTo(''); }}>{t('properties.resetFilters')}</Button>
                  </div>
                </div>
              </AccordionContent>
            </Card>
          </AccordionItem>
        </Accordion>

        {loading ? <p>{t('common.loading')}</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{property.title}</CardTitle>
                    <Badge className={statusColor[property.status] ?? statusColor.active}>
                      {property.status === 'active' ? t('properties.active') : t('properties.archived')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {property.address}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {property.photos?.length ? (
                    <Carousel className="w-full">
                      <CarouselContent>
                        {property.photos.map((url, i) => (
                          <CarouselItem key={i}>
                            <img src={url} alt={`${property.title}-${i}`} className="h-44 w-full rounded-md object-cover" />
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </Carousel>
                  ) : (
                    <div className="h-44 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-5 w-5 mr-2" />
                      {t('properties.noPhotos')}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-muted-foreground">{t('properties.price_label')}</span>
                    <strong>{property.price ? new Intl.NumberFormat('uk-UA').format(Number(property.price)) : '—'} {property.currency ?? t('common.uah')}</strong>
                    <span className="text-muted-foreground">{t('properties.typeCategory')}</span>
                    <strong>{property.operation_type ?? '—'} / {property.category ?? '—'}</strong>
                    <span className="text-muted-foreground">{t('properties.roomsArea')}</span>
                    <strong>{property.rooms ?? '—'} / {property.area_total ?? '—'} {t('properties.sqm')}</strong>
                    <span className="text-muted-foreground">{t('properties.district_label')}</span>
                    <strong>{property.district ?? '—'}</strong>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" asChild className="flex-1">
                      <Link to={`/properties/${property.id}/edit`}>{t('properties.edit')}</Link>
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="flex-1"
                      onClick={() => window.open(`/api/generate-presentation/${property.id}`, '_blank')}
                    >
                      Зробити презентацію
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
