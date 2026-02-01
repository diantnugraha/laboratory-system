'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
import {
  ArrowLeft,
  Save,
  FileText,
  Loader2,
  Search,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Copy,
  FileCheck,
  X,
  Pencil,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { orderService, OrderFormData } from "@/services/orderService";
import { standardService, StandardSelectItem } from "@/services/standardService";
import { useCustomerStore } from "@/store/customerStore";
import { useServiceStore, ServiceOption, PackageOption } from "@/store/serviceStore";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import { RenderHTML } from "@/components/shared/RenderHTML";

// Format currency
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(isNaN(value) ? 0 : value);

// Parse price safely (handles null, undefined, string, NaN)
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

// Form Schema
const orderFormSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  contactId: z.coerce.number().min(1, "Contact is required"),
  addressId: z.coerce.number().optional(),
  submittedBy: z.string().min(1, "Submitted by is required"),
  orderDate: z.date(),
  expenseCharge: z.enum(["charged", "not_charged"]).default("not_charged"),
  companyExpenseId: z.coerce.number().optional(),
  percentDiscount: z.coerce.number().min(0).max(100).default(0),
  percentVat: z.coerce.number().min(0).max(100).default(11),
  priority: z.enum(["normal", "urgent", "very_urgent", "special_request"]).default("normal"),
  remarks: z.string().optional(),
});

type FormData = z.infer<typeof orderFormSchema>;

// Sample Service Item interface
interface SampleServiceItem {
  id: string;
  serviceId: number;
  type: "service" | "package";
  name: string;
  code: string;
  parameter: string;
  method: string;
  price: number;
  discount: number;
  pc: number;
  total: number;
  packageServices?: Array<{ serviceId: number; serviceName: string; parameter: string }>;
}

// Sample Item interface
interface SampleItem {
  id: string;
  sampleName: string;
  quantity: number;
  description: string;
  standardId: string;
  standardName: string;
  volume: string;
  storage: "dry" | "chill" | "frozen";
  retain: "return" | "destroy";
  services: SampleServiceItem[];
  isDetailsExpanded: boolean;
}

// Priority options with PC (Priority Charge)
const priorityOptions = [
  { value: "normal", label: "Normal", pc: 0 },
  { value: "urgent", label: "Urgent (+25% PC)", pc: 25 },
  { value: "very_urgent", label: "Very Urgent (+50% PC)", pc: 50 },
  { value: "special_request", label: "Special Request (+75% PC)", pc: 75 },
];

// Sortable Service Row Component
interface SortableServiceRowProps {
  svc: SampleServiceItem;
  sampleId: string;
  onUpdateDiscount: (sampleId: string, serviceItemId: string, discount: number) => void;
  onRemove: (sampleId: string, serviceItemId: string) => void;
}

