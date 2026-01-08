'use client';

import { useState, useMemo } from "react";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
  ArrowLeft,
  Save,
  X,
  Search,
  Beaker,
  DollarSign,
  Calendar,
  Bold,
  Italic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  categoryServices,
  parameters,
  methods,
  CategoryService,
  Parameter,
  Method,
} from "@/data/masterData";

// Extended service schema for the new page
const serviceNewSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  categoryServiceId: z.string().min(1, "Category Service is required"),
  parameterId: z.string().min(1, "Parameter is required"),
  methodId: z.string().min(1, "Method is required"),
  unit: z.string().max(255).optional(),
  accreditation: z.enum(["Non Accredited", "Accredited"]),
  laboratoryUser: z.enum(["CTS Laboratory", "NCTS Laboratory"]),
  accreditationValidDate: z.date().optional(),
  publishedDate: z.date().optional(),
  lod: z.string().optional(),
  loq: z.string().optional(),
  proficiencyTest: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be positive"),
  status: z.enum(["Active", "Inactive"]),
  analystTypeId: z.string().optional(),
  description: z.string().optional(),
});

type ServiceNewFormData = z.infer<typeof serviceNewSchema>;

// Mock Analyst Types
const analystTypes = [
  { id: "at-1", name: "Senior Analyst" },
  { id: "at-2", name: "Junior Analyst" },
  { id: "at-3", name: "Lab Technician" },
  { id: "at-4", name: "Quality Control" },
  { id: "at-5", name: "Research Analyst" },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

interface SearchableSelectProps<T extends { id: string; name: string; code?: string }> {
  items: T[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  displayValue?: (item: T) => string;
}

function SearchableSelect<T extends { id: string; name: string; code?: string }>({
  items,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  displayValue,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return []; // Minimum 2 characters
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        (item as any).status !== "Inactive" &&
        (item.name.toLowerCase().includes(query) ||
          (item.code && item.code.toLowerCase().includes(query)))
    );
  }, [items, searchQuery]);

  const selectedItem = items.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal"
        >
          {selectedItem
            ? displayValue
              ? displayValue(selectedItem)
              : selectedItem.code
              ? `${selectedItem.code} - ${selectedItem.name}`
              : selectedItem.name
            : placeholder}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {searchQuery.length > 0 && searchQuery.length < 2 && (
              <div className="py-3 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}
            {searchQuery.length >= 2 && filteredItems.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            <CommandGroup>
              {filteredItems.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    onValueChange(item.id);
                    setOpen(false);
                    setSearchQuery("");
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {item.code ? `${item.code} - ${item.name}` : item.name}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ServiceNewPage() {
  const router = useRouter();
  const [descriptionRef, setDescriptionRef] = useState<HTMLTextAreaElement | null>(null);

  const form = useForm<ServiceNewFormData>({
    resolver: zodResolver(serviceNewSchema),
    defaultValues: {
      code: "",
      name: "",
      categoryServiceId: "",
      parameterId: "",
      methodId: "",
      unit: "",
      accreditation: "Non Accredited",
      laboratoryUser: "CTS Laboratory",
      lod: "",
      loq: "",
      proficiencyTest: "",
      price: 0,
      status: "Active",
      analystTypeId: "",
      description: "",
    },
  });

  const insertSymbol = (symbol: string) => {
    if (descriptionRef) {
      const start = descriptionRef.selectionStart;
      const end = descriptionRef.selectionEnd;
      const currentValue = form.getValues("description") || "";
      const newValue = currentValue.substring(0, start) + symbol + currentValue.substring(end);
      form.setValue("description", newValue);
      setTimeout(() => {
        descriptionRef.focus();
        descriptionRef.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 0);
    }
  };

  const wrapText = (prefix: string, suffix: string) => {
    if (descriptionRef) {
      const start = descriptionRef.selectionStart;
      const end = descriptionRef.selectionEnd;
      const currentValue = form.getValues("description") || "";
      const selectedText = currentValue.substring(start, end);
      const newValue = currentValue.substring(0, start) + prefix + selectedText + suffix + currentValue.substring(end);
      form.setValue("description", newValue);
      setTimeout(() => {
        descriptionRef.focus();
        descriptionRef.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    }
  };

  const onSubmit = (data: ServiceNewFormData) => {
    console.log("Form data:", data);
    toast.success("Service created successfully");
    router.push("/master/service");
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
                onClick={() => router.push("/master/service")}
                className="h-9 w-9 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Add New Service</h1>
                <p className="text-sm text-muted-foreground mt-1">Create a new service entry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/master/service")}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Service
              </Button>
            </div>
          </div>

          {/* Service Information Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Beaker className="h-4 w-4 text-primary" />
                </div>
                Service Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Row 1: Code, Name, Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Code
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="SVC-001"
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
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Name Service
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Service name"
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
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Status
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || "Active"}>
                        <FormControl>
                          <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Active">Active</SelectItem>
                          <SelectItem value="Inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 2: Category Service, Parameter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="categoryServiceId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Categories Service
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={categoryServices}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select category service..."
                          searchPlaceholder="Search category service..."
                          emptyMessage="No category service found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="parameterId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Parameter
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={parameters}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select parameter..."
                          searchPlaceholder="Search parameter..."
                          emptyMessage="No parameter found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 3: Method, Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="methodId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Method
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={methods}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder="Select method..."
                          searchPlaceholder="Search method..."
                          emptyMessage="No method found."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Unit
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Unit"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 4: Accreditation, Laboratory User */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="accreditation"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Accreditation
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted">
                            <SelectValue placeholder="Select accreditation" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Non Accredited">Non Accredited</SelectItem>
                          <SelectItem value="Accredited">Accredited</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="laboratoryUser"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Laboratory User
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted">
                            <SelectValue placeholder="Select laboratory user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="CTS Laboratory">CTS Laboratory</SelectItem>
                          <SelectItem value="NCTS Laboratory">NCTS Laboratory</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 5: Accreditation Valid Date, Published Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="accreditationValidDate"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Accreditation Valid Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-10 pl-3 text-left font-normal bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="publishedDate"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Published Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-10 pl-3 text-left font-normal bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : "Pick a date"}
                              <Calendar className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 6: LOD, LOQ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="lod"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        LOD (Limit of Detection)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter LOD value"
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
                  name="loq"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        LOQ (Limit of Quantitation)
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter LOQ value"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 7: Proficiency Test, Analyst Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="proficiencyTest"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Proficiency Test
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter proficiency test"
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
                  name="analystTypeId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Analyst Type
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          items={analystTypes}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder="Select analyst type..."
                          searchPlaceholder="Search analyst type..."
                          emptyMessage="No analyst type found."
                          displayValue={(item) => item.name}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Row 8: Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Price (IDR)
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100000"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 inline-flex items-center gap-4 self-end">
                  <div className="p-2 rounded-md bg-primary/10">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Price</p>
                    <p className="text-xl font-bold text-primary">{formatCurrency(form.watch("price") || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Row 9: Description with rich text buttons */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Description
                    </FormLabel>
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1 p-2 border rounded-t-md bg-muted/30 border-b-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => wrapText("**", "**")}
                          title="Bold"
                        >
                          <Bold className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => wrapText("*", "*")}
                          title="Italic"
                        >
                          <Italic className="h-4 w-4" />
                        </Button>
                        <div className="w-px bg-border mx-1" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("²")}
                          title="Superscript 2"
                        >
                          x²
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("³")}
                          title="Superscript 3"
                        >
                          x³
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("µ")}
                          title="Micro"
                        >
                          µ
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("Σ")}
                          title="Sigma"
                        >
                          Σ
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("±")}
                          title="Plus-Minus"
                        >
                          ±
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("°")}
                          title="Degree"
                        >
                          °
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("≤")}
                          title="Less than or equal"
                        >
                          ≤
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 font-mono"
                          onClick={() => insertSymbol("≥")}
                          title="Greater than or equal"
                        >
                          ≥
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Enter description with formatting..."
                          {...field}
                          ref={(el) => {
                            setDescriptionRef(el);
                          }}
                          className="min-h-[120px] bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted rounded-t-none"
                        />
                      </FormControl>
                    </div>
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
