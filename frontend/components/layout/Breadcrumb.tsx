'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

// Route configuration for breadcrumb generation
const routeConfig: Record<string, { section: string; parent?: string; label: string; basePath?: string }> = {
  '/': { section: 'Overview', label: 'Dashboard' },
  '/settings': { section: 'Settings', label: 'Settings' },
  
  // Master Data - Service Catalog
  '/master/method': { section: 'Master Data', parent: 'Service Catalog', label: 'Method' },
  '/master/matrix': { section: 'Master Data', parent: 'Service Catalog', label: 'Matrix' },
  '/master/parameter': { section: 'Master Data', parent: 'Service Catalog', label: 'Parameter' },
  '/master/laboratory': { section: 'Master Data', parent: 'Service Catalog', label: 'Laboratory' },
  '/master/units': { section: 'Master Data', parent: 'Service Catalog', label: 'Units' },
  '/master/service': { section: 'Master Data', parent: 'Service Catalog', label: 'Service' },
  '/master/catalog-services': { section: 'Master Data', parent: 'Service Catalog', label: 'Catalog Services' },
  '/master/subcontractor': { section: 'Master Data', parent: 'Service Catalog', label: 'Subcontractor' },
  '/master/package': { section: 'Master Data', parent: 'Service Catalog', label: 'Package' },
  '/master/standard': { section: 'Master Data', parent: 'Service Catalog', label: 'Standard' },
  
  // Master Data - Customer
  '/master/customer': { section: 'Master Data', parent: 'Customer', label: 'Customer' },
  '/master/contact': { section: 'Master Data', parent: 'Customer', label: 'Contact' },
  
  // Operational - Transaction
  '/operational/quotation': { section: 'Operational', parent: 'Transaction', label: 'Quotation' },
};

// Pattern matching for dynamic routes
const dynamicRoutePatterns = [
  { pattern: /^\/master\/method\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Method', basePath: '/master/method' }, detail: 'Detail' },
  { pattern: /^\/master\/matrix\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Matrix', basePath: '/master/matrix' }, detail: 'Detail' },
  { pattern: /^\/master\/parameter\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Parameter', basePath: '/master/parameter' }, detail: 'Detail' },
  { pattern: /^\/master\/laboratory\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Laboratory', basePath: '/master/laboratory' }, detail: 'Detail' },
  { pattern: /^\/master\/units\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Units', basePath: '/master/units' }, detail: 'Detail' },
  { pattern: /^\/master\/service\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Service', basePath: '/master/service' }, detail: 'Detail' },
  { pattern: /^\/master\/catalog-services\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Catalog Services', basePath: '/master/catalog-services' }, detail: 'Detail' },
  { pattern: /^\/master\/subcontractor\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Subcontractor', basePath: '/master/subcontractor' }, detail: 'Detail' },
  { pattern: /^\/master\/package\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Package', basePath: '/master/package' }, detail: 'Detail' },
  { pattern: /^\/master\/standard\/(.+)$/, config: { section: 'Master Data', parent: 'Service Catalog', label: 'Standard', basePath: '/master/standard' }, detail: 'Detail' },
  { pattern: /^\/master\/customer\/(.+)$/, config: { section: 'Master Data', parent: 'Customer', label: 'Customer', basePath: '/master/customer' }, detail: 'Detail' },
  { pattern: /^\/master\/contact\/(.+)$/, config: { section: 'Master Data', parent: 'Customer', label: 'Contact', basePath: '/master/contact' }, detail: 'Detail' },
  { pattern: /^\/operational\/quotation\/(.+)$/, config: { section: 'Operational', parent: 'Transaction', label: 'Quotation', basePath: '/operational/quotation' }, detail: 'Detail' },
];

export function Breadcrumb() {
  const pathname = usePathname();
  
  let config = routeConfig[pathname];
  let isDetailPage = false;
  let basePath = '';
  
  // Check for dynamic routes if no exact match
  if (!config) {
    for (const route of dynamicRoutePatterns) {
      if (route.pattern.test(pathname)) {
        config = route.config;
        isDetailPage = true;
        basePath = route.config.basePath || '';
        break;
      }
    }
  }
  
  if (!config) {
    return (
      <div className="flex items-center text-sm gap-2">
        <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
          <Home className="h-4 w-4" />
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-primary font-medium">Page</span>
      </div>
    );
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: config.section },
  ];

  if (config.parent) {
    breadcrumbItems.push({ label: config.parent });
  }

  breadcrumbItems.push({ label: config.label, path: isDetailPage ? basePath : undefined });

  if (isDetailPage) {
    breadcrumbItems.push({ label: 'Detail' });
  }

  return (
    <div className="flex items-center text-sm gap-2">
      <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-muted-foreground">/</span>
          {index === breadcrumbItems.length - 1 ? (
            <span className="text-primary font-medium">{item.label}</span>
          ) : item.path ? (
            <Link href={item.path} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-muted-foreground">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  );
}
