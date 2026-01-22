'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  X,
  FileText,
  User,
  Plus,
  Trash2,
  Loader2,
  Search,
  Copy,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  Receipt,
  Package,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { quotationService, QuotationFormData, QuotationDetail } from "@/services/quotationService";
import { customerService, Address, Contact } from "@/services/customerService";
import { serviceService } from "@/services/serviceService";
import { packageService } from "@/services/packageService";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

// Form Schema
const quotationFormSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  contactId: z.coerce.number().min(1, "Contact is required"),
  addressId: z.coerce.number().min(1, "Address is required"),
  quoDate: z.string().min(1, "Quotation date is required"),
  priority: z.enum(["normal", "urgent", "very urgent"]).default("normal"),
  samplingRequest: z.boolean().default(false),
  samplingDate: z.string().optional(),
  minVolumeSample: z.string().optional(),
  remarks: z.string().optional(),
  percentDiscount: z.coerce.number().min(0).max(100).default(0),
  percentVat: z.coerce.number().min(0).max(100).default(11),
});

type FormData = z.infer<typeof quotationFormSchema>;

interface CustomerOption {
  id: number;
  code: string;
  customer_name: string;
  addresses: Address[];
  contacts: Contact[];
}

interface ServiceOption {
  id: number;
  code: string;
  name: string;
  price: number;
  parameter?: { id: number; name: string };
  method?: { id: number; name: string };
}

interface PackageOption {
  id: number;
  code: string;
  name: string;
  price: number;
  services?: Array<{ id: number; code: string; name: string; price: number | { value: number } }>;
}

interface PackageServiceInfo {
  id: number;
  name: string;
  price: number;
  parameter?: { id: number; name: string };
  method?: { id: number; name: string };
}

interface SampleServiceItem {
  id: string;
  type: 'service' | 'package';
  itemId: number;
  name: string;
  code: string;
  parameter?: string;
  method?: string;
  price: number;
  discount: number;
  quantity: number;
  detailId?: number; // For tracking existing detail records
  packageServices?: PackageServiceInfo[]; // Services inside a package
}

interface SampleItem {
  id: string;
  name: string;
  quantity: number;
  priority: 'normal' | 'urgent' | 'very urgent';
  services: SampleServiceItem[];
  isExpanded: boolean;
}

interface ProductItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
  detailId?: number; // For tracking existing detail records
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const getPriorityCharge = (priority: string) => {
  switch (priority) {
    case 'urgent': return 50;
    case 'very urgent': return 100;
    default: return 0;
  }
};

