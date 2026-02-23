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
  description: string | null;
  address: string;
  city: string | null;
  price: number | null;
  status: string;
  photos: string[];
  created_at: string;
};

const statusColor: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  available: 'bg-info/10 text-info',
  sold: 'bg-success/10 text-success',
  rented: 'bg-warning/10 text-warning',
};

export const PropertiesPage = () => {
  const { language } = useLanguage();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');

  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const { data, error } = await pb
          .from('properties')
          .select('id,title,description,address,city,price,status,photos,created_at')
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
        const q = search.toLowerCase();
        const matchesSearch =
          p.title.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          (p.city ?? '').toLowerCase().includes(q);
        const matchesStatus = status === 'all' || p.status === status;
        return matchesSearch && matchesStatus;
      }),
    [properties, search, status],
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-bold">{language === 'uk' ? 'Об\'єкти' : 'Properties'}</h1>
          <Button asChild>
            <Link to="/properties/new">
              <Plus className="mr-2 h-4 w-4" />
              {language === 'uk' ? 'Додати об\'єкт' : 'Add property'}
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'uk' ? 'Пошук за назвою, адресою, містом...' : 'Search...'} />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'uk' ? 'Всі статуси' : 'All statuses'}</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {loading ? <p>Loading...</p> : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg">{property.title}</CardTitle>
                    <Badge className={statusColor[property.status] ?? statusColor.draft}>{property.status}</Badge>
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
                      {language === 'uk' ? 'Немає фото' : 'No photos'}
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{language === 'uk' ? 'Ціна' : 'Price'}</span>
                    <strong>{property.price ? new Intl.NumberFormat('uk-UA').format(Number(property.price)) : '—'} ₴</strong>
                  </div>

                  <Button variant="outline" asChild className="w-full">
                    <Link to={`/properties/${property.id}/edit`}>{language === 'uk' ? 'Редагувати' : 'Edit'}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
