import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, ArrowRight, Home } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cloudflareApi } from '@/integrations/cloudflare/client';

type Match = {
  id: string;
  sourceType: 'property' | 'client';
  property: { title: string; price: number; rooms: number; manager: string };
  client: { name: string; budget: number; rooms_needed: number; manager: string };
  score: number;
};

export const MatchesPage = () => {
  const { language } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const calculateMatches = async () => {
      try {
        const { data: properties } = await cloudflareApi.from('properties').select('*');
        const { data: clients } = await cloudflareApi.from('clients').select('*');
        const { data: users } = await cloudflareApi.from('users').select('id, full_name');

        if (!properties || !clients) return;

        const foundMatches: Match[] = [];
        const userMap = new Map(users?.map(u => [u.id, u.full_name]));

        // Логіка порівняння: Ціна та Кількість кімнат
        properties.forEach((prop: any) => {
          clients.forEach((client: any) => {
            let score = 0;
            
            // 1. Порівняння ціни (вага 50%)
            // Якщо ціна об'єкта в межах бюджету клієнта +/- 10%
            const priceDiff = Math.abs(prop.price - client.budget) / client.budget;
            if (priceDiff <= 0.1) score += 50;
            else if (priceDiff <= 0.2) score += 25;

            // 2. Порівняння кімнат (вага 50%)
            if (prop.rooms === client.rooms_needed) score += 50;
            else if (Math.abs(prop.rooms - client.rooms_needed) === 1) score += 20;

            // Якщо загальний збіг >= 75% (як просив користувач)
            if (score >= 75) {
              foundMatches.push({
                id: `${prop.id}-${client.id}`,
                sourceType: 'property',
                property: { 
                  title: prop.title, 
                  price: prop.price, 
                  rooms: prop.rooms, 
                  manager: userMap.get(prop.manager_id) || 'Невідомий' 
                },
                client: { 
                  name: client.full_name, 
                  budget: client.budget, 
                  rooms_needed: client.rooms_needed,
                  manager: userMap.get(client.created_by) || 'Невідомий'
                },
                score
              });
            }
          });
        });

        setMatches(foundMatches);
      } catch (err) {
        console.error('Match calculation error:', err);
      } finally {
        setLoading(false);
      }
    };

    calculateMatches();
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            {language === 'uk' ? 'Розумні співпадіння' : 'Smart Matches'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'uk' 
              ? 'Автоматичний пошук за ціною (відхилення до 10%) та кількістю кімнат' 
              : 'Auto-search by price (up to 10% deviation) and room count'}
          </p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="grid gap-4">
            {matches.length > 0 ? matches.map((match) => (
              <Card key={match.id} className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                      {match.score}% {language === 'uk' ? 'збіг' : 'match'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4">
                    {/* Об'єкт */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <Building2 className="h-4 w-4 text-primary" />
                        {match.property.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {match.property.price.toLocaleString()} ₴ • {match.property.rooms} к.
                      </div>
                      <div className="text-[10px] uppercase font-bold text-blue-600">
                        Менеджер: {match.property.manager}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <ArrowRight className="h-5 w-5 text-muted-foreground hidden md:block" />
                      <div className="h-px w-full bg-border md:hidden my-2" />
                    </div>

                    {/* Клієнт */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-bold">
                        <User className="h-4 w-4 text-orange-500" />
                        {match.client.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Бюджет: {match.client.budget.toLocaleString()} ₴ • Потрібно: {match.client.rooms_needed} к.
                      </div>
                      <div className="text-[10px] uppercase font-bold text-orange-600">
                        Менеджер: {match.client.manager}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <div className="text-center py-20 bg-muted/20 rounded-xl border-2 border-dashed">
                <Home className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">Наразі ідеальних співпадінь не знайдено</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};