// Helper to safely parse price (handles object {value: number} or direct number/string)
const parsePrice = (price: unknown): number => {
  if (price === null || price === undefined) return 0;
  if (typeof price === 'number') return isNaN(price) ? 0 : price;
  if (typeof price === 'object' && price !== null && 'value' in price) {
    return parsePrice((price as { value: unknown }).value);
  }
  if (typeof price === 'string') {
    const parsed = parseFloat(price);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// Sortable Service Row Component
interface SortableServiceRowProps {
  svc: SampleServiceItem;
  sampleId: string;
  onRemove: (sampleId: string, serviceId: string) => void;
  onUpdateDiscount: (sampleId: string, serviceId: string, discount: number) => void;
}

function SortableServiceRow({ svc, sampleId, onRemove, onUpdateDiscount }: SortableServiceRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: svc.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} className={isDragging ? 'bg-muted/50' : ''}>
      <TableCell className="w-[40px] align-top">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="align-top">
        <Badge variant={svc.type === 'package' ? 'default' : 'secondary'}>
          {svc.type === 'package' ? 'Package' : 'Service'}
        </Badge>
      </TableCell>
      <TableCell className="font-medium align-top">
        <div>
          <div className="font-semibold" dangerouslySetInnerHTML={{ __html: svc.name }} />
          {svc.type === 'package' && svc.packageServices && svc.packageServices.length > 0 && (
            <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
              {svc.packageServices.map((pkgSvc, idx) => (
                <li key={`${svc.id}-${pkgSvc.id}-${idx}`} dangerouslySetInnerHTML={{ __html: pkgSvc.name }} />
              ))}
            </ul>
          )}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground align-top">
        {svc.type === 'package' && svc.packageServices && svc.packageServices.length > 0
          ? 'Various Methods'
          : svc.method || '-'}
      </TableCell>
      <TableCell className="text-right align-top">
        {svc.discount > 0 ? (
          <div>
            <span className="line-through text-muted-foreground text-xs">{formatCurrency(svc.price)}</span>
            <br />
            <span className="text-green-600 font-medium">{formatCurrency(svc.price * (1 - svc.discount / 100))}</span>
          </div>
        ) : (
          formatCurrency(svc.price)
        )}
      </TableCell>
      <TableCell className="text-center align-top">
        <div className="flex items-center justify-center gap-1">
          <Input
            type="number"
            min={0}
            max={100}
            value={svc.discount}
            onChange={(e) => onUpdateDiscount(sampleId, svc.id, parseFloat(e.target.value) || 0)}
            className="h-8 w-16 text-center"
          />
          <span className="text-muted-foreground">%</span>
        </div>
      </TableCell>
      <TableCell className="align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => onRemove(sampleId, svc.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function QuotationEditPage() {
  const router = useRouter();
  const params = useParams();
  const quotationId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Customer state
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerOption[]>([]);
  const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false);
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Service search state (per sample)
  const [serviceSearchQueries, setServiceSearchQueries] = useState<Record<string, string>>({});
  const [serviceSearchResults, setServiceSearchResults] = useState<ServiceOption[]>([]);
  const [loadingServiceSearch, setLoadingServiceSearch] = useState(false);
  const [openServicePopover, setOpenServicePopover] = useState<string | null>(null);

  // Package search state (per sample)
  const [packageSearchQueries, setPackageSearchQueries] = useState<Record<string, string>>({});
  const [packageSearchResults, setPackageSearchResults] = useState<PackageOption[]>([]);
  const [loadingPackageSearch, setLoadingPackageSearch] = useState(false);
  const [openPackagePopover, setOpenPackagePopover] = useState<string | null>(null);

  // Add sample form state
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [newSampleName, setNewSampleName] = useState('');
  const [newSampleQuantity, setNewSampleQuantity] = useState(1);

  // Add product form state
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductQuantity, setNewProductQuantity] = useState(1);
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [newProductDiscount, setNewProductDiscount] = useState(0);

  const form = useForm<FormData>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: {
      customerId: 0,
      contactId: 0,
      addressId: 0,
      quoDate: new Date().toISOString().split('T')[0],
      priority: "normal",
      samplingRequest: false,
      samplingDate: "",
      minVolumeSample: "",
      remarks: "",
      percentDiscount: 0,
      percentVat: 11,
    },
  });

  const priority = form.watch("priority");
  const percentDiscount = form.watch("percentDiscount");
  const percentVat = form.watch("percentVat");
  const customerId = form.watch("customerId");

  // Group quotation details by sample name
  const groupDetailsBySample = useCallback((details: QuotationDetail[]): Map<string, QuotationDetail[]> => {
    const sampleMap = new Map<string, QuotationDetail[]>();

    details.forEach(detail => {
      const sampleName = detail.sampleName || 'Unnamed Sample';
      if (!sampleMap.has(sampleName)) {
        sampleMap.set(sampleName, []);
      }
      sampleMap.get(sampleName)!.push(detail);
    });

    return sampleMap;
  }, []);

  // Load quotation data
  const loadQuotationData = useCallback(async () => {
    if (!quotationId) return;

    try {
      setIsLoading(true);

      // Fetch quotation data and details in parallel
      const [response, detailsResponse] = await Promise.all([
        quotationService.getById(quotationId),
        quotationService.getDetails(quotationId),
      ]);

      if (!response.success || !response.data) {
        toast.error('Quotation not found');
        router.push('/operational/quotation');
        return;
      }

      const quotation = response.data;
      const details = detailsResponse.data || [];
      setCode(quotation.code);

      // Set form values
      const quoDate = quotation.quo_date ? new Date(quotation.quo_date).toISOString().split('T')[0] : '';
      form.setValue('quoDate', quoDate);
      form.setValue('priority', (quotation.priority as 'normal' | 'urgent' | 'very urgent') || 'normal');
      form.setValue('percentDiscount', quotation.percent_discount || 0);
      form.setValue('percentVat', quotation.percent_vat || 11);
      form.setValue('minVolumeSample', quotation.min_volume_sample || '');
      form.setValue('remarks', quotation.remarks || '');
      form.setValue('samplingRequest', quotation.sampling_request === '1' || quotation.sampling_request === 'true');
      form.setValue('samplingDate', quotation.sampling_date ? new Date(quotation.sampling_date).toISOString().split('T')[0] : '');

      // Set customer data
      if (quotation.customer && quotation.customer_id) {
        form.setValue('customerId', quotation.customer_id);

        // Fetch full customer data to get contacts and addresses
        try {
          const customerResponse = await customerService.getById(quotation.customer_id);
          if (customerResponse.data) {
            const customerData: CustomerOption = {
              id: customerResponse.data.id,
              code: customerResponse.data.code,
              customer_name: customerResponse.data.customer_name,
              addresses: customerResponse.data.addresses || [],
              contacts: customerResponse.data.contacts || [],
            };
            setSelectedCustomer(customerData);

            // Set contact and address after customer is loaded
            if (quotation.contact_id) {
              form.setValue('contactId', quotation.contact_id);
            }
            if (quotation.address_id) {
              form.setValue('addressId', quotation.address_id);
            }
          }
        } catch (err) {
          console.error('Error fetching customer details:', err);
          // Fallback - set basic customer info
          setSelectedCustomer({
            id: quotation.customer.id,
            code: quotation.customer.code,
            customer_name: quotation.customer.customer_name,
            addresses: quotation.address ? [quotation.address] : [],
            contacts: quotation.contact ? [{
              id: quotation.contact.id,
              first_name: quotation.contact.first_name,
              middle_name: quotation.contact.middle_name,
              surname: quotation.contact.surname,
              email: quotation.contact.email || '',
              phone: quotation.contact.phone || '',
              department: quotation.contact.department,
              position: '',
              customer_id: quotation.customer_id!,
            }] : [],
          });
        }
      }

      // Parse quotation details into samples
      if (details && details.length > 0) {
        const sampleMap = groupDetailsBySample(details);

        // Sample names to exclude (handled in Additional Products section)
        const excludedSampleNames = ['transportation fee', 'additional'];

        const loadedSamples: SampleItem[] = [];
        let sampleIndex = 0;

        sampleMap.forEach((details, sampleName) => {
          // Skip excluded samples (Transportation Fee, Additional, etc.)
          if (excludedSampleNames.includes(sampleName.toLowerCase())) {
            return;
          }

          // Get sample quantity from first detail (they should all have the same)
          const sampleQuantity = details[0]?.quantity || 1;
          const samplePriority = (details[0]?.priority as 'normal' | 'urgent' | 'very urgent') || 'normal';

          // Deduplicate packages - keep only one entry per packageId
          const seenPackageIds = new Set<number>();
          const sampleServices: SampleServiceItem[] = details
            .filter(detail => detail.product !== 1) // Exclude products
            .map((detail, idx) => {
              if (detail.packageId && detail.package) {
                // Skip duplicate packages
                if (seenPackageIds.has(detail.packageId)) {
                  return null;
                }
                seenPackageIds.add(detail.packageId);
                return {
                  id: `pkg-${Date.now()}-${sampleIndex}-${idx}`,
                  type: 'package' as const,
                  itemId: detail.packageId,
                  name: detail.package.name,
                  code: detail.package.code || `PKG-${detail.packageId}`,
                  price: parsePrice(detail.package.totalPrice) || parsePrice(detail.price) || 0,
                  discount: parsePrice(detail.percentDiscount) || 0,
                  quantity: 1,
                  detailId: detail.id,
                  packageServices: detail.package.services || [],
                };
              } else if (detail.serviceId && detail.service) {
                return {
                  id: `svc-${Date.now()}-${sampleIndex}-${idx}`,
                  type: 'service' as const,
                  itemId: detail.serviceId,
                  name: detail.service.name,
                  code: detail.service.code || `SVC-${detail.serviceId}`,
                  parameter: detail.service.parameter?.name,
                  method: detail.service.method?.name,
                  price: parsePrice(detail.service.price) || parsePrice(detail.price) || 0,
                  discount: parsePrice(detail.percentDiscount) || 0,
                  quantity: 1,
                  detailId: detail.id,
                };
              }
              return null;
            }).filter((item): item is NonNullable<typeof item> => item !== null) as SampleServiceItem[];

          loadedSamples.push({
            id: `sample-${Date.now()}-${sampleIndex}`,
            name: sampleName,
            quantity: sampleQuantity,
            priority: samplePriority,
            services: sampleServices,
            isExpanded: true,
          });

          sampleIndex++;
        });

        setSamples(loadedSamples);
      }

      // Load products (items with product === 1)
      const productDetails = details.filter(d => d.product === 1);
      if (productDetails.length > 0) {
        const loadedProducts: ProductItem[] = productDetails.map((detail, idx) => ({
          id: `product-${Date.now()}-${idx}`,
          name: detail.sampleName || '',
          quantity: detail.quantity || 1,
          price: parsePrice(detail.price),
          discount: parsePrice(detail.percentDiscount),
          detailId: detail.id,
        }));
        setProducts(loadedProducts);
      }

    } catch (error) {
      console.error('Error loading quotation:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('quotation')));
      router.push('/operational/quotation');
    } finally {
      setIsLoading(false);
    }
  }, [quotationId, form, router, groupDetailsBySample]);

  useEffect(() => {
    loadQuotationData();
  }, [loadQuotationData]);

  // Debounced customer search
  useEffect(() => {
    if (customerSearchQuery.length < 2) {
      setCustomerSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingCustomerSearch(true);
      try {
        const response = await customerService.getJson({ q: customerSearchQuery });
        const items = response.items || (response as any).data || [];
        setCustomerSearchResults(items.map((c: any) => ({
          id: c.id,
          code: c.code || '',
          customer_name: c.customer_name,
          addresses: c.addresses || [],
          contacts: c.contacts || [],
        })));
      } catch (error) {
        console.error('Error searching customers:', error);
        setCustomerSearchResults([]);
      } finally {
        setLoadingCustomerSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  // Debounced service search
  useEffect(() => {
    const activeSearch = openServicePopover ? serviceSearchQueries[openServicePopover] : '';
    if (!activeSearch || activeSearch.length < 2) {
      setServiceSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingServiceSearch(true);
      try {
        const response = await serviceService.getJson({ q: activeSearch });
        const items = response.items || response.data || [];
        setServiceSearchResults(items.map((s: any) => ({
          id: s.id,
          code: s.code || '',
          name: s.name,
          price: s.price || 0,
          parameter: s.parameter,
          method: s.method,
        })));
      } catch (error) {
        console.error('Error searching services:', error);
        setServiceSearchResults([]);
      } finally {
        setLoadingServiceSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [serviceSearchQueries, openServicePopover]);

  // Debounced package search
  useEffect(() => {
    const activeSearch = openPackagePopover ? packageSearchQueries[openPackagePopover] : '';
    if (!activeSearch || activeSearch.length < 2) {
      setPackageSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingPackageSearch(true);
      try {
        const response = await packageService.getJson({ q: activeSearch });
        const items = response.items || response.data || [];
        setPackageSearchResults(items.map((p: any) => ({
          id: p.id,
          code: p.code || '',
          name: p.name,
          price: p.price?.value || 0,
          services: p.services,
        })));
      } catch (error) {
        console.error('Error searching packages:', error);
        setPackageSearchResults([]);
      } finally {
        setLoadingPackageSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [packageSearchQueries, openPackagePopover]);

  // Sample management
  const addSample = () => {
    if (!newSampleName.trim()) {
      toast.error('Sample name is required');
      return;
    }
    const newSample: SampleItem = {
      id: `sample-${Date.now()}`,
      name: newSampleName,
      quantity: newSampleQuantity,
      priority: priority,
      services: [],
      isExpanded: true,
    };
    setSamples(prev => [...prev, newSample]);
    setNewSampleName('');
    setNewSampleQuantity(1);
    setIsAddingSample(false);
    toast.success('Sample added');
  };

  const removeSample = (sampleId: string) => {
    setSamples(prev => prev.filter(s => s.id !== sampleId));
  };

  const copySample = (sampleId: string) => {
    const sample = samples.find(s => s.id === sampleId);
    if (!sample) return;

    const baseName = sample.name.replace(/\s*\(\d+\)$/, '').replace(/\s*\d+$/, '').trim();
    const existingNames = samples.map(s => s.name);
    let copyNumber = 2;
    let newName = `${baseName} ${copyNumber}`;
    while (existingNames.includes(newName)) {
      copyNumber++;
      newName = `${baseName} ${copyNumber}`;
    }

    const newSample: SampleItem = {
      id: `sample-${Date.now()}`,
      name: newName,
      quantity: sample.quantity,
      priority: sample.priority,
      services: sample.services.map(svc => ({
        ...svc,
        id: `${svc.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        detailId: undefined, // Remove detail ID for copied items
      })),
      isExpanded: true,
    };
    setSamples(prev => [...prev, newSample]);
    toast.success(`Sample copied as "${newName}"`);
  };

  const toggleSampleExpanded = (sampleId: string) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };

  const updateSampleName = (sampleId: string, name: string) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, name } : s
    ));
  };

  const updateSampleQuantity = (sampleId: string, quantity: number) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, quantity } : s
    ));
  };

  const addServiceToSample = (sampleId: string, service: ServiceOption) => {
    const newService: SampleServiceItem = {
      id: `svc-${Date.now()}`,
      type: 'service',
      itemId: service.id,
      name: service.name,
      code: service.code,
      parameter: service.parameter?.name,
      method: service.method?.name,
      price: parsePrice(service.price),
      discount: 0,
      quantity: 1,
    };
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, services: [...s.services, newService] } : s
    ));
    setServiceSearchQueries(prev => ({ ...prev, [sampleId]: '' }));
    setOpenServicePopover(null);
  };

  const addPackageToSample = (sampleId: string, pkg: PackageOption) => {
    // Map package services to PackageServiceInfo format
    const packageServices: PackageServiceInfo[] = pkg.services?.map(svc => ({
      id: svc.id,
      name: svc.name,
      price: parsePrice(svc.price),
    })) || [];

    const newPackage: SampleServiceItem = {
      id: `pkg-${Date.now()}`,
      type: 'package',
      itemId: pkg.id,
      name: pkg.name,
      code: pkg.code,
      price: parsePrice(pkg.price),
      discount: 0,
      quantity: 1,
      packageServices,
    };
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, services: [...s.services, newPackage] } : s
    ));
    setPackageSearchQueries(prev => ({ ...prev, [sampleId]: '' }));
    setOpenPackagePopover(null);
  };

  const removeServiceFromSample = (sampleId: string, serviceId: string) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, services: s.services.filter(svc => svc.id !== serviceId) } : s
    ));
  };

  const updateServiceDiscount = (sampleId: string, serviceId: string, discount: number) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? {
        ...s,
        services: s.services.map(svc =>
          svc.id === serviceId ? { ...svc, discount } : svc
        )
      } : s
    ));
  };

  const reorderServicesInSample = (sampleId: string, oldIndex: number, newIndex: number) => {
    setSamples(prev => prev.map(s => {
      if (s.id !== sampleId) return s;
      const newServices = arrayMove(s.services, oldIndex, newIndex);
      return { ...s, services: newServices };
    }));
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (sampleId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const sample = samples.find(s => s.id === sampleId);
      if (!sample) return;
      const oldIndex = sample.services.findIndex(svc => svc.id === active.id);
      const newIndex = sample.services.findIndex(svc => svc.id === over.id);
      reorderServicesInSample(sampleId, oldIndex, newIndex);
    }
  };

  // Product management
  const addProduct = () => {
    if (!newProductName.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (newProductPrice <= 0) {
      toast.error('Product price must be greater than 0');
      return;
    }
    const newProduct: ProductItem = {
      id: `product-${Date.now()}`,
      name: newProductName,
      quantity: newProductQuantity,
      price: newProductPrice,
      discount: newProductDiscount,
    };
    setProducts(prev => [...prev, newProduct]);
    setNewProductName('');
    setNewProductQuantity(1);
    setNewProductPrice(0);
    setNewProductDiscount(0);
    setIsAddingProduct(false);
    toast.success('Product added');
  };

  const removeProduct = (productId: string) => {
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  const updateProductName = (productId: string, name: string) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, name } : p
    ));
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, quantity } : p
    ));
  };

  const updateProductPrice = (productId: string, price: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, price } : p
    ));
  };

  const updateProductDiscount = (productId: string, discount: number) => {
    setProducts(prev => prev.map(p =>
      p.id === productId ? { ...p, discount } : p
    ));
  };

  // Calculate totals - priority charge is based on quotation-level priority
  const { subTotal, discountAmount, afterDiscount, pcAmount, vatAmount, total } = useMemo(() => {
    const pc = getPriorityCharge(priority); // Use quotation-level priority

    let subTotal = 0;

    // Calculate samples subtotal
    samples.forEach(sample => {
      sample.services.forEach(svc => {
        const price = parsePrice(svc.price);
        const discount = parsePrice(svc.discount);
        const qty = parsePrice(svc.quantity) || 1;
        const sampleQty = parsePrice(sample.quantity) || 1;
        const itemPrice = price * qty;
        const itemDiscount = itemPrice * (discount / 100);
        subTotal += (itemPrice - itemDiscount) * sampleQty;
      });
    });

    // Calculate products subtotal (products don't have priority charge)
    products.forEach(product => {
      const price = parsePrice(product.price);
      const discount = parsePrice(product.discount);
      const qty = parsePrice(product.quantity) || 1;
      const itemPrice = price * qty;
      const itemDiscount = itemPrice * (discount / 100);
      subTotal += itemPrice - itemDiscount;
    });

    const discountAmount = subTotal * (percentDiscount / 100);
    const afterDiscount = subTotal - discountAmount;
    const pcAmount = Math.round(afterDiscount * (pc / 100)); // Priority charge from after discount
    const afterPc = afterDiscount + pcAmount;
    const vatAmount = afterPc * (percentVat / 100);
    const total = afterPc + vatAmount;

    return { subTotal, discountAmount, afterDiscount, pcAmount, vatAmount, total };
  }, [samples, products, priority, percentDiscount, percentVat]);

  // Available contacts and addresses
  const availableContacts = selectedCustomer?.contacts || [];
  const availableAddresses = selectedCustomer?.addresses || [];

  const onSubmit = async (data: FormData) => {
    // Validation: must have at least one sample or one product
    if (samples.length === 0 && products.length === 0) {
      toast.error('Please add at least one sample or product');
      return;
    }

    // All samples must have at least one service/package
    const hasEmptySamples = samples.some(s => s.services.length === 0);
    if (samples.length > 0 && hasEmptySamples) {
      toast.error('All samples must have at least one service or package');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: QuotationFormData = {
        quo_date: data.quoDate,
        customer_id: data.customerId,
        contact_id: data.contactId,
        address_id: data.addressId,
        priority: data.priority,
        sampling_request: data.samplingRequest,
        sampling_date: data.samplingRequest ? data.samplingDate : null,
        min_volume_sample: data.minVolumeSample || '',
        remarks: data.remarks || null,
        percent_discount: data.percentDiscount,
        percent_vat: data.percentVat,
        percent_pc: getPriorityCharge(data.priority),
        sub_total: subTotal,
        samples: samples.map(sample => ({
          name: sample.name,
          quantity: sample.quantity,
          priority: sample.priority,
          services: sample.services
            .filter(svc => svc.type === 'service')
            .map((svc) => {
              // Find original index in the full services array to preserve order
              const originalIndex = sample.services.findIndex(s => s.id === svc.id);
              return {
                id: svc.itemId,
                quantity: svc.quantity,
                discount: svc.discount,
                id_detail: svc.detailId,
                order: originalIndex,
              };
            }),
          packages: sample.services
            .filter(svc => svc.type === 'package')
            .map((svc) => {
              // Find original index in the full services array to preserve order
              const originalIndex = sample.services.findIndex(s => s.id === svc.id);
              return {
                id: svc.itemId,
                quantity: svc.quantity,
                discount: svc.discount,
                id_detail: svc.detailId ? String(svc.detailId) : undefined,
                order: originalIndex,
              };
            }),
        })),
        products: products.map(product => ({
          name: product.name,
          quantity: product.quantity,
          price: product.price,
          discount: product.discount,
          id_detail: product.detailId,
        })),
      };

      // Debug: Log the payload to see what orders are being sent
      console.log('=== QUOTATION UPDATE PAYLOAD ===');
      payload.samples?.forEach((sample, idx) => {
        console.log(`Sample ${idx}: ${sample.name}`);
        console.log('Services:', sample.services?.map(s => ({ id: s.id, id_detail: s.id_detail, order: s.order })));
        console.log('Packages:', sample.packages?.map(p => ({ id: p.id, id_detail: p.id_detail, order: p.order })));
      });

      await quotationService.update(quotationId, payload);
      toast.success('Quotation updated successfully');
      router.push(`/operational/quotation/${quotationId}`);
    } catch (error) {
      console.error('Error updating quotation:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.UPDATE('quotation')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/operational/quotation/${quotationId}`)}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Edit Quotation
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {code}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/operational/quotation/${quotationId}`)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Customer Info Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Customer Search */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Customer <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover
                      open={openCustomerPopover}
                      onOpenChange={(open) => {
                        setOpenCustomerPopover(open);
                        if (!open) setCustomerSearchQuery("");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 border-muted font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedCustomer
                              ? `${selectedCustomer.code} - ${selectedCustomer.customer_name}`
                              : "Search customer..."}
                            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                        <Command shouldFilter={false}>
                          <div className="flex items-center px-3 py-2 border-b">
                            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                            <input
                              type="text"
                              placeholder="Type at least 2 characters..."
                              value={customerSearchQuery}
                              onChange={(e) => setCustomerSearchQuery(e.target.value)}
                              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                          <CommandList className="max-h-48">
                            {loadingCustomerSearch ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              </div>
                            ) : customerSearchQuery.length < 2 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
                              </div>
                            ) : customerSearchResults.length === 0 ? (
                              <CommandEmpty>No customer found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {customerSearchResults.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={String(customer.id)}
                                    onSelect={() => {
                                      field.onChange(customer.id);
                                      setSelectedCustomer(customer);
                                      form.setValue('contactId', 0);
                                      form.setValue('addressId', 0);
                                      setOpenCustomerPopover(false);
                                      setCustomerSearchQuery("");
                                    }}
                                    className="cursor-pointer"
                                  >
                                    {customer.code} - {customer.customer_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Select */}
              <FormField
                control={form.control}
                name="contactId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Contact <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={String(field.value || '')}
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      disabled={!customerId}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder={customerId ? "Select contact" : "Select customer first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableContacts.map((contact) => (
                          <SelectItem key={contact.id} value={String(contact.id)}>
                            {[contact.first_name, contact.middle_name, contact.surname].filter(Boolean).join(' ')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address Select */}
              <FormField
                control={form.control}
                name="addressId"
                render={({ field }) => {
                  const selectedAddress = availableAddresses.find(addr => addr.id === field.value);
                  return (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Address <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={String(field.value || '')}
                        onValueChange={(val) => field.onChange(parseInt(val))}
                        disabled={!customerId}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                            <SelectValue placeholder={customerId ? "Select address" : "Select customer first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableAddresses.map((address) => (
                            <SelectItem key={address.id} value={String(address.id)}>
                              {address.address_type} - {address.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedAddress && (
                        <p className="text-xs text-muted-foreground pt-1">
                          {[
                            selectedAddress.address,
                            selectedAddress.city,
                            selectedAddress.state,
                            selectedAddress.postal_code,
                            selectedAddress.country
                          ].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quotation Info Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Quotation Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="quoDate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Quotation Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Priority
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent (+25% PC)</SelectItem>
                        <SelectItem value="very urgent">Very Urgent (+50% PC)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percentDiscount"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Discount (%)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="percentVat"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      VAT (%)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="minVolumeSample"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Min Sample Volume
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 500ml, 1kg"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="samplingRequest"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/30">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Sampling Request
                      </FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Enable if sampling is required
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {form.watch('samplingRequest') && (
                <FormField
                  control={form.control}
                  name="samplingDate"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Sampling Date
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Remarks
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes..."
                      {...field}
                      rows={3}
                      className="bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Samples Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <FlaskConical className="h-4 w-4 text-primary" />
                </div>
                Samples & Services
                <span className="text-sm font-normal text-muted-foreground">({samples.length})</span>
              </CardTitle>
              {!isAddingSample && (
                <Button
                  type="button"
                  onClick={() => setIsAddingSample(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Sample
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Add Sample Form */}
            {isAddingSample && (
              <div className="p-4 border-b bg-primary/5">
                <div className="flex items-end gap-4">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sample Name
                    </label>
                    <Input
                      value={newSampleName}
                      onChange={(e) => setNewSampleName(e.target.value)}
                      placeholder="Enter sample name..."
                      className="h-10 bg-background"
                      autoFocus
                    />
                  </div>
                  <div className="w-32 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={newSampleQuantity}
                      onChange={(e) => setNewSampleQuantity(parseInt(e.target.value) || 1)}
                      className="h-10 bg-background"
                    />
                  </div>
                  <Button type="button" onClick={addSample} className="h-10">
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingSample(false);
                      setNewSampleName('');
                      setNewSampleQuantity(1);
                    }}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Samples List */}
            {samples.length === 0 && !isAddingSample ? (
              <div className="text-center py-12 text-muted-foreground">
                <FlaskConical className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No samples added yet.</p>
                <p className="text-sm">Click &quot;Add Sample&quot; to start adding services.</p>
              </div>
            ) : (
              <div className="divide-y">
                {samples.map((sample) => (
                  <Collapsible
                    key={sample.id}
                    open={sample.isExpanded}
                    onOpenChange={() => toggleSampleExpanded(sample.id)}
                  >
                    {/* Sample Header */}
                    <div className="flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/40 transition-colors">
                      <CollapsibleTrigger asChild>
                        <button type="button" className="flex items-center gap-3 flex-1 text-left">
                          {sample.isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                          <span className="font-medium">{sample.name}</span>
                          <Badge variant="outline">Qty: {sample.quantity}</Badge>
                          {sample.priority !== 'normal' && (
                            <Badge
                              variant={sample.priority === 'very urgent' ? 'destructive' : 'outline'}
                              className={sample.priority === 'urgent' ? 'text-orange-600 border-orange-600' : ''}
                            >
                              {sample.priority}
                            </Badge>
                          )}
                        </button>
                      </CollapsibleTrigger>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => copySample(sample.id)}
                          title="Copy sample"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeSample(sample.id)}
                          title="Delete sample"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Sample Content */}
                    <CollapsibleContent>
                      {/* Sample Details Section */}
                      <div className="p-4 bg-muted/5 border-b">
                        <p className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                          Sample Details
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Sample Name</label>
                            <Input
                              value={sample.name}
                              onChange={(e) => updateSampleName(sample.id, e.target.value)}
                              className="h-9"
                              placeholder="Enter sample name"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs text-muted-foreground">Quantity</label>
                            <Input
                              type="number"
                              min={1}
                              value={sample.quantity}
                              onChange={(e) => updateSampleQuantity(sample.id, parseInt(e.target.value) || 1)}
                              className="h-9"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Service/Package Search */}
                      <div className="p-4 bg-muted/10 border-b">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Add Service */}
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                              Add Service
                            </label>
                            <Popover
                              open={openServicePopover === sample.id}
                              onOpenChange={(open) => {
                                setOpenServicePopover(open ? sample.id : null);
                                if (!open) setServiceSearchQueries(prev => ({ ...prev, [sample.id]: '' }));
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between h-10 bg-background font-normal"
                                >
                                  <span className="text-muted-foreground">Search service...</span>
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command shouldFilter={false}>
                                  <div className="flex items-center px-3 py-2 border-b">
                                    <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <input
                                      type="text"
                                      placeholder="Type at least 2 characters..."
                                      value={serviceSearchQueries[sample.id] || ''}
                                      onChange={(e) => setServiceSearchQueries(prev => ({
                                        ...prev,
                                        [sample.id]: e.target.value
                                      }))}
                                      className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                    />
                                  </div>
                                  <CommandList className="max-h-48">
                                    {loadingServiceSearch ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                      </div>
                                    ) : (serviceSearchQueries[sample.id]?.length || 0) < 2 ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        Type at least 2 characters to search
                                      </div>
                                    ) : serviceSearchResults.length === 0 ? (
                                      <CommandEmpty>No service found</CommandEmpty>
                                    ) : (
                                      <CommandGroup>
                                        {serviceSearchResults.map((service) => (
                                          <CommandItem
                                            key={service.id}
                                            value={String(service.id)}
                                            onSelect={() => addServiceToSample(sample.id, service)}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex flex-col">
                                              <span dangerouslySetInnerHTML={{ __html: `${service.code} - ${service.name}` }} />
                                              <span className="text-xs text-muted-foreground">
                                                {formatCurrency(service.price)}
                                              </span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>

                          {/* Add Package */}
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground uppercase tracking-wide">
                              Add Package
                            </label>
                            <Popover
                              open={openPackagePopover === sample.id}
                              onOpenChange={(open) => {
                                setOpenPackagePopover(open ? sample.id : null);
                                if (!open) setPackageSearchQueries(prev => ({ ...prev, [sample.id]: '' }));
                              }}
                            >
                              <PopoverTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full justify-between h-10 bg-background font-normal"
                                >
                                  <span className="text-muted-foreground">Search package...</span>
                                  <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                <Command shouldFilter={false}>
                                  <div className="flex items-center px-3 py-2 border-b">
                                    <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                    <input
                                      type="text"
                                      placeholder="Type at least 2 characters..."
                                      value={packageSearchQueries[sample.id] || ''}
                                      onChange={(e) => setPackageSearchQueries(prev => ({
                                        ...prev,
                                        [sample.id]: e.target.value
                                      }))}
                                      className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                    />
                                  </div>
                                  <CommandList className="max-h-48">
                                    {loadingPackageSearch ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                      </div>
                                    ) : (packageSearchQueries[sample.id]?.length || 0) < 2 ? (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                        Type at least 2 characters to search
                                      </div>
                                    ) : packageSearchResults.length === 0 ? (
                                      <CommandEmpty>No package found</CommandEmpty>
                                    ) : (
                                      <CommandGroup>
                                        {packageSearchResults.map((pkg) => (
                                          <CommandItem
                                            key={pkg.id}
                                            value={String(pkg.id)}
                                            onSelect={() => addPackageToSample(sample.id, pkg)}
                                            className="cursor-pointer"
                                          >
                                            <div className="flex flex-col">
                                              <span dangerouslySetInnerHTML={{ __html: `${pkg.code} - ${pkg.name}` }} />
                                              <span className="text-xs text-muted-foreground">
                                                {formatCurrency(pkg.price)}
                                              </span>
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    )}
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      </div>

                      {/* Services Table */}
                      {sample.services.length > 0 ? (
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd(sample.id)}
                        >
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-muted/10">
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead className="w-[100px]">Type</TableHead>
                                <TableHead>Service/Package</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead className="text-right w-[130px]">Price</TableHead>
                                <TableHead className="text-center w-[100px]">Discount</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <SortableContext
                                items={sample.services.map(svc => svc.id)}
                                strategy={verticalListSortingStrategy}
                              >
                                {sample.services.map((svc) => (
                                  <SortableServiceRow
                                    key={svc.id}
                                    svc={svc}
                                    sampleId={sample.id}
                                    onRemove={removeServiceFromSample}
                                    onUpdateDiscount={updateServiceDiscount}
                                  />
                                ))}
                              </SortableContext>
                            </TableBody>
                          </Table>
                        </DndContext>
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          No services added to this sample yet.
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Products Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                Additional Products
                <span className="text-sm font-normal text-muted-foreground">({products.length})</span>
              </CardTitle>
              {!isAddingProduct && (
                <Button
                  type="button"
                  onClick={() => setIsAddingProduct(true)}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Product
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Add Product Form */}
            {isAddingProduct && (
              <div className="p-4 border-b bg-primary/5">
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Product Name
                    </label>
                    <Input
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      placeholder="Enter product name..."
                      className="h-10 bg-background"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={newProductQuantity}
                      onChange={(e) => setNewProductQuantity(parseInt(e.target.value) || 1)}
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Price
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={newProductPrice}
                      onChange={(e) => setNewProductPrice(parseFloat(e.target.value) || 0)}
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Discount %
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={newProductDiscount}
                      onChange={(e) => setNewProductDiscount(parseFloat(e.target.value) || 0)}
                      className="h-10 bg-background"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingProduct(false);
                      setNewProductName('');
                      setNewProductQuantity(1);
                      setNewProductPrice(0);
                      setNewProductDiscount(0);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={addProduct}>
                    Add Product
                  </Button>
                </div>
              </div>
            )}

            {/* Products Table */}
            {products.length === 0 && !isAddingProduct ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No additional products added yet.</p>
                <p className="text-sm">Click &quot;Add Product&quot; to add extra items.</p>
              </div>
            ) : products.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/10">
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-center w-[100px]">Quantity</TableHead>
                    <TableHead className="text-right w-[150px]">Price</TableHead>
                    <TableHead className="text-center w-[100px]">Discount</TableHead>
                    <TableHead className="text-right w-[150px]">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => {
                    const productSubtotal = (product.price * product.quantity) * (1 - product.discount / 100);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <Input
                            value={product.name}
                            onChange={(e) => updateProductName(product.id, e.target.value)}
                            className="h-8"
                            placeholder="Product name"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Input
                            type="number"
                            min={1}
                            value={product.quantity}
                            onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value) || 1)}
                            className="h-8 w-20 text-center mx-auto"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={product.price}
                            onChange={(e) => updateProductPrice(product.id, parseFloat(e.target.value) || 0)}
                            className="h-8 w-28 text-right ml-auto"
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={product.discount}
                              onChange={(e) => updateProductDiscount(product.id, parseFloat(e.target.value) || 0)}
                              className="h-8 w-16 text-center"
                            />
                            <span className="text-muted-foreground">%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(productSubtotal)}
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => removeProduct(product.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Summary Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              Pricing Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="max-w-md ml-auto space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subTotal)}</span>
              </div>
              {percentDiscount > 0 && (
                <div className="flex justify-between items-center text-sm text-destructive">
                  <span>Discount ({percentDiscount}%)</span>
                  <span>- {formatCurrency(discountAmount)}</span>
                </div>
              )}
              {percentDiscount > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">After Discount</span>
                  <span className="font-medium">{formatCurrency(afterDiscount)}</span>
                </div>
              )}
              {getPriorityCharge(priority) > 0 && (
                <div className="flex justify-between items-center text-sm text-orange-600">
                  <span>Priority Charge ({getPriorityCharge(priority)}%)</span>
                  <span>+ {formatCurrency(pcAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">VAT ({percentVat}%)</span>
                <span className="font-medium">+ {formatCurrency(vatAmount)}</span>
              </div>
              <div className="border-t pt-3 mt-3 flex justify-between items-center">
                <span className="font-semibold">Grand Total</span>
                <span className="text-xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
