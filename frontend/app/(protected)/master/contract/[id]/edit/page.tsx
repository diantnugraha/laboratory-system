'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  X,
  FileText,
  Clock,
  Percent,
  Plus,
  Trash2,
  Loader2,
  Package,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { toast } from "sonner";
import { contractService, Contract } from "@/services/contractService";
import { customerService } from "@/services/customerService";
import { serviceService } from "@/services/serviceService";
import { packageService } from "@/services/packageService";
import { FileUpload } from "@/components/ui/file-upload";

// Contract Detail Schema
const contractDetailSchema = z.object({
  type: z.enum(["service", "package"]),
  itemId: z.coerce.number().min(1, "Item is required"),
  itemName: z.string().optional(),
  itemPrice: z.coerce.number().optional().default(0),
  discountNormal: z.coerce.number().min(0).max(100).default(0),
  discountUrgent: z.coerce.number().min(0).max(100).default(50),
  discountVeryUrgent: z.coerce.number().min(0).max(100).default(100),
});

// Contract Form Schema
const contractFormSchema = z.object({
  code: z.string().min(1, "Code is required").max(255, "Code must be less than 255 characters"),
  customerId: z.coerce.number().min(1, "Customer is required"),
  period: z.string().min(1, "Period is required").max(255, "Period must be less than 255 characters"),
  periodFrom: z.string().min(1, "Period From is required"),
  periodTo: z.string().min(1, "Period To is required"),
  periodAlias: z.string().max(255).optional(),
  normalDay: z.coerce.number().min(1, "Normal day is required"),
  urgentDay: z.coerce.number().min(1, "Urgent day is required"),
  veryUrgentDay: z.coerce.number().min(1, "Very urgent day is required"),
  statusService: z.enum(["ALL", "SELECTED"]).default("ALL"),
  discount: z.coerce.number().min(0).max(100).optional().default(0),
  discountUrgent: z.coerce.number().min(0).max(100).optional().default(50),
  discountVeryUrgent: z.coerce.number().min(0).max(100).optional().default(100),
  remarks: z.string().max(255).optional(),
  details: z.array(contractDetailSchema).optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface CustomerOption {
  id: number;
  code: string;
  customer_name: string;
}

interface ServiceOption {
  id: number;
  code: string;
  name: string;
  price: number;
}

interface PackageOption {
  id: number;
  name: string;
  totalPrice?: number;
}

const formatDateForInput = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function ContractEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [packages, setPackages] = useState<PackageOption[]>([]);

  // Service search state
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceSearchResults, setServiceSearchResults] = useState<ServiceOption[]>([]);
  const [loadingServiceSearch, setLoadingServiceSearch] = useState(false);
  const [openServicePopover, setOpenServicePopover] = useState<number | null>(null);

  // Package search state
  const [packageSearchQuery, setPackageSearchQuery] = useState("");
  const [packageSearchResults, setPackageSearchResults] = useState<PackageOption[]>([]);
  const [loadingPackageSearch, setLoadingPackageSearch] = useState(false);
  const [openPackagePopover, setOpenPackagePopover] = useState<number | null>(null);

  // Document upload state
  const [contractDocument, setContractDocument] = useState<File | null>(null);
  const [existingDocument, setExistingDocument] = useState<string | null>(null);

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      code: "",
      customerId: 0,
      period: "",
      periodFrom: "",
      periodTo: "",
      periodAlias: "",
      normalDay: 5,
      urgentDay: 3,
      veryUrgentDay: 1,
      statusService: "ALL",
      discount: 0,
      discountUrgent: 50,
      discountVeryUrgent: 100,
      remarks: "",
      details: [],
    },
  });

  const statusService = form.watch("statusService");

  const {
    fields: detailFields,
    append: appendDetail,
    remove: removeDetail,
  } = useFieldArray({
    control: form.control,
    name: "details",
  });

  // Fetch contract data
  const fetchContract = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await contractService.getById(id);
      setContract(response.data);

      // Map details to form format - include itemName and itemPrice for display
      const details = response.data.details?.map(d => ({
        type: (d.serviceId ? "service" : "package") as "service" | "package",
        itemId: d.serviceId || d.packageId || 0,
        itemName: d.serviceId ? d.service?.name : d.package?.name,
        itemPrice: d.serviceId ? (d.service?.price || 0) : (d.package?.totalPrice || 0),
        discountNormal: d.discountNormal || 0,
        discountUrgent: d.discountUrgent || 50,
        discountVeryUrgent: d.discountVeryUrgent || 100,
      })) || [];

      // IMPORTANT: Set services and packages from contract details BEFORE form.reset
      // This ensures services/packages state is populated when form renders
      if (response.data.details) {
        const detailServices = response.data.details
          .filter(d => d.serviceId && d.service)
          .map(d => ({
            id: d.service!.id,
            code: d.service!.code || '',
            name: d.service!.name,
            price: d.service!.price || 0,
          }));

        if (detailServices.length > 0) {
          setServices(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const newServices = detailServices.filter(s => !existingIds.has(s.id));
            return [...prev, ...newServices];
          });
        }

        const detailPackages = response.data.details
          .filter(d => d.packageId && d.package)
          .map(d => ({
            id: d.package!.id,
            name: d.package!.name,
            totalPrice: d.package!.totalPrice || 0,
          }));

        if (detailPackages.length > 0) {
          setPackages(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newPackages = detailPackages.filter(p => !existingIds.has(p.id));
            return [...prev, ...newPackages];
          });
        }
      }

      // Populate form with fetched data
      form.reset({
        code: response.data.code,
        customerId: response.data.customerId,
        period: response.data.period,
        periodFrom: formatDateForInput(response.data.periodFrom),
        periodTo: formatDateForInput(response.data.periodTo),
        periodAlias: response.data.periodAlias || "",
        normalDay: response.data.normalDay,
        urgentDay: response.data.urgentDay,
        veryUrgentDay: response.data.veryUrgentDay,
        statusService: (response.data.statusService?.toUpperCase() as "ALL" | "SELECTED") || "ALL",
        discount: response.data.discount || 0,
        discountUrgent: response.data.discountUrgent || 50,
        discountVeryUrgent: response.data.discountVeryUrgent || 100,
        remarks: response.data.remarks || "",
        details,
      });

      // Ensure contract's customer is in the customers list for display
      if (response.data.customer) {
        setCustomers(prev => {
          const exists = prev.some(c => c.id === response.data.customer.id);
          if (!exists) {
            return [...prev, {
              id: response.data.customer.id,
              code: response.data.customer.code,
              customer_name: response.data.customer.customer_name,
            }];
          }
          return prev;
        });
      }

      // Set existing document
      setExistingDocument(response.data.documents || null);
    } catch (error: any) {
      console.error('Error fetching contract:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch contract');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  // Fetch customers for dropdown
  const fetchCustomers = useCallback(async () => {
    try {
      const response = await customerService.getJson({});
      const items = response.items || response.data || [];
      setCustomers(items.map((c: any) => ({
        id: c.id,
        code: c.code,
        customer_name: c.customer_name,
      })));
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  // Fetch services
  const fetchServices = useCallback(async () => {
    try {
      const response = await serviceService.getJson({});
      const items = response.items || response.data || [];
      setServices(items.map((s: any) => ({
        id: s.id,
        code: s.code || '',
        name: s.name,
        price: s.price || 0,
      })));
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }, []);

  // Fetch packages
  const fetchPackages = useCallback(async () => {
    try {
      const response = await packageService.getJson({});
      const items = response.items || response.data || [];
      setPackages(items.map((p: any) => ({
        id: p.id,
        name: p.name,
        totalPrice: p.total_price || p.totalPrice || 0,
      })));
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  }, []);

  useEffect(() => {
    fetchContract();
    fetchCustomers();
    fetchServices();
    fetchPackages();
  }, [fetchContract, fetchCustomers, fetchServices, fetchPackages]);

  // Debounced service search
  useEffect(() => {
    if (serviceSearchQuery.length < 2) {
      setServiceSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingServiceSearch(true);
      try {
        const response = await api.get('/services/json', { params: { q: serviceSearchQuery } });
        const items = response.data.items || response.data.data || [];
        setServiceSearchResults(items.map((s: any) => ({
          id: s.id,
          code: s.code || '',
          name: s.name,
          price: s.price || 0,
        })));
      } catch (error) {
        console.error('Error searching services:', error);
        setServiceSearchResults([]);
      } finally {
        setLoadingServiceSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [serviceSearchQuery]);

  // Debounced package search
  useEffect(() => {
    if (packageSearchQuery.length < 2) {
      setPackageSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingPackageSearch(true);
      try {
        const response = await api.get('/packages/json', { params: { q: packageSearchQuery } });
        const items = response.data.items || response.data.data || [];
        setPackageSearchResults(items.map((p: any) => ({
          id: p.id,
          name: p.name,
          totalPrice: p.total_price || p.totalPrice || 0,
        })));
      } catch (error) {
        console.error('Error searching packages:', error);
        setPackageSearchResults([]);
      } finally {
        setLoadingPackageSearch(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [packageSearchQuery]);

  const addNewDetail = (type: "service" | "package") => {
    appendDetail({
      type,
      itemId: 0,
      itemName: "",
      itemPrice: 0,
      discountNormal: 0,
      discountUrgent: 50,
      discountVeryUrgent: 100,
    });
  };

  const onSubmit = async (data: ContractFormData) => {
    try {
      setIsSubmitting(true);

      // Map form data to backend format
      const servicesPayload = data.details
        ?.filter(d => d.type === "service" && d.itemId > 0)
        .map(d => ({
          service_id: d.itemId,
          discount: d.discountNormal,
          'pc-urgent': d.discountUrgent,
          'pc-very-urgent': d.discountVeryUrgent,
        })) || [];

      const packagesPayload = data.details
        ?.filter(d => d.type === "package" && d.itemId > 0)
        .map(d => ({
          package_id: d.itemId,
          discount: d.discountNormal,
          'pc-urgent': d.discountUrgent,
          'pc-very-urgent': d.discountVeryUrgent,
        })) || [];

      const payload = {
        code: data.code,
        customer_id: data.customerId,
        period: data.period,
        periode_from: data.periodFrom,
        periode_to: data.periodTo,
        period_alias: data.periodAlias || undefined,
        normal_day: data.normalDay,
        urgent_day: data.urgentDay,
        very_urgent_day: data.veryUrgentDay,
        status_service: data.statusService.toLowerCase() as 'all' | 'selected',
        discount: data.discount || 0,
        dsc_urgent: data.discountUrgent || 50,
        dsc_very_urgent: data.discountVeryUrgent || 100,
        remarks: data.remarks || undefined,
        contract_document: contractDocument?.name || existingDocument || undefined,
        services: data.statusService === "SELECTED" ? servicesPayload : undefined,
        packages: data.statusService === "SELECTED" ? packagesPayload : undefined,
      };

      await contractService.update(id, payload);
      toast.success("Contract updated successfully");
      router.push(`/master/contract/${id}`);
    } catch (error: any) {
      console.error('Error updating contract:', error);
      toast.error(error.response?.data?.message || 'Failed to update contract');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Contract not found</p>
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
              onClick={() => router.push(`/master/contract/${id}`)}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Edit Contract</h1>
              <p className="text-sm text-muted-foreground mt-1">Update contract information</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/master/contract/${id}`)}
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

        {/* Contract Info Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Contract Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Code <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="CTR-2024-001"
                        {...field}
                        disabled
                        className="h-10 bg-muted/50 border-muted cursor-not-allowed"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="space-y-2 lg:col-span-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Customer <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.code} - {customer.customer_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Period <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="2024-2025"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="periodFrom"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Period From <span className="text-destructive">*</span>
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
                name="periodTo"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Period To <span className="text-destructive">*</span>
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
                name="periodAlias"
                render={({ field }) => (
                  <FormItem className="space-y-2 lg:col-span-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Period Alias
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Yearly Contract"
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

        {/* Lead Time Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              Lead Time (Days)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="normalDay"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Normal <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="5"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgentDay"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Urgent <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="veryUrgentDay"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Very Urgent <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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

        {/* Pricing Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Percent className="h-4 w-4 text-primary" />
              </div>
              Pricing & Discounts
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <FormField
                control={form.control}
                name="statusService"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Service Mode <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder="Select mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ALL">ALL - Same discount for all services</SelectItem>
                        <SelectItem value="SELECTED">SELECTED - Custom per service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Base Discount (%)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
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
                name="discountUrgent"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Urgent Charge (%)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="discountVeryUrgent"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Very Urgent Charge (%)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                      placeholder="Additional notes about this contract..."
                      {...field}
                      rows={3}
                      className="bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contract Document
              </p>
              <FileUpload
                value={contractDocument}
                onChange={setContractDocument}
                accept=".pdf,.doc,.docx"
                maxSize={10}
                placeholder="Upload contract document (PDF, DOC)"
              />
              {!contractDocument && existingDocument && (
                <p className="text-sm text-muted-foreground">
                  Current document: {existingDocument}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Services/Packages Section - Only shown when SELECTED mode */}
        {statusService === "SELECTED" && (
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Package className="h-4 w-4 text-primary" />
                  </div>
                  Services & Packages
                  <span className="text-sm font-normal text-muted-foreground">({detailFields.length})</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button type="button" onClick={() => addNewDetail("service")} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Service
                  </Button>
                  <Button type="button" onClick={() => addNewDetail("package")} variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Package
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {detailFields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No services or packages added yet.</p>
                  <p className="text-sm">Click &quot;Add Service&quot; or &quot;Add Package&quot; to add items with custom pricing.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[100px]">Type</TableHead>
                        <TableHead>Service/Package <span className="text-destructive">*</span></TableHead>
                        <TableHead className="w-[120px] text-right">Price</TableHead>
                        <TableHead className="w-[130px]">Discount (%)</TableHead>
                        <TableHead className="w-[130px]">Urgent (%)</TableHead>
                        <TableHead className="w-[130px]">V.Urgent (%)</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailFields.map((field, index) => (
                        <TableRow key={field.id}>
                          <TableCell className="font-medium text-sm">
                            {form.watch(`details.${index}.type`) === "service" ? "Service" : "Package"}
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.itemId`}
                              render={({ field: itemField }) => (
                                <FormItem>
                                  {form.watch(`details.${index}.type`) === "service" ? (
                                    <Popover
                                      open={openServicePopover === index}
                                      onOpenChange={(open) => {
                                        setOpenServicePopover(open ? index : null);
                                        if (!open) setServiceSearchQuery("");
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                              "w-full justify-between h-9 bg-background border-muted font-normal",
                                              !itemField.value && "text-muted-foreground"
                                            )}
                                          >
                                            {itemField.value
                                              ? <span dangerouslySetInnerHTML={{ __html: form.watch(`details.${index}.itemName`) || services.find(s => s.id === itemField.value)?.name || serviceSearchResults.find(s => s.id === itemField.value)?.name || "Select service..." }} />
                                              : "Search service..."}
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
                                              value={serviceSearchQuery}
                                              onChange={(e) => setServiceSearchQuery(e.target.value)}
                                              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                            />
                                          </div>
                                          <CommandList className="max-h-48">
                                            {loadingServiceSearch ? (
                                              <div className="py-6 text-center text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                              </div>
                                            ) : serviceSearchQuery.length < 2 ? (
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
                                                    onSelect={() => {
                                                      itemField.onChange(service.id);
                                                      form.setValue(`details.${index}.itemName`, service.name);
                                                      form.setValue(`details.${index}.itemPrice`, service.price || 0);
                                                      setOpenServicePopover(null);
                                                      setServiceSearchQuery("");
                                                      if (!services.find(s => s.id === service.id)) {
                                                        setServices(prev => [...prev, service]);
                                                      }
                                                    }}
                                                    className="cursor-pointer"
                                                  >
                                                    <span dangerouslySetInnerHTML={{ __html: (service.code ? `${service.code} - ` : '') + service.name }} />
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            )}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  ) : (
                                    <Popover
                                      open={openPackagePopover === index}
                                      onOpenChange={(open) => {
                                        setOpenPackagePopover(open ? index : null);
                                        if (!open) setPackageSearchQuery("");
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <FormControl>
                                          <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                              "w-full justify-between h-9 bg-background border-muted font-normal",
                                              !itemField.value && "text-muted-foreground"
                                            )}
                                          >
                                            {itemField.value
                                              ? <span dangerouslySetInnerHTML={{ __html: form.watch(`details.${index}.itemName`) || packages.find(p => p.id === itemField.value)?.name || packageSearchResults.find(p => p.id === itemField.value)?.name || "Select package..." }} />
                                              : "Search package..."}
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
                                              value={packageSearchQuery}
                                              onChange={(e) => setPackageSearchQuery(e.target.value)}
                                              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                            />
                                          </div>
                                          <CommandList className="max-h-48">
                                            {loadingPackageSearch ? (
                                              <div className="py-6 text-center text-sm text-muted-foreground">
                                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                                              </div>
                                            ) : packageSearchQuery.length < 2 ? (
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
                                                    onSelect={() => {
                                                      itemField.onChange(pkg.id);
                                                      form.setValue(`details.${index}.itemName`, pkg.name);
                                                      form.setValue(`details.${index}.itemPrice`, pkg.totalPrice || 0);
                                                      setOpenPackagePopover(null);
                                                      setPackageSearchQuery("");
                                                      if (!packages.find(p => p.id === pkg.id)) {
                                                        setPackages(prev => [...prev, pkg]);
                                                      }
                                                    }}
                                                    className="cursor-pointer"
                                                  >
                                                    <span dangerouslySetInnerHTML={{ __html: pkg.name }} />
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            )}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {(() => {
                              const price = form.watch(`details.${index}.itemPrice`) || 0;
                              const discount = form.watch(`details.${index}.discountNormal`) || 0;
                              const finalPrice = price - (price * discount / 100);
                              return formatCurrency(finalPrice);
                            })()}
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.discountNormal`}
                              render={({ field: discountField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      {...discountField}
                                      onChange={(e) => discountField.onChange(parseFloat(e.target.value) || 0)}
                                      className="h-9 bg-background border-muted"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.discountUrgent`}
                              render={({ field: urgentField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="50"
                                      {...urgentField}
                                      onChange={(e) => urgentField.onChange(parseInt(e.target.value) || 0)}
                                      className="h-9 bg-background border-muted"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <FormField
                              control={form.control}
                              name={`details.${index}.discountVeryUrgent`}
                              render={({ field: veryUrgentField }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="100"
                                      {...veryUrgentField}
                                      onChange={(e) => veryUrgentField.onChange(parseInt(e.target.value) || 0)}
                                      className="h-9 bg-background border-muted"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDetail(index)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}
