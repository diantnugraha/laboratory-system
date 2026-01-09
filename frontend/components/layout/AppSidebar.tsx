'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FlaskConical, 
  ChevronDown,
  Beaker,
  Grid3X3,
  Gauge,
  Building2,
  Ruler,
  Wrench,
  BookOpen,
  Factory,
  Package,
  Award,
  Users,
  Contact,
  Settings,
  FileText,
  ClipboardList,
  UserCog,
  CheckCircle,
  DollarSign,
  Calendar
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

const serviceCatalogItems = [
  { title: 'Method', url: '/master/method' },
  { title: 'Matrix', url: '/master/matrix' },
  { title: 'Parameter', url: '/master/parameter' },
  { title: 'Laboratory', url: '/master/laboratory' },
  { title: 'Units', url: '/master/units' },
  { title: 'Service', url: '/master/service' },
  { title: 'Categories Services', url: '/master/categories-services' },
  { title: 'Package', url: '/master/package' },
  { title: 'Standard', url: '/master/standard' },
];

const customerItems = [
  { title: 'Customer', url: '/master/customer' },
  { title: 'Contract', url: '/master/contract' },
  { title: 'Subcontractor', url: '/master/subcontractor' },
];

const userItems = [
  { title: 'User', url: '/master/user' },
  { title: 'Analyst Type', url: '/master/user/analyst' },
];

const transactionItems = [
  { title: 'Quotation', url: '/operational/quotation' },
  { title: 'Preorder', url: '/operational/preorder' },
  { title: 'Order', url: '/operational/order' },
  { title: 'Sample', url: '/operational/sample' },
  { title: 'Worksheet', url: '/operational/worksheet' },
  { title: 'COA (Certificate)', url: '/operational/coa' },
];

const approvalItems = [
  { title: 'Review Order', url: '/approval/review-order' },
  { title: 'QC Verification', url: '/approval/qc-verification' },
  { title: 'TM Verification', url: '/approval/tm-verification' },
  { title: 'Analyst Worksheet', url: '/approval/analyst-worksheet' },
];

const financeItems = [
  { title: 'Invoice', url: '/finance/invoice' },
];

const settingItems = [
  { title: 'Public Holiday', url: '/setting/public-holiday' },
];

export function AppSidebar() {
  const pathname = usePathname();
  
  // Keep submenu open if current route matches any child
  const isServiceCatalogActive = useMemo(() => 
    serviceCatalogItems.some(item => pathname?.startsWith(item.url)),
    [pathname]
  );
  
  const isCustomerActive = useMemo(() => 
    customerItems.some(item => pathname?.startsWith(item.url)),
    [pathname]
  );

  const isUserActive = useMemo(() => 
    userItems.some(item => pathname?.startsWith(item.url)),
    [pathname]
  );

  const isTransactionActive = useMemo(() => 
    transactionItems.some(item => pathname?.startsWith(item.url)),
    [pathname]
  );

  const isApprovalActive = useMemo(() => 
    approvalItems.some(item => pathname?.startsWith(item.url)),
    [pathname]
  );

  const isFinanceActive = useMemo(() => 
    financeItems.some(item => pathname?.startsWith(item.url)),
    [pathname]
  );

  const isSettingActive = useMemo(() => 
    settingItems.some(item => pathname?.startsWith(item.url)),
    [pathname]
  );

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="h-16 flex flex-row items-center justify-start gap-0 p-0 px-3 border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <FlaskConical className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-sidebar-foreground">SIMLab</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Overview Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Overview
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-10">
                  <NavLink 
                    to="/" 
                    end
                    className="flex items-center gap-3 px-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                    activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="font-medium">Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Master Data Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Master Data
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Service Catalog */}
              <Collapsible defaultOpen={isServiceCatalogActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "h-10 w-full justify-between px-3 rounded-lg transition-colors",
                      isServiceCatalogActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4" />
                        <span className="font-medium">Service Catalog</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-7 mt-1 border-l border-sidebar-border pl-3">
                      {serviceCatalogItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-8">
                            <NavLink 
                              to={item.url}
                              className="flex items-center px-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                              activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Customer */}
              <Collapsible defaultOpen={isCustomerActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "h-10 w-full justify-between px-3 rounded-lg transition-colors",
                      isCustomerActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">Customer</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-7 mt-1 border-l border-sidebar-border pl-3">
                      {customerItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-8">
                            <NavLink 
                              to={item.url}
                              className="flex items-center px-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                              activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* User */}
              <Collapsible defaultOpen={isUserActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "h-10 w-full justify-between px-3 rounded-lg transition-colors",
                      isUserActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                      <div className="flex items-center gap-3">
                        <UserCog className="h-4 w-4" />
                        <span className="font-medium">User</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-7 mt-1 border-l border-sidebar-border pl-3">
                      {userItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-8">
                            <NavLink 
                              to={item.url}
                              end={item.url === '/master/user'}
                              className="flex items-center px-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                              activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Operational Section */}
        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
            Operational
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <Collapsible defaultOpen={isTransactionActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "h-10 w-full justify-between px-3 rounded-lg transition-colors",
                      isTransactionActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                      <div className="flex items-center gap-3">
                        <ClipboardList className="h-4 w-4" />
                        <span className="font-medium">Transaction</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-7 mt-1 border-l border-sidebar-border pl-3">
                      {transactionItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-8">
                            <NavLink 
                              to={item.url}
                              className="flex items-center px-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                              activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Approval */}
              <Collapsible defaultOpen={isApprovalActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "h-10 w-full justify-between px-3 rounded-lg transition-colors",
                      isApprovalActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Approval</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-7 mt-1 border-l border-sidebar-border pl-3">
                      {approvalItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-8">
                            <NavLink 
                              to={item.url}
                              className="flex items-center px-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                              activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Finance */}
              <Collapsible defaultOpen={isFinanceActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "h-10 w-full justify-between px-3 rounded-lg transition-colors",
                      isFinanceActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                      <div className="flex items-center gap-3">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">Finance</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-7 mt-1 border-l border-sidebar-border pl-3">
                      {financeItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-8">
                            <NavLink 
                              to={item.url}
                              className="flex items-center px-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                              activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>

              {/* Setting */}
              <Collapsible defaultOpen={isSettingActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className={cn(
                      "h-10 w-full justify-between px-3 rounded-lg transition-colors",
                      isSettingActive 
                        ? "bg-primary/10 text-primary hover:bg-primary/15" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    )}>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium">Setting</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenu className="ml-7 mt-1 border-l border-sidebar-border pl-3">
                      {settingItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton asChild className="h-8">
                            <NavLink 
                              to={item.url}
                              className="flex items-center px-3 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                              activeClassName="bg-primary/10 text-primary hover:bg-primary/15"
                            >
                              <span>{item.title}</span>
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-10">
              <NavLink 
                to="/settings" 
                className="flex items-center gap-3 px-3 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-primary text-primary-foreground hover:bg-primary"
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">Settings</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
