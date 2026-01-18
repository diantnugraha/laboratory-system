'use client';

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  X,
  FileText,
  Save,
  Search,
  Users,
  Layers,
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import { standardService, Standard } from "@/services/standardService";
import { serviceService } from "@/services/serviceService";
import { customerService } from "@/services/customerService";
import { unitService } from "@/services/unitService";

// Schema for Standard form
const standardEditSchema = z.object({
  code: z.string().min(1, "Code is required").max(50, "Code must be less than 50 characters"),
  name: z.string().min(1, "Name is required").max(255, "Name must be less than 255 characters"),
  customerId: z.string().optional(),
});

type StandardEditFormData = z.infer<typeof standardEditSchema>;

interface StandardItem {
  id: string;
  serviceId: number;
  serviceName: string;
  serviceCode: string;
  parameter: string;
  method: string;
  min: string;
  max: string;
  unit: string;
}

interface ServiceJsonItem {
  id: number;
  code: string;
  name: string;
  parameter?: { id: number; name: string };
  method?: { id: number; name: string };
}

interface CustomerJsonItem {
  id: number;
  code: string;
  customer_name: string;
}

interface UnitJsonItem {
  id: number;
  name: string;
}

export default function StandardEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [loading, setLoading] = useState(true);
  const [standardItems, setStandardItems] = useState<StandardItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialCustomer, setInitialCustomer] = useState<CustomerJsonItem | null>(null);

  // Units
  const [units, setUnits] = useState<UnitJsonItem[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Service search
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  const [filteredServices, setFilteredServices] = useState<ServiceJsonItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  // Customer search
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<CustomerJsonItem[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  const form = useForm<StandardEditFormData>({
    resolver: zodResolver(standardEditSchema),
    defaultValues: {
      code: "",
      name: "",
      customerId: "",
    },
  });

  // Fetch existing standard data and units on mount
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setLoadingUnits(true);

        // Fetch standard and units in parallel
        const [standardResponse, unitsResponse] = await Promise.all([
          standardService.getById(id),
          unitService.getJson({}),
        ]);

        const standard = standardResponse.data;

        // Populate form
        form.reset({
          code: standard.code,
          name: standard.name,
          customerId: standard.customer_id ? String(standard.customer_id) : "",
        });

        // Set initial customer for display
        if (standard.customer) {
          const customerData: CustomerJsonItem = {
            id: standard.customer_id!,
            code: standard.customer.code,
            customer_name: standard.customer.customer_name,
          };
          setInitialCustomer(customerData);
          setFilteredCustomers([customerData]);
        }

        // Convert standartDetails to StandardItem format
        const items: StandardItem[] = standard.standartDetails.map((detail, index) => ({
          id: `existing-${detail.id || index}`,
          serviceId: detail.service_id,
          serviceName: detail.service?.name || '',
          serviceCode: detail.service?.code || '',
          parameter: detail.service?.parameter?.name || '',
          method: detail.service?.method?.name || '',
          min: detail.min,
          max: detail.max,
          unit: detail.unit,
        }));
        setStandardItems(items);

        // Set units
        setUnits(unitsResponse.items || unitsResponse.data || []);

      } catch (error: any) {
        if (error.response?.status === 404) {
          toast.error('Standard not found');
          router.push('/master/standard');
        } else {
          toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('standard')));
        }
      } finally {
        setLoading(false);
        setLoadingUnits(false);
      }
    };
    fetchData();
  }, [id, form, router]);

  // Fetch customers on search
  useEffect(() => {
    const fetchCustomers = async () => {
      if (customerSearchQuery.length < 2) {
        // Keep initial customer in list if exists
        if (initialCustomer) {
          setFilteredCustomers([initialCustomer]);
        } else {
          setFilteredCustomers([]);
        }
        return;
      }

      try {
        setLoadingCustomers(true);
        const response = await customerService.getJson({ q: customerSearchQuery });
        const items = response.items || response.data || [];
        setFilteredCustomers(items.map((c: any) => ({
          id: c.id,
          code: c.code,
          customer_name: c.customer_name,
        })));
      } catch (error) {
        console.error('Error fetching customers:', error);
        setFilteredCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const timeoutId = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery, initialCustomer]);

  // Fetch services on search
  useEffect(() => {
    const fetchServices = async () => {
      if (serviceSearchQuery.length < 2) {
        setFilteredServices([]);
        return;
      }

      try {
        setLoadingServices(true);
        const response = await serviceService.getJson({ q: serviceSearchQuery });
        const items = response.items || response.data || [];
        setFilteredServices(items);
      } catch (error) {
        console.error('Error fetching services:', error);
        setFilteredServices([]);
      } finally {
        setLoadingServices(false);
      }
    };

    const timeoutId = setTimeout(fetchServices, 300);
    return () => clearTimeout(timeoutId);
  }, [serviceSearchQuery]);

  const selectedCustomer = useMemo(() => {
    const customerId = form.watch("customerId");
    if (!customerId) return null;
    return filteredCustomers.find((c) => String(c.id) === customerId) || initialCustomer;
  }, [form.watch("customerId"), filteredCustomers, initialCustomer]);

  const handleAddService = (service: ServiceJsonItem) => {
    // Check if service already added
    if (standardItems.some(item => item.serviceId === service.id)) {
      toast.error("Service already added");
      return;
    }

    const newItem: StandardItem = {
      id: `std-item-${Date.now()}-${service.id}`,
      serviceId: service.id,
      serviceName: service.name,
      serviceCode: service.code,
      parameter: service.parameter?.name || '',
      method: service.method?.name || '',
      min: '',
      max: '',
      unit: '',
    };
    setStandardItems((prev) => [...prev, newItem]);
    setServiceSearchQuery("");
    setServiceSearchOpen(false);
  };

  const handleRemoveItem = (id: string) => {
    setStandardItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof StandardItem, value: string) => {
    setStandardItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const onSubmit = async (data: StandardEditFormData) => {
    if (standardItems.length === 0) {
      toast.error("Please add at least one service");
      return;
    }

    // Validate all items have required fields
    for (const item of standardItems) {
      if (!item.min || !item.max || !item.unit) {
        toast.error("Please fill in min, max, and unit for all items");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await standardService.update(id, {
        code: data.code,
        name: data.name,
        customerId: data.customerId ? parseInt(data.customerId) : null,
        categoryId: null,
        standartDetails: standardItems.map(item => ({
          serviceId: item.serviceId,
          min: item.min,
          max: item.max,
          unit: item.unit,
        })),
      });
      toast.success("Standard updated successfully");
      router.push(`/master/standard/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.UPDATE('standard')));
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
              onClick={() => router.push(`/master/standard/${id}`)}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Edit Standard</h1>
              <p className="text-sm text-muted-foreground mt-1">Update standard information</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/master/standard/${id}`)}
              className="gap-2"
              disabled={isSubmitting}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Update Standard
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Standard Information Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Standard Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-6">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Code
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Standard code"
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
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Name Standard
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Standard name"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Search Field */}
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
                            {loadingCustomers ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              </div>
                            ) : customerSearchQuery.length < 2 ? (
                              <>
                                <CommandItem
                                  value=""
                                  onSelect={() => {
                                    field.onChange("");
                                    setCustomerSearchOpen(false);
                                    setCustomerSearchQuery("");
                                  }}
                                  className="cursor-pointer"
                                >
                                  None (No Customer)
                                </CommandItem>
                                {initialCustomer && (
                                  <CommandItem
                                    key={initialCustomer.id}
                                    value={String(initialCustomer.id)}
                                    onSelect={() => {
                                      field.onChange(String(initialCustomer.id));
                                      setCustomerSearchOpen(false);
                                      setCustomerSearchQuery("");
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">{initialCustomer.code} - {initialCustomer.customer_name}</span>
                                      <span className="text-xs text-muted-foreground">Current selection</span>
                                    </div>
                                  </CommandItem>
                                )}
                                <div className="py-4 text-center text-sm text-muted-foreground">
                                  Type at least 2 characters to search
                                </div>
                              </>
                            ) : filteredCustomers.length === 0 ? (
                              <CommandEmpty>No customer found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                <CommandItem
                                  value=""
                                  onSelect={() => {
                                    field.onChange("");
                                    setCustomerSearchOpen(false);
                                    setCustomerSearchQuery("");
                                  }}
                                  className="cursor-pointer"
                                >
                                  None (No Customer)
                                </CommandItem>
                                {filteredCustomers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={String(customer.id)}
                                    onSelect={() => {
                                      field.onChange(String(customer.id));
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
          </CardContent>
        </Card>

        {/* Add Service Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              Add Service
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Plus className="h-3.5 w-3.5" />
                Search and Add Service
              </label>
              <Popover open={serviceSearchOpen} onOpenChange={setServiceSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full max-w-md h-10 justify-between bg-muted/30 hover:bg-muted/50 border-muted font-normal text-muted-foreground"
                  >
                    Search service...
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
                        value={serviceSearchQuery}
                        onChange={(e) => setServiceSearchQuery(e.target.value)}
                        className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <CommandList className="max-h-48">
                      {loadingServices ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : serviceSearchQuery.length < 2 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Type at least 2 characters to search
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <CommandEmpty>No service found</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredServices.map((service) => (
                            <CommandItem
                              key={service.id}
                              value={String(service.id)}
                              onSelect={() => handleAddService(service)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{service.code} - {service.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {service.parameter?.name || 'No parameter'}
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
          </CardContent>
        </Card>

        {/* Items Table Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Layers className="h-4 w-4 text-primary" />
              </div>
              Standard Items
              {standardItems.length > 0 && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({standardItems.length} items)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {standardItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No items added yet</p>
                <p className="text-sm">Add services to build your standard</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Parameter</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Min. Value</TableHead>
                      <TableHead>Max. Value</TableHead>
                      <TableHead>Unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {standardItems.map((item) => (
                      <TableRow key={item.id} className="group">
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveItem(item.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell className="font-medium">
                          {item.serviceCode} - <RenderHTML html={item.serviceName} />
                        </TableCell>
                        <TableCell><RenderHTML html={item.parameter || "-"} /></TableCell>
                        <TableCell><RenderHTML html={item.method || "-"} /></TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="0"
                            value={item.min}
                            onChange={(e) => handleUpdateItem(item.id, "min", e.target.value)}
                            className="h-9 w-24 bg-muted/30"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="text"
                            placeholder="0"
                            value={item.max}
                            onChange={(e) => handleUpdateItem(item.id, "max", e.target.value)}
                            className="h-9 w-24 bg-muted/30"
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={item.unit}
                            onValueChange={(value) => handleUpdateItem(item.id, "unit", value)}
                          >
                            <SelectTrigger className="h-9 w-32 bg-muted/30">
                              <SelectValue placeholder="Select unit" />
                            </SelectTrigger>
                            <SelectContent>
                              {loadingUnits ? (
                                <SelectItem value="" disabled>Loading...</SelectItem>
                              ) : units.length === 0 ? (
                                <SelectItem value="" disabled>No units available</SelectItem>
                              ) : (
                                units.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.name}>
                                    {unit.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
