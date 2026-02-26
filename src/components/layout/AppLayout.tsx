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
        
        {/* Floating Message Button */}
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl bg-yellow-400 hover:bg-yellow-500 text-black z-50 flex items-center justify-center border-2 border-white/20 transition-all hover:scale-110 active:scale-95 transition-all"
          size="icon"
          onClick={() => window.open('https://t.me/your_support_handle', '_blank')}
        >
          <MessageCircle className="h-7 w-7" />
        </Button>
      </main>
    </div>
  );
};
