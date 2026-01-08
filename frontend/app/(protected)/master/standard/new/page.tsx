'use client';

import React, { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Save,
  X,
  Search,
  Users,
  Layers,
  Package,
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
import { services, Service, packages, Package as PackageType, customers, units, methods } from "@/data/masterData";
import { toast } from "sonner";

// Schema for Standard form
const standardNewSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  customerId: z.string().min(1, "Customer is required"),
});

type StandardNewFormData = z.infer<typeof standardNewSchema>;

interface StandardItem {
  id: string;
  sourceType: "service" | "package";
  sourceId: string;
  parameter: string;
  method: string;
  matrix: string;
  matrixId: string;
  minValue: string;
  maxValue: string;
  unitId: string;
}

export default function StandardNewPage() {
  const router = useRouter();
  const [standardItems, setStandardItems] = useState<StandardItem[]>([]);
  
  // Service search
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [serviceSearchOpen, setServiceSearchOpen] = useState(false);
  
  // Package search
  const [packageSearchQuery, setPackageSearchQuery] = useState("");
  const [packageSearchOpen, setPackageSearchOpen] = useState(false);
  
  // Customer search
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const form = useForm<StandardNewFormData>({
    resolver: zodResolver(standardNewSchema),
    defaultValues: {
      code: "",
      name: "",
      customerId: "",
    },
  });

  // Customer search filter
  const filteredCustomers = useMemo(() => {
    if (customerSearchQuery.length < 2) return [];
    const query = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.status === "Contract" &&
        (c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query))
    );
  }, [customerSearchQuery]);

  const selectedCustomer = useMemo(() => {
    const customerId = form.watch("customerId");
    return customers.find((c) => c.id === customerId);
  }, [form.watch("customerId")]);

  // Service search filter
  const filteredServices = useMemo(() => {
    if (serviceSearchQuery.length < 2) return [];
    const query = serviceSearchQuery.toLowerCase();
    return services.filter(
      (s) =>
        s.status === "Active" &&
        (s.code.toLowerCase().includes(query) ||
          s.name.toLowerCase().includes(query) ||
          s.parameter.toLowerCase().includes(query))
    );
  }, [serviceSearchQuery]);

  // Package search filter
  const filteredPackages = useMemo(() => {
    if (packageSearchQuery.length < 2) return [];
    const query = packageSearchQuery.toLowerCase();
    return packages.filter(
      (p) =>
        p.status === "Active" &&
        (p.code.toLowerCase().includes(query) ||
          p.name.toLowerCase().includes(query))
    );
  }, [packageSearchQuery]);

  // Active units for dropdown
  const activeUnits = useMemo(() => {
    return units.filter((u) => u.status === "Active");
  }, []);

  const handleAddService = (service: Service) => {
    // Get matrix from method relation
    const method = methods.find((m) => m.id === service.methodId);
    const newItem: StandardItem = {
      id: `std-item-${Date.now()}-${service.id}`,
      sourceType: "service",
      sourceId: service.id,
      parameter: service.parameter,
      method: service.method,
      matrix: method?.matrix || "",
      matrixId: method?.matrixId || "",
      minValue: "",
      maxValue: "",
      unitId: "",
    };
    setStandardItems((prev) => [...prev, newItem]);
    setServiceSearchQuery("");
    setServiceSearchOpen(false);
  };

  const handleAddPackage = (pkg: PackageType) => {
    // Add mock items for the package (in real app, would fetch services from package)
    const mockServices = services.slice(0, Math.min(pkg.services, 3));
    const newItems: StandardItem[] = mockServices.map((service, idx) => {
      // Get matrix from method relation
      const method = methods.find((m) => m.id === service.methodId);
      return {
        id: `std-item-${Date.now()}-${pkg.id}-${idx}`,
        sourceType: "package",
        sourceId: pkg.id,
        parameter: service.parameter,
        method: service.method,
        matrix: method?.matrix || "",
        matrixId: method?.matrixId || "",
        minValue: "",
        maxValue: "",
        unitId: "",
      };
    });
    setStandardItems((prev) => [...prev, ...newItems]);
    setPackageSearchQuery("");
    setPackageSearchOpen(false);
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

  const onSubmit = (data: StandardNewFormData) => {
    if (standardItems.length === 0) {
      toast.error("Please add at least one service or package");
      return;
    }
    console.log("Form data:", { ...data, items: standardItems });
    toast.success("Standard created successfully");
    router.push("/master/standard");
  };

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
                onClick={() => router.push("/master/standard")}
                className="h-9 w-9 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Add New Standard</h1>
                <p className="text-sm text-muted-foreground mt-1">Create a new standard with services and packages</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/master/standard")}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Standard
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
                        Customer
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
                                ? `${selectedCustomer.code} - ${selectedCustomer.name}`
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
                              ) : filteredCustomers.length === 0 ? (
                                <CommandEmpty>No customer found</CommandEmpty>
                              ) : (
                                <CommandGroup>
                                  {filteredCustomers.map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.id}
                                      onSelect={() => {
                                        field.onChange(customer.id);
                                        setCustomerSearchOpen(false);
                                        setCustomerSearchQuery("");
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{customer.code} - {customer.name}</span>
                                        <span className="text-xs text-muted-foreground">{customer.industry}</span>
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

          {/* Add Service/Package Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Layers className="h-4 w-4 text-primary" />
                </div>
                Add Service / Package
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Add Service Search */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Plus className="h-3.5 w-3.5" />
                    Add Service
                  </label>
                  <Popover open={serviceSearchOpen} onOpenChange={setServiceSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-10 justify-between bg-muted/30 hover:bg-muted/50 border-muted font-normal text-muted-foreground"
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
                          {serviceSearchQuery.length < 2 ? (
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
                                  value={service.id}
                                  onSelect={() => handleAddService(service)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{service.code} - {service.name}</span>
                                    <span className="text-xs text-muted-foreground">{service.parameter}</span>
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

                {/* Add Package Search */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <Package className="h-3.5 w-3.5" />
                    Add Package
                  </label>
                  <Popover open={packageSearchOpen} onOpenChange={setPackageSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full h-10 justify-between bg-muted/30 hover:bg-muted/50 border-muted font-normal text-muted-foreground"
                      >
                        Search package...
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
                            value={packageSearchQuery}
                            onChange={(e) => setPackageSearchQuery(e.target.value)}
                            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                          />
                        </div>
                        <CommandList className="max-h-48">
                          {packageSearchQuery.length < 2 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Type at least 2 characters to search
                            </div>
                          ) : filteredPackages.length === 0 ? (
                            <CommandEmpty>No package found</CommandEmpty>
                          ) : (
                            <CommandGroup>
                              {filteredPackages.map((pkg) => (
                                <CommandItem
                                  key={pkg.id}
                                  value={pkg.id}
                                  onSelect={() => handleAddPackage(pkg)}
                                  className="cursor-pointer"
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{pkg.code} - {pkg.name}</span>
                                    <span className="text-xs text-muted-foreground">{pkg.services} services</span>
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
                  <p className="text-sm">Add services or packages to build your standard</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Parameter</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Matrix</TableHead>
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
                          <TableCell className="font-medium">{item.parameter}</TableCell>
                          <TableCell>{item.method}</TableCell>
                          <TableCell>
                            <span className="text-sm">{item.matrix || "-"}</span>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="0"
                              value={item.minValue}
                              onChange={(e) => handleUpdateItem(item.id, "minValue", e.target.value)}
                              className="h-9 w-24 bg-muted/30"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="text"
                              placeholder="0"
                              value={item.maxValue}
                              onChange={(e) => handleUpdateItem(item.id, "maxValue", e.target.value)}
                              className="h-9 w-24 bg-muted/30"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={item.unitId}
                              onValueChange={(value) => handleUpdateItem(item.id, "unitId", value)}
                            >
                              <SelectTrigger className="h-9 w-32 bg-muted/30">
                                <SelectValue placeholder="Select unit" />
                              </SelectTrigger>
                              <SelectContent>
                                {activeUnits.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name}
                                  </SelectItem>
                                ))}
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
