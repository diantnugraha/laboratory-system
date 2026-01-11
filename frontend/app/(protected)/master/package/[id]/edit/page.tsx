'use client';

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  GripVertical,
  Plus,
  Trash2,
  Package,
  FileText,
  DollarSign,
  ListChecks,
  Save,
  X,
  Users,
  ToggleLeft,
  Search,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { packageSchema, PackageFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import { packageService, Package as PackageType } from "@/services/packageService";
import { customerService } from "@/services/customerService";
import { serviceService } from "@/services/serviceService";

// Simplified service type for search results from getJson
interface ServiceSearchItem {
  id: number;
  code: string;
  name: string;
  parameter?: { id: number; name: string } | null;
  price: { value: number; currency: string } | number;
}

// Helper to extract price value from service (handles both object and number formats)
const getServicePrice = (price: unknown): number => {
  if (price === null || price === undefined) return 0;
  if (typeof price === 'number') return price;
  if (typeof price === 'object' && price !== null && 'value' in price) {
    const val = (price as { value: number }).value;
    return typeof val === 'number' ? val : 0;
  }
  return 0;
};

interface PackageServiceItem {
  id: string;
  serviceId: number;
  code: string;
  name: string;
  parameter: string;
  price: number;
}

interface CustomerOption {
  id: number;
  code: string;
  customer_name: string;
}

const formatCurrency = (value: number | null | undefined) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value || 0);
};

// Helper to parse service list
const parseServiceList = (listService: string | null | undefined): number[] => {
  if (!listService || typeof listService !== 'string') {
    return [];
  }
  const trimmed = listService.trim().replace(/^,+|,+$/g, '');
  if (!trimmed) {
    return [];
  }
  return trimmed
    .split(',')
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id) && id > 0);
};

interface SortableRowProps {
  service: PackageServiceItem;
  index: number;
  onRemove: (id: string) => void;
}

const SortableRow = React.forwardRef<HTMLTableRowElement, SortableRowProps>(
  ({ service, index, onRemove }, _ref) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: service.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <tr
        ref={setNodeRef}
        style={style}
        className={cn(
          "group transition-colors hover:bg-muted/50 border-b",
          isDragging && "opacity-50 bg-muted"
        )}
      >
        <td className="w-10 px-2 py-3">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted rounded-md transition-colors"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </button>
        </td>
        <td className="text-center px-2 py-3 font-medium text-muted-foreground">{index + 1}</td>
        <td className="font-semibold px-2 py-3 text-primary">{service.code}</td>
        <td className="px-2 py-3" dangerouslySetInnerHTML={{ __html: service.name }} />
        <td className="px-2 py-3 text-muted-foreground" dangerouslySetInnerHTML={{ __html: service.parameter }} />
        <td className="text-right px-2 py-3 font-medium">{formatCurrency(service.price || 0)}</td>
        <td className="w-10 px-2 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
            onClick={() => onRemove(service.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    );
  }
);
SortableRow.displayName = "SortableRow";

