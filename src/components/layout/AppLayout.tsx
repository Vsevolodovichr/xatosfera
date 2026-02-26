import { ReactNode } from 'react';
import { AppSidebar } from './AppSidebar';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout = ({ children }: AppLayoutProps) => {
  return (
    <div className="min-h-screen flex bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto relative mt-16 lg:mt-0">
        <div className="container py-6 lg:py-8 px-4 lg:px-8 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
};
