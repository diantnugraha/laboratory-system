import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { UserProfileDropdown } from './UserProfileDropdown';
import { Breadcrumb } from './Breadcrumb';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="h-16 border-b border-border flex items-center px-6 bg-card shrink-0 sticky top-0 z-10">
            <SidebarTrigger className="mr-4" />
            <Breadcrumb />
            <div className="flex-1" />
            <UserProfileDropdown />
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}