export default function PackageEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [pkg, setPkg] = useState<PackageType | null>(null);
  const [packageServices, setPackageServices] = useState<PackageServiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer search state
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Service search state
  const [availableServices, setAvailableServices] = useState<ServiceSearchItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      customerId: null,
      group: false,
      description: "",
    },
  });

  // Fetch package data
  const fetchPackage = useCallback(async () => {
    try {
      setLoading(true);
      const response = await packageService.getById(id);
      if (response.success && response.data) {
        const packageData = response.data;
        setPkg(packageData);

        // Set form values
        form.reset({
          name: packageData.name,
          customerId: packageData.customerId,
          group: packageData.group === 1,
          description: packageData.description || "",
        });

        // If customer exists, add to customers list for display
        if (packageData.customer) {
          setCustomers([{
            id: packageData.customer.id,
            code: packageData.customer.code,
            customer_name: packageData.customer.customer_name,
          }]);
        }

        // Parse service IDs and fetch service details
        const serviceIds = packageData.serviceIds || parseServiceList(packageData.listService);
        if (serviceIds.length > 0) {
          const servicesPromises = serviceIds.map(async (serviceId, index) => {
            try {
              const serviceResponse = await serviceService.getById(serviceId);
              const service = serviceResponse.data;
              return {
                id: `pkg-svc-${index}`,
                serviceId: service.id,
                code: service.code,
                name: service.name,
                parameter: service.parameter?.name || '-',
                price: service.price || 0,
              };
            } catch {
              return null;
            }
          });
          const fetchedServices = await Promise.all(servicesPromises);
          setPackageServices(fetchedServices.filter((s): s is PackageServiceItem => s !== null));
        }
      }
    } catch (error: any) {
      console.error('Error fetching package:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch package');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    if (id) {
      fetchPackage();
    }
  }, [id, fetchPackage]);

  // Fetch customers when search query changes
  useEffect(() => {
    const fetchCustomers = async () => {
      if (customerSearchQuery.length < 2) {
        return;
      }

      try {
        setLoadingCustomers(true);
        const response = await customerService.getJson({ q: customerSearchQuery });
        const items = response.items || response.data || [];
        setCustomers(items.map((c: any) => ({
          id: c.id,
          code: c.code,
          customer_name: c.customer_name,
        })));
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const debounce = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearchQuery]);

  // Fetch services when search query changes
  useEffect(() => {
    const fetchServices = async () => {
      if (searchQuery.length < 2) {
        setAvailableServices([]);
        return;
      }

      try {
        setLoadingServices(true);
        const response = await serviceService.getJson({ q: searchQuery });
        const items = response.items || response.data || [];
        setAvailableServices(items);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoadingServices(false);
      }
    };

    const debounce = setTimeout(fetchServices, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const selectedCustomer = useMemo(() => {
    const customerId = form.watch("customerId");
    return customers.find((c) => c.id === customerId);
  }, [form.watch("customerId"), customers]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter available services (not already added)
  const filteredServices = useMemo(() => {
    const addedIds = new Set(packageServices.map((ps) => ps.serviceId));
    return availableServices.filter((s) => !addedIds.has(s.id));
  }, [packageServices, availableServices]);

  // Calculate totals
  const totalPrice = useMemo(() => {
    return packageServices.reduce((sum, s) => sum + s.price, 0);
  }, [packageServices]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPackageServices((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddService = (service: ServiceSearchItem) => {
    const newPackageService: PackageServiceItem = {
      id: `pkg-svc-${Date.now()}`,
      serviceId: service.id,
      code: service.code,
      name: service.name,
      parameter: service.parameter?.name || '-',
      price: getServicePrice(service.price),
    };
    setPackageServices((prev) => [...prev, newPackageService]);
    setSearchQuery("");
  };

  const handleRemoveService = (id: string) => {
    setPackageServices((prev) => prev.filter((s) => s.id !== id));
  };

  const onSubmit = async (data: PackageFormData) => {
    // Validate services
    if (packageServices.length === 0) {
      toast.error("At least one service is required");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: data.name,
        description: data.description || null,
        serviceIds: packageServices.map((s) => s.serviceId),
        customer_id: data.customerId || null,
        group: data.group ? 1 : 0,
      };

      const response = await packageService.update(id, payload);

      if (response.success) {
        toast.success("Package updated successfully");
        router.push(`/master/package/${id}`);
      }
    } catch (error: any) {
      console.error('Error updating package:', error);
      const message = error.response?.data?.message || 'Failed to update package';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Package not found</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/master/package/${id}`)}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Edit Package</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {pkg.code} - {pkg.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/master/package/${id}`)}
              className="gap-2"
              disabled={submitting}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {/* Package Information Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              Package Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <FileText className="h-3.5 w-3.5" />
                      Name Package
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Package name"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Field */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Users className="h-3.5 w-3.5" />
                      Customer (Optional)
                    </FormLabel>
                    <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full h-10 justify-between bg-muted/30 hover:bg-muted/50 border-muted font-normal",
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
                            {customerSearchQuery.length < 2 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
                              </div>
                            ) : loadingCustomers ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                                Searching...
                              </div>
                            ) : customers.length === 0 ? (
                              <CommandEmpty>No customer found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {customers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={String(customer.id)}
                                    onSelect={() => {
                                      field.onChange(customer.id);
                                      setCustomerSearchOpen(false);
                                      setCustomerSearchQuery("");
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{customer.code} - {customer.customer_name}</span>
                                    </div>
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
            </div>

            {/* Group Price Checkbox */}
            <FormField
              control={form.control}
              name="group"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/20">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <ToggleLeft className="h-4 w-4 text-primary" />
                      Group Price
                    </FormLabel>
                    <FormDescription className="text-xs text-muted-foreground">
                      Enable group pricing for this package
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <FileText className="h-3.5 w-3.5" />
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter package description..."
                      {...field}
                      rows={3}
                      className="bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 inline-flex items-center gap-4">
              <div className="p-2 rounded-md bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Price</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(totalPrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <ListChecks className="h-4 w-4 text-primary" />
                </div>
                Services
                <span className="text-sm font-normal text-muted-foreground">
                  ({packageServices.length} items)
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={packageServices.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="overflow-x-auto max-h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="w-10"></TableHead>
                          <TableHead className="w-14 text-center font-semibold">No</TableHead>
                          <TableHead className="w-28 font-semibold">Code</TableHead>
                          <TableHead className="font-semibold">Name</TableHead>
                          <TableHead className="w-32 font-semibold">Parameter</TableHead>
                          <TableHead className="w-36 text-right font-semibold">Price</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <tbody>
                        {packageServices.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="h-32 text-center">
                              <div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
                                <Plus className="h-10 w-10 text-muted-foreground/30" />
                                <span>No services added yet</span>
                                <span className="text-xs">Use the search below to add services</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          packageServices.map((service, index) => (
                            <SortableRow
                              key={service.id}
                              service={service}
                              index={index}
                              onRemove={handleRemoveService}
                            />
                          ))
                        )}
                      </tbody>
                    </Table>
                  </div>
                </SortableContext>
              </DndContext>

              {/* Inline Add Service Search */}
              <div className="border-t">
                <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
                  <Plus className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Add Service</span>
                </div>
                <Command shouldFilter={false} className="bg-transparent">
                  <div className="flex items-center px-4 py-2 bg-background">
                    <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Type to search service by code or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  {searchQuery.length >= 2 && (
                    <CommandList className="max-h-[200px] border-b">
                      {loadingServices ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                          Searching...
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <CommandEmpty>No services found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredServices.slice(0, 8).map((service) => (
                            <CommandItem
                              key={service.id}
                              value={`${service.id}-${service.code}`}
                              onSelect={() => handleAddService(service)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-between w-full gap-2">
                                <div className="min-w-0 flex-1">
                                  <span className="font-medium text-primary">{service.code}</span>
                                  <span className="mx-2">-</span>
                                  <span className="truncate" dangerouslySetInnerHTML={{ __html: service.name }} />
                                </div>
                                <span className="text-muted-foreground text-sm whitespace-nowrap">
                                  {formatCurrency(getServicePrice(service.price))}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  )}
                </Command>
              </div>
            </div>

            {/* Summary Footer */}
            <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Services</p>
                    <p className="text-lg font-semibold">{packageServices.length}</p>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Price</p>
                    <p className="text-lg font-bold text-primary">{formatCurrency(totalPrice)}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