function SortableServiceRow({ svc, sampleId, onUpdateDiscount, onRemove }: SortableServiceRowProps) {
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
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
    >
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
        <Badge variant={svc.type === "package" ? "default" : "secondary"}>
          {svc.type === "package" ? "Package" : "Service"}
        </Badge>
      </TableCell>

      {/* Name with Package Services */}
      <TableCell className="font-medium align-top">
        <div>
          <RenderHTML as="div" html={svc.type === "package" ? svc.name : (svc.parameter || svc.name)} className="font-semibold" />
          {svc.type === "package" && svc.packageServices && svc.packageServices.length > 0 && (
            <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
              {svc.packageServices.map((ps, idx) => (
                <li key={`${svc.id}-${ps.serviceId}-${idx}`}><RenderHTML html={ps.serviceName} /></li>
              ))}
            </ul>
          )}
        </div>
      </TableCell>

      {/* Method */}
      <TableCell className="text-muted-foreground align-top">
        {svc.type === "package" && svc.packageServices && svc.packageServices.length > 0
          ? "Various Methods"
          : svc.method || "-"}
      </TableCell>

      {/* Price with Discount */}
      <TableCell className="text-right align-top w-[120px]">
        {svc.discount > 0 ? (
          <div>
            <span className="line-through text-muted-foreground text-xs">
              {formatCurrency(svc.price)}
            </span>
            <br />
            <span className="text-green-600 font-medium">
              {formatCurrency(parsePrice(svc.price) * (1 - (svc.discount || 0) / 100))}
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
          onChange={(e) => onUpdateDiscount(sampleId, svc.id, parseFloat(e.target.value) || 0)}
          className="h-8 w-16 text-center mx-auto"
        />
      </TableCell>

      {/* PC % */}
      <TableCell className="text-center w-[80px] align-top text-muted-foreground">
        {svc.pc}%
      </TableCell>

      {/* Total */}
      <TableCell className="text-right w-[120px] align-top font-medium">
        {formatCurrency(svc.total)}
      </TableCell>

      {/* Delete */}
      <TableCell className="w-[50px] align-top">
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

export default function OrderNewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preorderId = searchParams.get("preorderId");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");

  // Sample management state
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [expandedSamples, setExpandedSamples] = useState<Set<string>>(new Set());

  // Inline Add Sample states
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [newSampleName, setNewSampleName] = useState("");
  const [newSampleQuantity, setNewSampleQuantity] = useState(1);
  const [newSampleDescription, setNewSampleDescription] = useState("");
  const [newSampleVolume, setNewSampleVolume] = useState("");
  const [newSampleStorage, setNewSampleStorage] = useState<"dry" | "chill" | "frozen">("dry");
  const [newSampleRetain, setNewSampleRetain] = useState<"return" | "destroy">("return");
  const [newSampleStandardId, setNewSampleStandardId] = useState("");
  const [newSampleStandardName, setNewSampleStandardName] = useState("");

  // Standard search state
  const [standardQuery, setStandardQuery] = useState("");
  const [standardResults, setStandardResults] = useState<StandardSelectItem[]>([]);
  const [loadingStandards, setLoadingStandards] = useState(false);
  const [openStandardPopover, setOpenStandardPopover] = useState<string | null>(null);

  const searchStandards = async (query: string) => {
    if (query.length < 2) {
      setStandardResults([]);
      return;
    }
    setLoadingStandards(true);
    try {
      const res = await standardService.getJson({ q: query });
      setStandardResults(res.items || res.data || []);
    } catch {
      setStandardResults([]);
    } finally {
      setLoadingStandards(false);
    }
  };

  // Customer/Contact state from Zustand store
  const {
    searchQuery: customerSearchQuery,
    searchResults: customerSearchResults,
    isSearching: isCustomerSearching,
    popoverOpen: customerPopoverOpen,
    selectedCustomer,
    selectedContact,
    contacts,
    addresses,
    loadingDetails,
    setSearchQuery: setCustomerSearchQuery,
    setPopoverOpen: setCustomerPopoverOpen,
    searchCustomers,
    selectCustomer,
    selectContact,
    reset: resetCustomerStore,
  } = useCustomerStore();

  // Service/Package search from Zustand store
  const {
    serviceSearchQueries,
    packageSearchQueries,
    serviceSearchResults,
    packageSearchResults,
    loadingServiceSearch,
    loadingPackageSearch,
    openServicePopover,
    openPackagePopover,
    setServiceQuery,
    setPackageQuery,
    setServicePopoverOpen,
    setPackagePopoverOpen,
    searchServices,
    searchPackages,
    reset: resetServiceStore,
  } = useServiceStore();

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const form = useForm<FormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      customerId: 0,
      contactId: 0,
      addressId: undefined,
      submittedBy: "",
      orderDate: new Date(),
      expenseCharge: "not_charged",
      companyExpenseId: undefined,
      percentDiscount: 0,
      percentVat: 11,
      priority: "normal",
      remarks: "",
    },
  });

  const priority = form.watch("priority");
  const percentDiscount = form.watch("percentDiscount");
  const percentVat = form.watch("percentVat");

  // Get priority charge based on selected priority
  const getPriorityCharge = () => {
    const option = priorityOptions.find(p => p.value === priority);
    return option?.pc || 0;
  };

  // Reset stores on mount
  useEffect(() => {
    resetCustomerStore();
    resetServiceStore();
  }, [resetCustomerStore, resetServiceStore]);

  // Generate code on mount
  useEffect(() => {
    const generateCode = async () => {
      try {
        const response = await orderService.generateCode();
        if (response.success) {
          setGeneratedCode(response.data.code);
        }
      } catch (error) {
        console.error("Failed to generate code:", error);
      }
    };
    generateCode();
  }, []);

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery, searchCustomers]);

  // Handle drag end for reordering services within a sample
  const handleDragEnd = (sampleId: string) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSamples((prev) => prev.map(sample => {
        if (sample.id !== sampleId) return sample;
        const oldIndex = sample.services.findIndex((s) => s.id === active.id);
        const newIndex = sample.services.findIndex((s) => s.id === over.id);
        return {
          ...sample,
          services: arrayMove(sample.services, oldIndex, newIndex),
        };
      }));
    }
  };

  // Add service to sample
  const handleAddServiceToSample = (sampleId: string, service: ServiceOption) => {
    const pc = getPriorityCharge();
    const price = parsePrice(service.price);
    const discountedPrice = price * (1 - percentDiscount / 100);
    const total = discountedPrice * (1 + pc / 100);

    setSamples((prev) => prev.map(sample => {
      if (sample.id !== sampleId) return sample;
      // Check if service already exists
      if (sample.services.some(s => s.serviceId === service.id && s.type === "service")) {
        toast.error("Service already added to this sample");
        return sample;
      }
      return {
        ...sample,
        services: [
          ...sample.services,
          {
            id: `svc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            serviceId: service.id,
            type: "service",
            name: service.name,
            code: service.code,
            parameter: service.parameter?.name || service.name,
            method: service.method?.name || '-',
            price: price,
            discount: percentDiscount,
            pc: pc,
            total: Math.round(total),
          },
        ],
      };
    }));
    setServicePopoverOpen(null);
    setServiceQuery(sampleId, "");
  };

  // Add package to sample
  const handleAddPackageToSample = (sampleId: string, pkg: PackageOption) => {
    const pc = getPriorityCharge();
    const price = parsePrice(pkg.price);
    const discountedPrice = price * (1 - percentDiscount / 100);
    const total = discountedPrice * (1 + pc / 100);

    setSamples((prev) => prev.map(sample => {
      if (sample.id !== sampleId) return sample;
      // Check if package already exists
      if (sample.services.some(s => s.serviceId === pkg.id && s.type === "package")) {
        toast.error("Package already added to this sample");
        return sample;
      }
      return {
        ...sample,
        services: [
          ...sample.services,
          {
            id: `pkg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            serviceId: pkg.id,
            type: "package",
            name: pkg.name,
            code: pkg.code,
            parameter: pkg.services?.map(s => s.name).join(", ") || "-",
            method: "-",
            price: price,
            discount: percentDiscount,
            pc: pc,
            total: Math.round(total),
            packageServices: pkg.services?.map(s => ({
              serviceId: s.id,
              serviceName: s.name,
              parameter: s.name,
            })),
          },
        ],
      };
    }));
    setPackagePopoverOpen(null);
    setPackageQuery(sampleId, "");
  };

  // Remove service from sample
  const handleRemoveServiceFromSample = (sampleId: string, serviceItemId: string) => {
    setSamples((prev) => prev.map(sample => {
      if (sample.id !== sampleId) return sample;
      return {
        ...sample,
        services: sample.services.filter(s => s.id !== serviceItemId),
      };
    }));
  };

  // Update service discount
  const handleUpdateServiceDiscount = (sampleId: string, serviceItemId: string, newDiscount: number) => {
    setSamples((prev) => prev.map(sample => {
      if (sample.id !== sampleId) return sample;
      return {
        ...sample,
        services: sample.services.map(svc => {
          if (svc.id !== serviceItemId) return svc;
          const discountedPrice = parsePrice(svc.price) * (1 - newDiscount / 100);
          const total = discountedPrice * (1 + svc.pc / 100);
          return {
            ...svc,
            discount: newDiscount,
            total: Math.round(total),
          };
        }),
      };
    }));
  };

  // Add sample
  const handleAddSample = () => {
    if (!newSampleName.trim()) {
      toast.error("Sample name is required");
      return;
    }
    if (newSampleQuantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    const newSample: SampleItem = {
      id: `sample-${Date.now()}`,
      sampleName: newSampleName,
      quantity: newSampleQuantity,
      description: newSampleDescription,
      standardId: newSampleStandardId,
      standardName: newSampleStandardName,
      volume: newSampleVolume,
      storage: newSampleStorage,
      retain: newSampleRetain,
      services: [],
      isDetailsExpanded: false,
    };

    setSamples((prev) => [...prev, newSample]);
    setExpandedSamples((prev) => new Set([...prev, newSample.id]));

    // Reset inline form
    setNewSampleName("");
    setNewSampleQuantity(1);
    setNewSampleDescription("");
    setNewSampleVolume("");
    setNewSampleStorage("dry");
    setNewSampleRetain("return");
    setNewSampleStandardId("");
    setNewSampleStandardName("");
    setIsAddingSample(false);
    toast.success("Sample added - now add services/packages");
  };

  // Remove sample
  const handleRemoveSample = (sampleId: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== sampleId));
    setExpandedSamples((prev) => {
      const newSet = new Set(prev);
      newSet.delete(sampleId);
      return newSet;
    });
  };

  // Copy sample
  const handleCopySample = (sampleId: string) => {
    const sampleToCopy = samples.find((s) => s.id === sampleId);
    if (!sampleToCopy) return;

    // Generate new sample name with increment
    const baseName = sampleToCopy.sampleName.replace(/\s*\(\d+\)$/, "").replace(/\s*\d+$/, "").trim();
    const existingNames = samples.map((s) => s.sampleName);
    let copyNumber = 2;
    let newName = `${baseName} ${copyNumber}`;

    while (existingNames.includes(newName)) {
      copyNumber++;
      newName = `${baseName} ${copyNumber}`;
    }

    const newSample: SampleItem = {
      id: `sample-${Date.now()}`,
      sampleName: newName,
      quantity: sampleToCopy.quantity,
      description: sampleToCopy.description,
      standardId: sampleToCopy.standardId,
      standardName: sampleToCopy.standardName,
      volume: sampleToCopy.volume,
      storage: sampleToCopy.storage,
      retain: sampleToCopy.retain,
      services: sampleToCopy.services.map((svc) => ({
        ...svc,
        id: `${svc.type === "package" ? "pkg" : "svc"}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      })),
      isDetailsExpanded: false,
    };

    setSamples((prev) => [...prev, newSample]);
    setExpandedSamples((prev) => new Set([...prev, newSample.id]));
    toast.success(`Sample copied as "${newName}"`);
  };

  // Toggle sample expanded
  const toggleSampleExpanded = (sampleId: string) => {
    setExpandedSamples((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sampleId)) {
        newSet.delete(sampleId);
      } else {
        newSet.add(sampleId);
      }
      return newSet;
    });
  };

  // Toggle sample details (pencil edit)
  const toggleSampleDetails = (sampleId: string) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, isDetailsExpanded: !s.isDetailsExpanded } : s
    ));
  };

  // Update a sample field inline
  const updateSampleField = (sampleId: string, field: keyof SampleItem, value: string | number) => {
    setSamples(prev => prev.map(s =>
      s.id === sampleId ? { ...s, [field]: value } : s
    ));
  };

  // Calculate totals
  const subtotal = useMemo(() => {
    return samples.reduce((sum, sample) => {
      const sampleTotal = sample.services.reduce((svcSum, svc) => svcSum + (svc.total || 0), 0);
      return sum + (sampleTotal * sample.quantity);
    }, 0);
  }, [samples]);

  const discountAmount = Math.round(subtotal * (percentDiscount / 100));
  const subtotalAfterDiscount = subtotal - discountAmount;
  const vatAmount = Math.round(subtotalAfterDiscount * (percentVat / 100));
  const grandTotal = subtotalAfterDiscount + vatAmount;

  // Form submit
  const onSubmit = async (data: FormData) => {
    if (samples.length === 0) {
      toast.error("Please add at least one sample");
      return;
    }
    const hasEmptySamples = samples.some(s => s.services.length === 0);
    if (hasEmptySamples) {
      toast.error("All samples must have at least one service or package");
      return;
    }

    try {
      setIsSubmitting(true);

      // Map samples to API format
      const sampleData = samples.map(sample => ({
        name: sample.sampleName,
        description: sample.description || null,
        quantity: sample.quantity || 1,
        volume: sample.volume || null,
        sample_storage: sample.storage === 'dry' ? 'Dry' : sample.storage === 'chill' ? 'Chill' : 'Frozen',
        standard_id: sample.standardId ? parseInt(sample.standardId) : null,
        priority: data.priority === 'normal' ? 'Normal' :
                  data.priority === 'urgent' ? 'Urgent' :
                  data.priority === 'very_urgent' ? 'Very Urgent' : 'Special Request',
        // Expand services: for packages, create one entry per service in the package
        services: sample.services.flatMap(svc => {
          if (svc.type === 'package' && svc.packageServices && svc.packageServices.length > 0) {
            // Package: create one service entry for each service in the package
            return svc.packageServices.map(ps => ({
              service_id: ps.serviceId,
              package_id: svc.serviceId, // The package ID
              discount: Number(svc.discount) || 0,
              price: svc.price ? Math.round(svc.price / svc.packageServices!.length) : 0,
            }));
          } else {
            // Individual service
            return [{
              service_id: svc.serviceId,
              package_id: null,
              discount: Number(svc.discount) || 0,
              price: svc.price || 0,
            }];
          }
        }),
      }));

      const orderData: OrderFormData = {
        customer_id: data.customerId,
        contact_id: data.contactId,
        address_id: data.addressId || null,
        order_date: format(data.orderDate, 'yyyy-MM-dd'),
        priority: data.priority === 'normal' ? 'Normal' :
                 data.priority === 'urgent' ? 'Urgent' :
                 data.priority === 'very_urgent' ? 'Very Urgent' : 'Special Request',
        sub_total: subtotal,
        discount_percent: data.percentDiscount,
        vat_percent: data.percentVat,
        total: grandTotal,
        remarks: data.remarks || null,
        submited_by: data.submittedBy,
        expense: data.expenseCharge === 'charged' ? (data.companyExpenseId || null) : null,
        pre_order_id: preorderId ? parseInt(preorderId) : null,
        samples: sampleData,
      };

      const response = await orderService.create(orderData);
      toast.success("Order created successfully");
      router.push(`/operational/order/${response.data.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('order')));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDate = format(new Date(), "yyyy-MM-dd");

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
              onClick={() => router.push("/operational/order")}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">New Order</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {generatedCode || 'Loading code...'}
                {preorderId && ` • From PreOrder #${preorderId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/operational/order")}
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
              {isSubmitting ? "Saving..." : "Create Order"}
            </Button>
          </div>
        </div>

        {/* Order Information */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Order Information
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
                      open={customerPopoverOpen}
                      onOpenChange={(open) => {
                        setCustomerPopoverOpen(open);
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
                            {isCustomerSearching ? (
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
                                    onSelect={() => selectCustomer(customer, form.setValue)}
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

              {/* Contact */}
              <FormField
                control={form.control}
                name="contactId"
                render={() => {
                  const displayName = selectedContact
                    ? [selectedContact.first_name, selectedContact.middle_name, selectedContact.surname].filter(Boolean).join(' ')
                    : null;

                  return (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Contact <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={selectedContact ? String(selectedContact.id) : ''}
                        onValueChange={(val) => {
                          const contactId = parseInt(val);
                          const contact = contacts.find(c => c.id === contactId);
                          if (contact) {
                            selectContact(contact, form.setValue);
                          }
                        }}
                        disabled={!selectedCustomer || loadingDetails}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                            <span className={cn(
                              "truncate",
                              !displayName && "text-muted-foreground"
                            )}>
                              {displayName || (
                                loadingDetails
                                  ? "Loading contacts..."
                                  : selectedCustomer
                                    ? "Select contact"
                                    : "Select customer first"
                              )}
                            </span>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((contact) => {
                            const fullName = [contact.first_name, contact.middle_name, contact.surname]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <SelectItem key={contact.id} value={String(contact.id)}>
                                {fullName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Address */}
              <FormField
                control={form.control}
                name="addressId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Address
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(val) => field.onChange(val ? parseInt(val) : undefined)}
                      disabled={!selectedCustomer || loadingDetails}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder={selectedCustomer ? "Select address" : "Select customer first"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {addresses.map((address) => (
                          <SelectItem key={address.id} value={String(address.id)}>
                            {address.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submitted By */}
              <FormField
                control={form.control}
                name="submittedBy"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Submitted By <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter name"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Order Date */}
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Order Date
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-10 pl-3 text-left font-normal bg-muted/30 hover:bg-muted/50 border-muted",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
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
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Percent Discount */}
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
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* VAT */}
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
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Samples Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <FileCheck className="h-4 w-4 text-primary" />
                </div>
                Samples ({samples.length})
              </CardTitle>
              {!isAddingSample && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setIsAddingSample(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add Sample
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Inline Add Sample Form */}
            {isAddingSample && (
              <div className="p-4 border-b bg-primary/5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sample Name
                    </Label>
                    <Input
                      value={newSampleName}
                      onChange={(e) => setNewSampleName(e.target.value)}
                      placeholder="Enter sample name..."
                      className="h-10 bg-background"
                      autoFocus
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Quantity
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={newSampleQuantity}
                      onChange={(e) => setNewSampleQuantity(parseInt(e.target.value) || 1)}
                      className="h-10 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Description
                  </Label>
                  <Input
                    value={newSampleDescription}
                    onChange={(e) => setNewSampleDescription(e.target.value)}
                    placeholder="Enter sample description..."
                    className="h-10 bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Volume
                    </Label>
                    <Input
                      value={newSampleVolume}
                      onChange={(e) => setNewSampleVolume(e.target.value)}
                      placeholder="e.g., 500ml, 1L..."
                      className="h-10 bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Storage
                    </Label>
                    <Select value={newSampleStorage} onValueChange={(val: "dry" | "chill" | "frozen") => setNewSampleStorage(val)}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="dry">Dry</SelectItem>
                        <SelectItem value="chill">Chill</SelectItem>
                        <SelectItem value="frozen">Frozen</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Retain
                    </Label>
                    <Select value={newSampleRetain} onValueChange={(val: "return" | "destroy") => setNewSampleRetain(val)}>
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="return">Return Sample to Customer</SelectItem>
                        <SelectItem value="destroy">Destroy Sample After 2 Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Standard
                  </Label>
                  <Popover
                    open={openStandardPopover === "new-sample"}
                    onOpenChange={(open) => {
                      setOpenStandardPopover(open ? "new-sample" : null);
                      if (!open) {
                        setStandardQuery("");
                        setStandardResults([]);
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="h-10 w-full justify-between font-normal bg-background"
                      >
                        <span className={cn(!newSampleStandardName && "text-muted-foreground")}>
                          {newSampleStandardName || "Select standard..."}
                        </span>
                        {newSampleStandardId ? (
                          <X
                            className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewSampleStandardId("");
                              setNewSampleStandardName("");
                            }}
                          />
                        ) : (
                          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                      <Command shouldFilter={false}>
                        <div className="flex items-center px-3 py-2 border-b">
                          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Search standard..."
                            value={standardQuery}
                            onChange={(e) => {
                              setStandardQuery(e.target.value);
                              searchStandards(e.target.value);
                            }}
                            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                        <CommandList className="max-h-48">
                          {loadingStandards ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                            </div>
                          ) : standardQuery.length < 2 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Type at least 2 characters to search
                            </div>
                          ) : standardResults.length === 0 ? (
                            <CommandEmpty>No standard found</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {standardResults.map((std) => (
                                <CommandItem
                                  key={std.id}
                                  value={String(std.id)}
                                  onSelect={() => {
                                    setNewSampleStandardId(String(std.id));
                                    setNewSampleStandardName(`${std.code} - ${std.name}`);
                                    setOpenStandardPopover(null);
                                    setStandardQuery("");
                                    setStandardResults([]);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <span className="font-medium">{std.code} - {std.name}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsAddingSample(false);
                      setNewSampleName("");
                      setNewSampleQuantity(1);
                      setNewSampleDescription("");
                      setNewSampleVolume("");
                      setNewSampleStorage("dry");
                      setNewSampleRetain("return");
                      setNewSampleStandardId("");
                      setNewSampleStandardName("");
                    }}
                    className="h-10"
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={handleAddSample} className="h-10">
                    Add Sample
                  </Button>
                </div>
              </div>
            )}

            {samples.length === 0 && !isAddingSample ? (
              <div className="text-center py-8 text-muted-foreground">
                No samples added. Click "Add Sample" to add services.
              </div>
            ) : (
              <div className="divide-y">
                {samples.map((sample) => {
                  const serviceQuery = serviceSearchQueries[sample.id] || "";
                  const packageQuery = packageSearchQueries[sample.id] || "";

                  return (
                    <Collapsible
                      key={sample.id}
                      open={expandedSamples.has(sample.id)}
                      onOpenChange={() => toggleSampleExpanded(sample.id)}
                    >
                      <div className="flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
                        <CollapsibleTrigger asChild>
                          <button type="button" className="flex items-start gap-3 flex-1 text-left min-w-0">
                            {expandedSamples.has(sample.id) ? (
                              <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                            )}
                            <div className="flex-1 min-w-0 space-y-1">
                              <span className="font-semibold text-base">
                                {sample.sampleName}
                              </span>

                              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm">
                                <span>
                                  <span className="text-muted-foreground">Qty:</span>{" "}
                                  <span className="font-medium">{sample.quantity}</span>
                                </span>
                                <span>
                                  <span className="text-muted-foreground">Services:</span>{" "}
                                  <span className="font-medium">
                                    {sample.services.length}
                                  </span>
                                </span>
                                <span>
                                  <span className="text-muted-foreground">Storage:</span>{" "}
                                  <span className="font-medium">
                                    {sample.storage === "dry" ? "Dry" : sample.storage === "chill" ? "Chill" : "Frozen"}
                                  </span>
                                </span>
                                <span>
                                  <span className="text-muted-foreground">Retain:</span>{" "}
                                  <span className="font-medium">
                                    {sample.retain === "return" ? "Return" : "Destroy"}
                                  </span>
                                </span>
                              </div>

                              {(sample.description || sample.volume || sample.standardName) && (
                                <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm">
                                  {sample.description && (
                                    <span>
                                      <span className="text-muted-foreground">Description:</span>{" "}
                                      <span>{sample.description}</span>
                                    </span>
                                  )}
                                  {sample.volume && (
                                    <span>
                                      <span className="text-muted-foreground">Volume:</span>{" "}
                                      <span>{sample.volume}</span>
                                    </span>
                                  )}
                                  {sample.standardName && (
                                    <span>
                                      <span className="text-muted-foreground">Standard:</span>{" "}
                                      <span>{sample.standardName}</span>
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        </CollapsibleTrigger>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleSampleDetails(sample.id)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit Sample
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopySample(sample.id)}>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Sample
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleRemoveSample(sample.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Sample
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CollapsibleContent>
                        {/* Sample Details Section - Collapsible */}
                        <Collapsible open={sample.isDetailsExpanded}>
                          <CollapsibleContent>
                            <div className="p-4 bg-muted/5 border-b">
                              <p className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
                                Sample Details
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-xs text-muted-foreground">Sample Name</label>
                                  <Input
                                    value={sample.sampleName}
                                    onChange={(e) => updateSampleField(sample.id, "sampleName", e.target.value)}
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
                                    onChange={(e) => updateSampleField(sample.id, "quantity", parseInt(e.target.value) || 1)}
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-muted-foreground">Description</label>
                                  <Input
                                    value={sample.description}
                                    onChange={(e) => updateSampleField(sample.id, "description", e.target.value)}
                                    className="h-9"
                                    placeholder="Enter description"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-muted-foreground">Volume</label>
                                  <Input
                                    value={sample.volume}
                                    onChange={(e) => updateSampleField(sample.id, "volume", e.target.value)}
                                    className="h-9"
                                    placeholder="e.g., 500ml, 1L"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-muted-foreground">Storage</label>
                                  <Select
                                    value={sample.storage}
                                    onValueChange={(val: "dry" | "chill" | "frozen") => updateSampleField(sample.id, "storage", val)}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="dry">Dry</SelectItem>
                                      <SelectItem value="chill">Chill</SelectItem>
                                      <SelectItem value="frozen">Frozen</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-muted-foreground">Retain</label>
                                  <Select
                                    value={sample.retain}
                                    onValueChange={(val: "return" | "destroy") => updateSampleField(sample.id, "retain", val)}
                                  >
                                    <SelectTrigger className="h-9">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="return">Return Sample to Customer</SelectItem>
                                      <SelectItem value="destroy">Destroy Sample After 2 Month</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-xs text-muted-foreground">Standard</label>
                                  <Popover
                                    open={openStandardPopover === sample.id}
                                    onOpenChange={(open) => {
                                      setOpenStandardPopover(open ? sample.id : null);
                                      if (!open) {
                                        setStandardQuery("");
                                        setStandardResults([]);
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        className="h-9 w-full justify-between font-normal"
                                      >
                                        <span className={cn(!sample.standardName && "text-muted-foreground")}>
                                          {sample.standardName || "Select standard..."}
                                        </span>
                                        {sample.standardId ? (
                                          <X
                                            className="h-4 w-4 shrink-0 text-muted-foreground hover:text-foreground"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateSampleField(sample.id, "standardId", "");
                                              updateSampleField(sample.id, "standardName", "");
                                            }}
                                          />
                                        ) : (
                                          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="p-0" align="start" style={{ width: "var(--radix-popover-trigger-width)" }}>
                                      <Command shouldFilter={false}>
                                        <div className="flex items-center px-3 py-2 border-b">
                                          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                          <input
                                            type="text"
                                            placeholder="Search standard..."
                                            value={standardQuery}
                                            onChange={(e) => {
                                              setStandardQuery(e.target.value);
                                              searchStandards(e.target.value);
                                            }}
                                            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                          />
                                        </div>
                                        <CommandList className="max-h-48">
                                          {loadingStandards ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                            </div>
                                          ) : standardQuery.length < 2 ? (
                                            <div className="py-6 text-center text-sm text-muted-foreground">
                                              Type at least 2 characters to search
                                            </div>
                                          ) : standardResults.length === 0 ? (
                                            <CommandEmpty>No standard found</CommandEmpty>
                                          ) : (
                                            <CommandGroup>
                                              {standardResults.map((std) => (
                                                <CommandItem
                                                  key={std.id}
                                                  value={String(std.id)}
                                                  onSelect={() => {
                                                    updateSampleField(sample.id, "standardId", String(std.id));
                                                    updateSampleField(sample.id, "standardName", `${std.code} - ${std.name}`);
                                                    setOpenStandardPopover(null);
                                                    setStandardQuery("");
                                                    setStandardResults([]);
                                                  }}
                                                  className="cursor-pointer"
                                                >
                                                  <span className="font-medium">{std.code} - {std.name}</span>
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
                              <div className="flex justify-end mt-4">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => toggleSampleDetails(sample.id)}
                                >
                                  <Save className="h-4 w-4 mr-1.5" />
                                  Save
                                </Button>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>

                        {/* Service/Package Search */}
                        <div className="p-4 bg-muted/10 border-b">
                          <div className="grid grid-cols-2 gap-4">
                            {/* Search Service */}
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Add Service
                              </label>
                              <Popover
                                open={openServicePopover === sample.id}
                                onOpenChange={(open) => setServicePopoverOpen(open ? sample.id : null)}
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
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <Command shouldFilter={false}>
                                    <div className="flex items-center px-3 py-2 border-b">
                                      <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                      <input
                                        type="text"
                                        placeholder="Type at least 2 characters..."
                                        value={serviceQuery}
                                        onChange={(e) => {
                                          setServiceQuery(sample.id, e.target.value);
                                          searchServices(e.target.value);
                                        }}
                                        className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                      />
                                    </div>
                                    <CommandList className="max-h-48">
                                      {loadingServiceSearch ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                        </div>
                                      ) : serviceQuery.length < 2 ? (
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
                                              onSelect={() => handleAddServiceToSample(sample.id, service)}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex flex-col">
                                                <RenderHTML html={`${service.code} - ${service.name}`} className="font-medium" />
                                                <RenderHTML html={`${service.parameter?.name || service.name} | ${formatCurrency(service.price)}`} className="text-xs text-muted-foreground" />
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

                            {/* Search Package */}
                            <div>
                              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Add Package
                              </label>
                              <Popover
                                open={openPackagePopover === sample.id}
                                onOpenChange={(open) => setPackagePopoverOpen(open ? sample.id : null)}
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
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                  <Command shouldFilter={false}>
                                    <div className="flex items-center px-3 py-2 border-b">
                                      <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                                      <input
                                        type="text"
                                        placeholder="Type at least 2 characters..."
                                        value={packageQuery}
                                        onChange={(e) => {
                                          setPackageQuery(sample.id, e.target.value);
                                          searchPackages(e.target.value);
                                        }}
                                        className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                      />
                                    </div>
                                    <CommandList className="max-h-48">
                                      {loadingPackageSearch ? (
                                        <div className="py-6 text-center text-sm text-muted-foreground">
                                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                        </div>
                                      ) : packageQuery.length < 2 ? (
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
                                              onSelect={() => handleAddPackageToSample(sample.id, pkg)}
                                              className="cursor-pointer"
                                            >
                                              <div className="flex flex-col">
                                                <RenderHTML html={`${pkg.code} - ${pkg.name}`} className="font-medium" />
                                                <span className="text-xs text-muted-foreground">
                                                  {pkg.services?.length || 0} services | {formatCurrency(pkg.price)}
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

                        {/* Services Table with Drag & Drop */}
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
                                  <TableHead className="text-right w-[120px]">Price</TableHead>
                                  <TableHead className="text-center w-[100px]">Disc (%)</TableHead>
                                  <TableHead className="text-center w-[80px]">PC (%)</TableHead>
                                  <TableHead className="text-right w-[120px]">Total</TableHead>
                                  <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                <SortableContext
                                  items={sample.services.map(s => s.id)}
                                  strategy={verticalListSortingStrategy}
                                >
                                  {sample.services.map((svc) => (
                                    <SortableServiceRow
                                      key={svc.id}
                                      svc={svc}
                                      sampleId={sample.id}
                                      onUpdateDiscount={handleUpdateServiceDiscount}
                                      onRemove={handleRemoveServiceFromSample}
                                    />
                                  ))}
                                </SortableContext>
                              </TableBody>
                            </Table>
                          </DndContext>
                        ) : (
                          <div className="text-center py-6 text-muted-foreground text-sm">
                            No services added. Use the search fields above to add services or packages.
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            )}

            {/* Summary */}
            {samples.length > 0 && (
              <div className="p-4 border-t bg-muted/5">
                <div className="flex justify-end">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal Services</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Global Discount ({percentDiscount}%)</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-muted-foreground">Subtotal After Discount</span>
                      <span>{formatCurrency(subtotalAfterDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">VAT ({percentVat}%)</span>
                      <span>{formatCurrency(vatAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Grand Total</span>
                      <span className="text-primary">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Remarks */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Remarks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <FormField
              control={form.control}
              name="remarks"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Enter remarks or additional notes for this order..."
                      className="resize-none min-h-[120px] bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
