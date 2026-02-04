import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
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
  X,
  Ruler,
  DoorOpen,
  LayoutGrid,
  User,
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
  photos: string[];
  external_link: string;
  created_at: string;
  area: number | null;
  floor: number | null;
  rooms: number | null;
  heating: string | null;
  condition: string | null;
  user_id: string;
  assigned_manager_id: string | null;
}

interface Manager {
  id: string;
  full_name: string;
}

export const PropertiesPage = () => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [managers, setManagers] = useState<Record<string, Manager>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDealType, setFilterDealType] = useState('all');
  const [filterPropertyCategory, setFilterPropertyCategory] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

      // Fetch manager names for all properties
      const managerIds = new Set<string>();
      (data || []).forEach((p) => {
        if (p.user_id) managerIds.add(p.user_id);
        if (p.assigned_manager_id) managerIds.add(p.assigned_manager_id);
      });

      if (managerIds.size > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', Array.from(managerIds));

        if (profilesData) {
          const managersMap: Record<string, Manager> = {};
          profilesData.forEach((p) => {
            managersMap[p.id] = p;
          });
          setManagers(managersMap);
        }
      }
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

  const clearFilters = () => {
    setSearch('');
    setFilterType('all');
    setFilterDealType('all');
    setFilterPropertyCategory('all');
    setPriceMin('');
    setPriceMax('');
  };

  const hasActiveFilters = search || filterType !== 'all' || 
    filterDealType !== 'all' || filterPropertyCategory !== 'all' || priceMin || priceMax;

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

  const filteredProperties = useMemo(() => {
    return properties.filter((property) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        property.address.toLowerCase().includes(searchLower) ||
        property.owner_name.toLowerCase().includes(searchLower) ||
        (property.description && property.description.toLowerCase().includes(searchLower));

      const matchesType = filterType === 'all' || property.property_type === filterType;
      const matchesDealType = filterDealType === 'all' || property.deal_type === filterDealType;

      const isCommercial = property.property_type === 'commercial';
      const matchesCategory = filterPropertyCategory === 'all' ||
        (filterPropertyCategory === 'commercial' && isCommercial) ||
        (filterPropertyCategory === 'residential' && !isCommercial);

      const matchesPriceMin = !priceMin || property.price >= parseFloat(priceMin);
      const matchesPriceMax = !priceMax || property.price <= parseFloat(priceMax);

      return matchesSearch && matchesType && matchesDealType && 
        matchesCategory && matchesPriceMin && matchesPriceMax;
    });
  }, [properties, search, filterType, filterDealType, filterPropertyCategory, priceMin, priceMax]);

  const formatPrice = (price: number, dealType: string) => {
    const formatted = new Intl.NumberFormat('uk-UA').format(price);
    return dealType === 'rent' ? `₴${formatted}/міс` : `₴${formatted}`;
  };

  const getManagerName = (property: Property) => {
    const creatorId = property.user_id;
    const assignedId = property.assigned_manager_id;
    
    if (assignedId && managers[assignedId]) {
      return managers[assignedId].full_name;
    }
    if (creatorId && managers[creatorId]) {
      return managers[creatorId].full_name;
    }
    return language === 'uk' ? 'Невідомий' : 'Unknown';
  };

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t('properties.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {filteredProperties.length} {language === 'uk' ? 'об\'єктів' : 'properties'}
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
            <div className="space-y-4">
              {/* Main search and quick filters */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={language === 'uk' ? 'Пошук за адресою, власником...' : 'Search by address, owner...'}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterDealType} onValueChange={setFilterDealType}>
                  <SelectTrigger className="w-full md:w-[150px]">
                    <SelectValue placeholder={t('properties.dealType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('properties.all')}</SelectItem>
                    <SelectItem value="sale">{t('deal.sale')}</SelectItem>
                    <SelectItem value="rent">{t('deal.rent')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {language === 'uk' ? 'Більше' : 'More'}
                </Button>
              </div>

              {/* Advanced filters */}
              {showAdvancedFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('properties.type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('properties.all')}</SelectItem>
                      <SelectItem value="apartment">{t('property.apartment')}</SelectItem>
                      <SelectItem value="house">{t('property.house')}</SelectItem>
                      <SelectItem value="commercial">{t('property.commercial')}</SelectItem>
                      <SelectItem value="other">{t('property.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPropertyCategory} onValueChange={setFilterPropertyCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'uk' ? 'Категорія' : 'Category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('properties.all')}</SelectItem>
                      <SelectItem value="residential">
                        {language === 'uk' ? 'Житлова' : 'Residential'}
                      </SelectItem>
                      <SelectItem value="commercial">
                        {language === 'uk' ? 'Комерційна' : 'Commercial'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder={language === 'uk' ? 'Ціна від' : 'Price from'}
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder={language === 'uk' ? 'Ціна до' : 'Price to'}
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </div>
              )}

              {/* Active filters indicator */}
              {hasActiveFilters && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-sm text-muted-foreground">
                    {language === 'uk' ? 'Фільтри активні' : 'Filters active'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 gap-1">
                    <X className="h-3 w-3" />
                    {language === 'uk' ? 'Скинути' : 'Clear'}
                  </Button>
                </div>
              )}
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
                  {/* Manager Badge */}
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {getManagerName(property)}
                    </Badge>
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

                  {/* Property specs */}
                  {(property.area || property.rooms || property.floor) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {property.area && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
                          <Ruler className="h-3 w-3" />
                          {property.area} м²
                        </span>
                      )}
                      {property.rooms && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
                          <DoorOpen className="h-3 w-3" />
                          {property.rooms} {language === 'uk' ? 'кім' : 'rooms'}
                        </span>
                      )}
                      {property.floor && (
                        <span className="flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
                          <LayoutGrid className="h-3 w-3" />
                          {property.floor} {language === 'uk' ? 'пов' : 'fl'}
                        </span>
                      )}
                    </div>
                  )}

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
                        <span>{language === 'uk' ? 'Переглянути оголошення' : 'View listing'}</span>
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
                {hasActiveFilters 
                  ? (language === 'uk' ? 'Не знайдено об\'єктів за заданими критеріями' : 'No properties found matching your criteria')
                  : (language === 'uk' ? 'Додайте перший об\'єкт нерухомості для початку роботи' : 'Add your first property to get started')}
              </p>
              {hasActiveFilters ? (
                <Button onClick={clearFilters} variant="outline">
                  {language === 'uk' ? 'Скинути фільтри' : 'Clear filters'}
                </Button>
              ) : (
                <Button asChild className="gradient-accent text-accent-foreground shadow-accent">
                  <Link to="/properties/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('properties.add')}
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};
