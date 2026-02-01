import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Phone,
  ExternalLink,
  Edit,
  Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface Property {
  id: string;
  address: string;
  owner_name: string;
  owner_phone: string;
  description: string;
  property_type: string;
  deal_type: string;
  price: number;
  status: string;
  photos: string[];
  external_link: string;
  created_at: string;
}

export const PropertiesPage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchProperties();
  }, [user]);

  const fetchProperties = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error: any) {
      console.error('Error fetching properties:', error);
      toast.error('Помилка завантаження об\'єктів');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ви впевнені, що хочете видалити цей об\'єкт?')) return;

    try {
      const { error } = await supabase.from('properties').delete().eq('id', id);
      if (error) throw error;
      toast.success('Об\'єкт видалено');
      fetchProperties();
    } catch (error: any) {
      toast.error('Помилка видалення');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      available: { label: t('status.available'), className: 'status-available' },
      sold: { label: t('status.sold'), className: 'status-sold' },
      rented: { label: t('status.rented'), className: 'status-rented' },
      not_sold: { label: t('status.notSold'), className: 'bg-muted text-muted-foreground' },
      not_rented: { label: t('status.notRented'), className: 'bg-muted text-muted-foreground' },
    };
    const variant = variants[status] || { label: status, className: '' };
    return <Badge className={`${variant.className} border`}>{variant.label}</Badge>;
  };

  const getDealTypeBadge = (dealType: string) => {
    return dealType === 'sale' ? (
      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
        {t('deal.sale')}
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-info/5 text-info border-info/20">
        {t('deal.rent')}
      </Badge>
    );
  };

  const filteredProperties = properties.filter((property) => {
    const matchesSearch =
      property.address.toLowerCase().includes(search.toLowerCase()) ||
      property.owner_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || property.deal_type === filterType;
    const matchesStatus = filterStatus === 'all' || property.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatPrice = (price: number, dealType: string) => {
    const formatted = new Intl.NumberFormat('uk-UA').format(price);
    return dealType === 'rent' ? `₴${formatted}/міс` : `₴${formatted}`;
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('properties.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {filteredProperties.length} {filteredProperties.length === 1 ? 'об\'єкт' : 'об\'єктів'}
            </p>
          </div>
          <Button asChild className="gradient-accent text-accent-foreground shadow-accent hover:opacity-90">
            <Link to="/properties/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('properties.add')}
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('properties.search')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder={t('properties.dealType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('properties.all')}</SelectItem>
                  <SelectItem value="sale">{t('deal.sale')}</SelectItem>
                  <SelectItem value="rent">{t('deal.rent')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder={t('properties.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('properties.all')}</SelectItem>
                  <SelectItem value="available">{t('status.available')}</SelectItem>
                  <SelectItem value="sold">{t('status.sold')}</SelectItem>
                  <SelectItem value="rented">{t('status.rented')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Properties Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="shadow-card border-0 animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property, index) => (
              <Card
                key={property.id}
                className="shadow-card border-0 hover:shadow-lg transition-all duration-300 overflow-hidden animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Image */}
                <div className="relative h-48 bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
                  {property.photos && property.photos.length > 0 ? (
                    <img
                      src={property.photos[0]}
                      alt={property.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Building2 className="h-16 w-16 text-muted-foreground/30" />
                  )}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {getDealTypeBadge(property.deal_type)}
                  </div>
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(property.status)}
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xl font-bold text-foreground">
                        {formatPrice(property.price, property.deal_type)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(`property.${property.property_type}`)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/properties/${property.id}/edit`}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t('properties.edit')}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(property.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('properties.delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{property.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4 flex-shrink-0" />
                      <span>{property.owner_phone}</span>
                    </div>
                    {property.external_link && (
                      <a
                        href={property.external_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Переглянути оголошення</span>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card border-0">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                <Building2 className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('common.noData')}</h3>
              <p className="text-muted-foreground text-center mb-6">
                Додайте перший об'єкт нерухомості для початку роботи
              </p>
              <Button asChild className="gradient-accent text-accent-foreground shadow-accent">
                <Link to="/properties/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('properties.add')}
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};
