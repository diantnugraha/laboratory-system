'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
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
  GripVertical,
  Pencil,
} from "lucide-react";
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
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { quotationService, QuotationFormData } from "@/services/quotationService";
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
  services?: Array<{ id: number; code: string; name: string; price: { value: number } }>;
}

interface PackageServiceInfo {
  id: number;
  name: string;
  price: number;
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
  packageServices?: PackageServiceInfo[];
}

interface SampleItem {
  id: string;
  name: string;
  quantity: number;
  priority: 'normal' | 'urgent' | 'very urgent';
  services: SampleServiceItem[];
  isExpanded: boolean;
  isDetailsExpanded: boolean;
}

// Minimum quotation values (same as backend)
const MIN_TOTAL = 200000;
const MIN_VAT = 22000;
const MIN_GRAND_TOTAL = 222000;

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

// Fetch full service details by ID
const fetchServiceDetails = async (serviceId: number) => {
  try {
    const response = await serviceService.getById(serviceId);
    if (response.success && response.data) {
      return {
        id: response.data.id,
        code: response.data.code || `SVC-${response.data.id}`,
        name: response.data.name,
        price: parsePrice(response.data.price),
        parameter: response.data.parameter?.name,
        method: response.data.method?.name,
      };
    }
  } catch (error) {
    console.error(`Error fetching service ${serviceId}:`, error);
  }
  return null;
};

// Fetch full package details by ID
const fetchPackageDetails = async (packageId: number) => {
  try {
    const response = await packageService.getById(packageId);
    if (response.success && response.data) {
      const packageServices: PackageServiceInfo[] = response.data.services?.map((svc: any) => ({
        id: svc.id,
        name: svc.name,
        price: parsePrice(svc.price),
      })) || [];

      return {
        id: response.data.id,
        code: response.data.code || `PKG-${response.data.id}`,
        name: response.data.name,
        price: parsePrice(response.data.price),
        packageServices,
      };
    }
  } catch (error) {
    console.error(`Error fetching package ${packageId}:`, error);
  }
  return null;
};

// Sortable service row component for drag-and-drop
interface SortableServiceRowProps {
  svc: SampleServiceItem;
  sampleId: string;
  formatCurrency: (value: number) => string;
  updateServiceDiscount: (sampleId: string, serviceId: string, discount: number) => void;
  removeServiceFromSample: (sampleId: string, serviceId: string) => void;
}

