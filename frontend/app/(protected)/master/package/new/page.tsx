'use client';

import React, { useState, useMemo, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  GripVertical,
  Plus,
  Trash2,
  Package,
  FileText,
  DollarSign,
  ListChecks,
  Save,
  X,
  Search,
  Users,
  ToggleLeft,
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
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { packageSchema, PackageFormData } from "@/lib/schemas";
import { services, Service, customers } from "@/data/masterData";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PackageService {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  parameter: string;
  price: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

interface SortableRowProps {
  service: PackageService;
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
        <td className="px-2 py-3">{service.name}</td>
        <td className="px-2 py-3 text-muted-foreground">{service.parameter}</td>
        <td className="text-right px-2 py-3 font-medium">{formatCurrency(service.price)}</td>
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

interface SortableCardProps {
  service: PackageService;
  index: number;
  onRemove: (id: string) => void;
}

function SortableCard({ service, index, onRemove }: SortableCardProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group border rounded-lg p-3 bg-background hover:bg-muted/30 hover:border-primary/30 transition-all",
        isDragging && "opacity-50 bg-muted"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1.5 hover:bg-muted rounded-md transition-colors mt-0.5"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">#{index + 1}</span>
              <span className="font-semibold text-sm text-primary truncate">{service.code}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              onClick={() => onRemove(service.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-sm text-foreground truncate mt-1">{service.name}</p>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed">
            <span className="text-xs text-muted-foreground">{service.parameter}</span>
            <span className="text-sm font-semibold text-foreground">{formatCurrency(service.price)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PackageNewPage() {
  const router = useRouter();
  const [packageServices, setPackageServices] = useState<PackageService[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      name: "",
      customerId: "",
      groupPrice: false,
      description: "",
      services: 0,
      price: 0,
    },
  });

  // Customer search
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter available services (not already added)
  const availableServices = useMemo(() => {
    const addedIds = new Set(packageServices.map((ps) => ps.serviceId));
    return services.filter((s) => s.status === "Active" && !addedIds.has(s.id));
  }, [packageServices]);

  // Filter by search query
  const filteredServices = useMemo(() => {
    if (!searchQuery) return availableServices;
    const query = searchQuery.toLowerCase();
    return availableServices.filter(
      (s) =>
        s.code.toLowerCase().includes(query) ||
        s.name.toLowerCase().includes(query) ||
        s.parameter.toLowerCase().includes(query)
    );
  }, [availableServices, searchQuery]);

  // Calculate totals
  const totalPrice = useMemo(() => {
    return packageServices.reduce((sum, s) => sum + s.price, 0);
  }, [packageServices]);

  useEffect(() => {
    form.setValue("services", packageServices.length);
    form.setValue("price", totalPrice);
  }, [packageServices, totalPrice, form]);

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

  const handleAddService = (service: Service) => {
    const newPackageService: PackageService = {
      id: `pkg-svc-${Date.now()}`,
      serviceId: service.id,
      code: service.code,
      name: service.name,
      parameter: service.parameter,
      price: service.price,
    };
    setPackageServices((prev) => [...prev, newPackageService]);
    setSearchQuery("");
  };

  const handleRemoveService = (id: string) => {
    setPackageServices((prev) => prev.filter((s) => s.id !== id));
  };

  const onSubmit = (data: PackageFormData) => {
    console.log("Form data:", { ...data, packageServices });
    toast.success("Package created successfully");
    router.push("/master/package");
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
                onClick={() => router.push("/master/package")}
                className="h-9 w-9 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Add New Package</h1>
                <p className="text-sm text-muted-foreground mt-1">Create a new service package</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/master/package")}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Package
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

              {/* Group Price Checkbox */}
              <FormField
                control={form.control}
                name="groupPrice"
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
              {/* Mobile Card View */}
              <div className="sm:hidden p-4 space-y-3">
                {packageServices.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground text-sm">
                    <Plus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    No services added yet
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={packageServices.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {packageServices.map((service, index) => (
                        <SortableCard
                          key={service.id}
                          service={service}
                          index={index}
                          onRemove={handleRemoveService}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}

                {/* Inline Add Service Search - Mobile */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 border-b">
                    <Plus className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Add Service</span>
                  </div>
                  <Command shouldFilter={false} className="bg-transparent">
                    <div className="flex items-center px-3 py-2 bg-background">
                      <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Type to search service..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    {searchQuery && (
                      <CommandList className="max-h-[200px]">
                        {filteredServices.length === 0 ? (
                          <CommandEmpty>No services found.</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {filteredServices.slice(0, 6).map((service) => (
                              <CommandItem
                                key={service.id}
                                value={`${service.id}-${service.code}`}
                                onSelect={() => handleAddService(service)}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center justify-between w-full gap-2">
                                  <div className="min-w-0 flex-1">
                                    <span className="font-medium text-xs">{service.code}</span>
                                    <span className="mx-1">-</span>
                                    <span className="truncate text-xs">{service.name}</span>
                                  </div>
                                  <span className="text-muted-foreground text-xs whitespace-nowrap">
                                    {formatCurrency(service.price)}
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

              {/* Desktop/Tablet Table View */}
              <div className="hidden sm:block">
                <div className="overflow-x-auto max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-14 text-center font-semibold">No</TableHead>
                        <TableHead className="w-28 font-semibold">Code</TableHead>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="w-32 font-semibold">Category</TableHead>
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
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                        >
                          <SortableContext
                            items={packageServices.map((s) => s.id)}
                            strategy={verticalListSortingStrategy}
                          >
                            {packageServices.map((service, index) => (
                              <SortableRow
                                key={service.id}
                                service={service}
                                index={index}
                                onRemove={handleRemoveService}
                              />
                            ))}
                          </SortableContext>
                        </DndContext>
                      )}
                    </tbody>
                  </Table>
                </div>

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
                    {searchQuery && (
                      <CommandList className="max-h-[200px] border-b">
                        {filteredServices.length === 0 ? (
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
                                    <span className="truncate">{service.name}</span>
                                  </div>
                                  <span className="text-muted-foreground text-sm whitespace-nowrap">
                                    {formatCurrency(service.price)}
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
