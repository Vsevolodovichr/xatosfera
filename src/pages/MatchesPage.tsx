import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, User, ArrowRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import pb from '@/integrations/pocketbase/client';

type Match = {
  id: string;
  type: 'property' | 'client';
  score: number;
  source_name: string;
  matched_name: string;
  manager_name: string;
  created_at: string;
};

export const MatchesPage = () => {
  const { language } = useLanguage();
  const [matches, setMatches] = useState<Match[]>([]);

  useEffect(() => {
    // Mock data based on 75% match logic requirement
    setMatches([
      {
        id: '1',
        type: 'property',
        score: 85,
        source_name: 'Квартира на Соборній',
        matched_name: 'Клієнт Іван (Шукає центр)',
        manager_name: 'Олександр М.',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        type: 'client',
        score: 78,
        source_name: 'Клієнт Марія (Будинок)',
        matched_name: 'Будинок в пригороді',
        manager_name: 'Тетяна К.',
        created_at: new Date().toISOString()
      }
    ]);
  }, []);

  return (
    <AppLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">
          {language === 'uk' ? 'Співпадіння та сповіщення' : 'Matches & Notifications'}
        </h1>
        
        <div className="grid gap-4">
          {matches.map((match) => (
            <Card key={match.id} className="border-l-4 border-l-blue-500 overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 space-y-2 w-full">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-blue-600 bg-blue-50 border-blue-200">
                      {match.score}% співпадіння
                    </Badge>
                    <span className="text-xs text-muted-foreground">{new Date(match.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-semibold flex items-center gap-1">
                      {match.type === 'property' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      {match.source_name}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm font-semibold flex items-center gap-1">
                      {match.type === 'property' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      {match.matched_name}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Менеджер: <span className="font-medium text-foreground">{match.manager_name}</span>
                  </div>
                </div>
                
                <Badge variant="secondary" className="whitespace-nowrap">
                  Переглянути деталі
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};