function SortableServiceRow({
  svc,
  sampleId,
  formatCurrency,
  updateServiceDiscount,
  removeServiceFromSample,
}: SortableServiceRowProps) {
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
    <TableRow ref={setNodeRef} style={style}>
      {/* Drag Handle */}
      <TableCell className="w-[40px] align-top">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>

      {/* Type Badge */}
      <TableCell className="w-[100px] align-top">
        <Badge variant={svc.type === 'package' ? 'default' : 'secondary'}>
          {svc.type === 'package' ? 'Package' : 'Service'}
        </Badge>
      </TableCell>

      {/* Name with Package Services */}
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

      {/* Method */}
      <TableCell className="text-muted-foreground align-top">
        {svc.type === 'package' && svc.packageServices && svc.packageServices.length > 0
          ? 'Various Methods'
          : svc.method || '-'}
      </TableCell>

      {/* Price with Discount */}
      <TableCell className="text-right align-top">
        {svc.discount > 0 ? (
          <div>
            <span className="line-through text-muted-foreground text-xs">
              {formatCurrency(svc.price)}
            </span>
            <br />
            <span className="text-green-600 font-medium">
              {formatCurrency(svc.price * (1 - svc.discount / 100))}
            </span>
          </div>
        ) : (
          formatCurrency(svc.price)
        )}
      </TableCell>

      {/* Discount Input */}
      <TableCell className="text-center w-[100px] align-top">
        <Input
          type="number"
          min={0}
          max={100}
          value={svc.discount}
          onChange={(e) => updateServiceDiscount(sampleId, svc.id, parseFloat(e.target.value) || 0)}
          className="h-8 w-16 text-center mx-auto"
        />
      </TableCell>

      {/* Delete Button */}
      <TableCell className="w-[50px] align-top">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => removeServiceFromSample(sampleId, svc.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

export default function QuotationNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [loadingDuplicateDetails, setLoadingDuplicateDetails] = useState(false);

  // Customer state
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerOption[]>([]);
  const [loadingCustomerSearch, setLoadingCustomerSearch] = useState(false);
  const [openCustomerPopover, setOpenCustomerPopover] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);

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
  const addressId = form.watch("addressId");

  // Fetch auto-generated code
  const fetchCode = useCallback(async () => {
    try {
      const response = await quotationService.generateCode();
      if (response.success && response.data?.code) {
        setCode(response.data.code);
      }
    } catch (error) {
      console.error('Error fetching quotation code:', error);
    }
  }, []);

  // Fetch full customer data when selected
  const fetchFullCustomerData = useCallback(async (customerId: number) => {
    setLoadingCustomerDetails(true);
    try {
      const response = await customerService.getById(customerId);
      if (response.success && response.data) {
        const fullCustomer: CustomerOption = {
          id: response.data.id,
          code: response.data.code,
          customer_name: response.data.customer_name,
          addresses: response.data.addresses || [],
          contacts: response.data.contacts || [],
        };
        setSelectedCustomer(fullCustomer);
      }
    } catch (error) {
      console.error('Error fetching full customer data:', error);
      toast.error('Failed to load customer contacts and addresses');
    } finally {
      setLoadingCustomerDetails(false);
    }
  }, []);

  // Load duplicate data if duplicating
  const loadDuplicateData = useCallback(async () => {
    if (!duplicateId) return;
    setLoadingDuplicateDetails(true);
    try {
      const response = await quotationService.getDuplicate(duplicateId);
      if (response.success && response.data) {
        const { quotation, sampleArray } = response.data;

        // Set form values
        form.setValue('priority', (quotation.priority as 'normal' | 'urgent' | 'very urgent') || 'normal');
        form.setValue('percentDiscount', quotation.percentDiscount || 0);
        form.setValue('percentVat', quotation.percentVat || 11);
        form.setValue('minVolumeSample', quotation.minVolumeSample || '');
        form.setValue('remarks', quotation.remarks || '');

        // Set customer data
        if (quotation.customer_id) {
          form.setValue('customerId', quotation.customer_id);

          // Fetch full customer data to populate contacts and addresses
          await fetchFullCustomerData(quotation.customer_id);

          // After customer is loaded, set contact and address
          if (quotation.contact_id) {
            form.setValue('contactId', quotation.contact_id);
          }
          if (quotation.address_id) {
            form.setValue('addressId', quotation.address_id);
          }
        }

        // Parse samples from sampleArray and fetch full details
        if (sampleArray && typeof sampleArray === 'object') {
          const loadedSamples: SampleItem[] = [];

          // Process each sample sequentially to fetch details
          for (const [key, sample] of Object.entries(sampleArray) as [string, any][]) {
            const sampleServices: SampleServiceItem[] = [];

            // Fetch all service details in parallel
            if (sample.services && Array.isArray(sample.services)) {
              const servicePromises = sample.services.map(async (svc: any, idx: number) => {
                const details = await fetchServiceDetails(svc.id);
                if (details) {
                  return {
                    id: `svc-${Date.now()}-${idx}`,
                    type: 'service' as const,
                    itemId: details.id,
                    name: details.name,
                    code: details.code,
                    parameter: details.parameter,
                    method: details.method,
                    price: details.price,
                    discount: svc.discount || 0,
                    quantity: svc.quantity || 1,
                  };
                }
                return null;
              });

              const serviceResults = await Promise.all(servicePromises);
              sampleServices.push(...serviceResults.filter((s): s is SampleServiceItem => s !== null));
            }

            // Fetch all package details in parallel
            if (sample.packages && Array.isArray(sample.packages)) {
              const packagePromises = sample.packages.map(async (pkg: any, idx: number) => {
                const details = await fetchPackageDetails(pkg.id);
                if (details) {
                  return {
                    id: `pkg-${Date.now()}-${idx}`,
                    type: 'package' as const,
                    itemId: details.id,
                    name: details.name,
                    code: details.code,
                    price: details.price,
                    discount: pkg.discount || 0,
                    quantity: pkg.quantity || 1,
                    packageServices: details.packageServices,
                  };
                }
                return null;
              });

              const packageResults = await Promise.all(packagePromises);
              sampleServices.push(...packageResults.filter((p): p is SampleServiceItem => p !== null));
            }

            loadedSamples.push({
              id: `sample-${Date.now()}-${key}`,
              name: sample.name || '',
              quantity: sample.quantity || 1,
              priority: sample.priority || 'normal',
              services: sampleServices,
              isExpanded: true,
              isDetailsExpanded: false,
            });
          }

          setSamples(loadedSamples);
        }

        toast.success('Quotation data loaded for duplication');
      }
    } catch (error) {
      console.error('Error loading duplicate data:', error);
      toast.error('Failed to load quotation data for duplication');
    } finally {
      setLoadingDuplicateDetails(false);
    }
  }, [duplicateId, form, fetchFullCustomerData]);

  useEffect(() => {
    fetchCode();
    loadDuplicateData();
  }, [fetchCode, loadDuplicateData]);

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
      isDetailsExpanded: false,
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
      })),
      isExpanded: true,
      isDetailsExpanded: false,
    };
    setSamples(prev => [...prev, newSample]);
    toast.success(`Sample copied as "${newName}"`);
  };

  const toggleSampleExpanded = (sampleId: string) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, isExpanded: !s.isExpanded } : s
    ));
  };

  const toggleSampleDetails = (sampleId: string) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, isDetailsExpanded: !s.isDetailsExpanded } : s
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

  // Reorder services within a sample
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
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag end handler for a specific sample
  const handleDragEnd = (sampleId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const sample = samples.find(s => s.id === sampleId);
      if (!sample) return;
      const oldIndex = sample.services.findIndex(svc => svc.id === active.id);
      const newIndex = sample.services.findIndex(svc => svc.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderServicesInSample(sampleId, oldIndex, newIndex);
      }
    }
  };

  // Calculate totals
  const { subTotal, discountAmount, afterDiscount, pcAmount, afterPc, vatAmount, total, isMinimumApplied } = useMemo(() => {
    const pc = getPriorityCharge(priority);

    let subTotal = 0;
    samples.forEach(sample => {
      sample.services.forEach(svc => {
        const itemPrice = svc.price * svc.quantity;
        const itemDiscount = itemPrice * (svc.discount / 100);
        subTotal += (itemPrice - itemDiscount) * sample.quantity;
      });
    });

    const discountAmount = subTotal * (percentDiscount / 100);
    const afterDiscount = subTotal - discountAmount;
    const pcAmount = afterDiscount * (pc / 100);
    const afterPc = afterDiscount + pcAmount;

    // Apply minimum total rule (same as backend)
    // Only affects VAT and Grand Total, not the subtotal display
    let isMinimumApplied = false;
    let finalVatAmount: number;
    let finalTotal: number;

    if (afterPc < MIN_TOTAL) {
      isMinimumApplied = true;
      finalVatAmount = MIN_VAT;
      finalTotal = MIN_GRAND_TOTAL;
    } else {
      finalVatAmount = afterPc * (percentVat / 100);
      finalTotal = afterPc + finalVatAmount;
    }

    return { subTotal, discountAmount, afterDiscount, pcAmount, afterPc, vatAmount: finalVatAmount, total: finalTotal, isMinimumApplied };
  }, [samples, priority, percentDiscount, percentVat]);

  // Available contacts and addresses
  const availableContacts = selectedCustomer?.contacts || [];
  const availableAddresses = selectedCustomer?.addresses || [];

  // Find selected address for display
  const selectedAddress = useMemo(() => {
    if (!addressId || addressId === 0) return null;
    return availableAddresses.find(addr => addr.id === addressId) || null;
  }, [addressId, availableAddresses]);

  const onSubmit = async (data: FormData) => {
    if (samples.length === 0) {
      toast.error('Please add at least one sample');
      return;
    }

    const hasEmptySamples = samples.some(s => s.services.length === 0);
    if (hasEmptySamples) {
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
        sampling_date: (data.samplingRequest && data.samplingDate) ? data.samplingDate : null,
        min_volume_sample: data.minVolumeSample || null,
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
            .map(svc => ({
              id: svc.itemId,
              quantity: svc.quantity,
              discount: svc.discount,
            })),
          packages: sample.services
            .filter(svc => svc.type === 'package')
            .map(svc => ({
              id: svc.itemId,
              quantity: svc.quantity,
              discount: svc.discount,
            })),
        })),
      };

      const response = await quotationService.create(payload);
      toast.success('Quotation created successfully');
      router.push(`/operational/quotation/${response.data?.id || ''}`);
    } catch (error) {
      console.error('Error creating quotation:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('quotation')));
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onClick={() => router.push("/operational/quotation")}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {duplicateId ? 'Duplicate Quotation' : 'New Quotation'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {code || 'Loading code...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/operational/quotation")}
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
              {isSubmitting ? "Saving..." : "Save Quotation"}
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
                                    onSelect={async () => {
                                      field.onChange(customer.id);
                                      form.setValue('contactId', 0);
                                      form.setValue('addressId', 0);
                                      setOpenCustomerPopover(false);
                                      setCustomerSearchQuery("");
                                      // Fetch full customer data with contacts and addresses
                                      await fetchFullCustomerData(customer.id);
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
                      disabled={!customerId || loadingCustomerDetails}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder={
                            loadingCustomerDetails
                              ? "Loading contacts..."
                              : customerId
                                ? "Select contact"
                                : "Select customer first"
                          } />
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
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Address <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={String(field.value || '')}
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      disabled={!customerId || loadingCustomerDetails}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder={
                            loadingCustomerDetails
                              ? "Loading addresses..."
                              : customerId
                                ? "Select address"
                                : "Select customer first"
                          } />
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
                    <FormMessage />
                    {selectedAddress && (
                      <div className="mt-3 p-3 rounded-md bg-muted/30 border border-muted">
                        <div className="text-xs text-muted-foreground mb-1">Selected Address:</div>
                        <p className="text-sm leading-relaxed">
                          {selectedAddress.address}
                          {selectedAddress.city && `, ${selectedAddress.city}`}
                          {selectedAddress.state && `, ${selectedAddress.state}`}
                          {selectedAddress.postal_code && `, ${selectedAddress.postal_code}`}
                          {selectedAddress.country && `, ${selectedAddress.country}`}
                        </p>
                      </div>
                    )}
                  </FormItem>
                )}
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
            {/* Loading Duplicate Details Indicator */}
            {loadingDuplicateDetails && (
              <div className="flex items-center justify-center py-8 border-b bg-muted/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading duplicate quotation details...</span>
              </div>
            )}

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
                    <div className="flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex items-center gap-3 text-left">
                            {sample.isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                            <span className="font-medium">{sample.name}</span>
                            <Badge variant="outline">Qty: {sample.quantity}</Badge>
                          </button>
                        </CollapsibleTrigger>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "h-6 w-6 -ml-1",
                            sample.isDetailsExpanded ? "text-primary" : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => toggleSampleDetails(sample.id)}
                          title="Edit Sample Details"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {sample.priority !== 'normal' && (
                          <Badge
                            variant={sample.priority === 'very urgent' ? 'destructive' : 'outline'}
                            className={sample.priority === 'urgent' ? 'text-orange-600 border-orange-600' : ''}
                          >
                            {sample.priority}
                          </Badge>
                        )}
                      </div>
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
                      {/* Sample Details Section - Collapsible */}
                      <Collapsible open={sample.isDetailsExpanded}>
                        <CollapsibleContent>
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
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Service/Package Search */}
                      <div className="p-4 bg-muted/20 border-b">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                          Add Service / Package
                        </p>
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
                                              <span>{service.code} - {service.name}</span>
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
                                              <span>{pkg.code} - {pkg.name}</span>
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
                          <SortableContext
                            items={sample.services.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/10">
                                  <TableHead className="w-[40px]"></TableHead>
                                  <TableHead className="w-[100px]">Type</TableHead>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Method</TableHead>
                                  <TableHead className="text-right w-[120px]">Price</TableHead>
                                  <TableHead className="text-center w-[100px]">Disc (%)</TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {sample.services.map((svc) => (
                                  <SortableServiceRow
                                    key={svc.id}
                                    svc={svc}
                                    sampleId={sample.id}
                                    formatCurrency={formatCurrency}
                                    updateServiceDiscount={updateServiceDiscount}
                                    removeServiceFromSample={removeServiceFromSample}
                                  />
                                ))}
                              </TableBody>
                            </Table>
                          </SortableContext>
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
                <span className="text-muted-foreground">Total</span>
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
                <span className="text-muted-foreground">Sub Total</span>
                <span className="font-medium">{formatCurrency(afterPc)}</span>
              </div>
              {isMinimumApplied && (
                <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
                  Minimum order IDR 200,000 applied
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
