import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Loader2, DollarSign, Bold, Italic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormDialog } from "@/components/shared/FormDialog";
import { serviceSchema, ServiceFormData } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { serviceService } from "@/services/serviceService";
import api from "@/services/api";

interface Category {
  id: number;
  name: string;
}

interface Parameter {
  id: number;
  name: string;
}

interface Method {
  id: number;
  name: string;
  code?: string;
}

interface Subcontractor {
  id: number;
  lab_name: string;
}

interface AnalystType {
  id: number;
  name: string;
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ServiceFormDialog({ open, onOpenChange, onSuccess }: ServiceFormDialogProps) {
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [parameterSearchQuery, setParameterSearchQuery] = useState("");
  const [parameterSearchOpen, setParameterSearchOpen] = useState(false);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loadingParameters, setLoadingParameters] = useState(false);

  const [methodSearchQuery, setMethodSearchQuery] = useState("");
  const [methodSearchOpen, setMethodSearchOpen] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const [subcontractorSearchQuery, setSubcontractorSearchQuery] = useState("");
  const [subcontractorSearchOpen, setSubcontractorSearchOpen] = useState(false);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loadingSubcontractors, setLoadingSubcontractors] = useState(false);

  const [analystTypeSearchQuery, setAnalystTypeSearchQuery] = useState("");
  const [analystTypeSearchOpen, setAnalystTypeSearchOpen] = useState(false);
  const [analystTypes, setAnalystTypes] = useState<AnalystType[]>([]);
  const [loadingAnalystTypes, setLoadingAnalystTypes] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [descriptionRef, setDescriptionRef] = useState<HTMLTextAreaElement | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      code: "",
      name: "",
      categoryId: "",
      parameterId: "",
      methodId: "",
      price: 0,
      user: 1,
      usePc: 0,
    },
  });

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      if (categorySearchQuery.length < 2) {
        setCategories([]);
        return;
      }

      try {
        setLoadingCategories(true);
        const response = await api.get('/categories/json', {
          params: { q: categorySearchQuery },
        });
        setCategories(response.data.items || response.data.data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
        setCategories([]);
      } finally {
        setLoadingCategories(false);
      }
    };

    const timeoutId = setTimeout(fetchCategories, 300);
    return () => clearTimeout(timeoutId);
  }, [categorySearchQuery]);

  // Fetch parameters
  useEffect(() => {
    const fetchParameters = async () => {
      if (parameterSearchQuery.length < 2) {
        setParameters([]);
        return;
      }

      try {
        setLoadingParameters(true);
        const response = await api.get('/parameters/json', {
          params: { q: parameterSearchQuery },
        });
        setParameters(response.data.items || response.data.data || []);
      } catch (error) {
        console.error('Error fetching parameters:', error);
        setParameters([]);
      } finally {
        setLoadingParameters(false);
      }
    };

    const timeoutId = setTimeout(fetchParameters, 300);
    return () => clearTimeout(timeoutId);
  }, [parameterSearchQuery]);

  // Fetch methods
  useEffect(() => {
    const fetchMethods = async () => {
      if (methodSearchQuery.length < 2) {
        setMethods([]);
        return;
      }

      try {
        setLoadingMethods(true);
        const response = await api.get('/methods/json', {
          params: { q: methodSearchQuery },
        });
        setMethods(response.data.items || response.data.data || []);
      } catch (error) {
        console.error('Error fetching methods:', error);
        setMethods([]);
      } finally {
        setLoadingMethods(false);
      }
    };

    const timeoutId = setTimeout(fetchMethods, 300);
    return () => clearTimeout(timeoutId);
  }, [methodSearchQuery]);

  // Fetch subcontractors
  useEffect(() => {
    const fetchSubcontractors = async () => {
      if (subcontractorSearchQuery.length < 2) {
        setSubcontractors([]);
        return;
      }

      try {
        setLoadingSubcontractors(true);
        const response = await api.get('/subcontractors/json', {
          params: { q: subcontractorSearchQuery },
        });
        setSubcontractors(response.data.items || response.data.data || []);
      } catch (error) {
        console.error('Error fetching subcontractors:', error);
        setSubcontractors([]);
      } finally {
        setLoadingSubcontractors(false);
      }
    };

    const timeoutId = setTimeout(fetchSubcontractors, 300);
    return () => clearTimeout(timeoutId);
  }, [subcontractorSearchQuery]);

  // Fetch analyst types
  useEffect(() => {
    const fetchAnalystTypes = async () => {
      if (analystTypeSearchQuery.length < 2) {
        setAnalystTypes([]);
        return;
      }

      try {
        setLoadingAnalystTypes(true);
        const response = await api.get('/analyst-types/json', {
          params: { q: analystTypeSearchQuery },
        });
        setAnalystTypes(response.data.items || response.data.data || []);
      } catch (error) {
        console.error('Error fetching analyst types:', error);
        setAnalystTypes([]);
      } finally {
        setLoadingAnalystTypes(false);
      }
    };

    const timeoutId = setTimeout(fetchAnalystTypes, 300);
    return () => clearTimeout(timeoutId);
  }, [analystTypeSearchQuery]);

  const selectedCategory = useMemo(() => {
    const categoryId = form.watch("categoryId");
    return categories.find((c) => String(c.id) === categoryId);
  }, [form.watch("categoryId"), categories]);

  const selectedParameter = useMemo(() => {
    const parameterId = form.watch("parameterId");
    return parameters.find((p) => String(p.id) === parameterId);
  }, [form.watch("parameterId"), parameters]);

  const selectedMethod = useMemo(() => {
    const methodId = form.watch("methodId");
    return methods.find((m) => String(m.id) === methodId);
  }, [form.watch("methodId"), methods]);

  const selectedSubcontractor = useMemo(() => {
    const subcontractorId = form.watch("subcontractorId");
    return subcontractors.find((s) => String(s.id) === subcontractorId);
  }, [form.watch("subcontractorId"), subcontractors]);

  const selectedAnalystType = useMemo(() => {
    const analystTypeId = form.watch("analystTypeId");
    return analystTypes.find((a) => String(a.id) === analystTypeId);
  }, [form.watch("analystTypeId"), analystTypes]);

  const onSubmit = async (data: ServiceFormData) => {
    try {
      setSubmitting(true);
      await serviceService.create({
        ...data,
        code: data.code || '',
        name: data.name || '',
        price: data.price || 0,
        categoryId: Number(data.categoryId),
        parameterId: Number(data.parameterId),
        methodId: Number(data.methodId),
        subcontractorId: data.subcontractorId ? Number(data.subcontractorId) : null,
        analystTypeId: data.analystTypeId ? Number(data.analystTypeId) : null,
      });
      toast.success("Service created successfully");
    form.reset();
      setCategorySearchQuery("");
      setParameterSearchQuery("");
      setMethodSearchQuery("");
      setSubcontractorSearchQuery("");
      setAnalystTypeSearchQuery("");
    onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating service:', error);
      toast.error(error.response?.data?.message || 'Failed to create service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setCategorySearchQuery("");
      setParameterSearchQuery("");
      setMethodSearchQuery("");
      setSubcontractorSearchQuery("");
      setAnalystTypeSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add New Service"
      description="Fill in the details to create a new service."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Code</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="SRV-001" 
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
              <FormItem>
                <FormLabel>Name</FormLabel>
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

          {/* Category Search Field */}
          <FormField
            control={form.control}
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedCategory
                          ? selectedCategory.name
                          : "Search category..."}
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
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <CommandList className="max-h-48">
                        {loadingCategories ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : categorySearchQuery.length < 2 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </div>
                        ) : categories.length === 0 ? (
                          <CommandEmpty>No category found</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {categories.map((category) => (
                              <CommandItem
                                key={category.id}
                                value={String(category.id)}
                                onSelect={() => {
                                  field.onChange(String(category.id));
                                  setCategorySearchOpen(false);
                                  setCategorySearchQuery("");
                                }}
                                className="cursor-pointer"
                              >
                                {category.name}
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

          {/* Parameter Search Field */}
          <FormField
            control={form.control}
            name="parameterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Parameter</FormLabel>
                <Popover open={parameterSearchOpen} onOpenChange={setParameterSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedParameter
                          ? selectedParameter.name
                          : "Search parameter..."}
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
                          value={parameterSearchQuery}
                          onChange={(e) => setParameterSearchQuery(e.target.value)}
                          className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <CommandList className="max-h-48">
                        {loadingParameters ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : parameterSearchQuery.length < 2 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </div>
                        ) : parameters.length === 0 ? (
                          <CommandEmpty>No parameter found</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {parameters.map((parameter) => (
                              <CommandItem
                                key={parameter.id}
                                value={String(parameter.id)}
                                onSelect={() => {
                                  field.onChange(String(parameter.id));
                                  setParameterSearchOpen(false);
                                  setParameterSearchQuery("");
                                }}
                                className="cursor-pointer"
                              >
                                {parameter.name}
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

          {/* Method Search Field */}
          <FormField
            control={form.control}
            name="methodId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Method</FormLabel>
                <Popover open={methodSearchOpen} onOpenChange={setMethodSearchOpen}>
                  <PopoverTrigger asChild>
                  <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedMethod
                          ? `${selectedMethod.code ? selectedMethod.code + ' - ' : ''}${selectedMethod.name}`
                          : "Search method..."}
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
                          value={methodSearchQuery}
                          onChange={(e) => setMethodSearchQuery(e.target.value)}
                          className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <CommandList className="max-h-48">
                        {loadingMethods ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : methodSearchQuery.length < 2 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </div>
                        ) : methods.length === 0 ? (
                          <CommandEmpty>No method found</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {methods.map((method) => (
                              <CommandItem
                                key={method.id}
                                value={String(method.id)}
                                onSelect={() => {
                                  field.onChange(String(method.id));
                                  setMethodSearchOpen(false);
                                  setMethodSearchQuery("");
                                }}
                                className="cursor-pointer"
                              >
                                {method.code ? `${method.code} - ${method.name}` : method.name}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (IDR)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="100000" 
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
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

          {/* Subcontractor Search Field (Optional) */}
          <FormField
            control={form.control}
            name="subcontractorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subcontractor (Optional)</FormLabel>
                <Popover open={subcontractorSearchOpen} onOpenChange={setSubcontractorSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedSubcontractor
                          ? selectedSubcontractor.lab_name
                          : "Search subcontractor..."}
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
                          value={subcontractorSearchQuery}
                          onChange={(e) => setSubcontractorSearchQuery(e.target.value)}
                          className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <CommandList className="max-h-48">
                        {subcontractorSearchQuery.length < 2 ? (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setSubcontractorSearchOpen(false);
                                setSubcontractorSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Subcontractor)
                            </CommandItem>
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Type at least 2 characters to search
                            </div>
                          </>
                        ) : loadingSubcontractors ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : subcontractors.length === 0 ? (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setSubcontractorSearchOpen(false);
                                setSubcontractorSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Subcontractor)
                            </CommandItem>
                            <CommandEmpty>No subcontractor found</CommandEmpty>
                          </>
                        ) : (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setSubcontractorSearchOpen(false);
                                setSubcontractorSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Subcontractor)
                            </CommandItem>
                            <CommandGroup>
                              {subcontractors.map((subcontractor) => (
                                <CommandItem
                                  key={subcontractor.id}
                                  value={String(subcontractor.id)}
                                  onSelect={() => {
                                    field.onChange(String(subcontractor.id));
                                    setSubcontractorSearchOpen(false);
                                    setSubcontractorSearchQuery("");
                                  }}
                                  className="cursor-pointer"
                                >
                                  {subcontractor.lab_name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Analyst Type Search Field (Optional) */}
          <FormField
            control={form.control}
            name="analystTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Analyst Type (Optional)</FormLabel>
                <Popover open={analystTypeSearchOpen} onOpenChange={setAnalystTypeSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {selectedAnalystType
                          ? selectedAnalystType.name
                          : "Search analyst type..."}
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
                          value={analystTypeSearchQuery}
                          onChange={(e) => setAnalystTypeSearchQuery(e.target.value)}
                          className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <CommandList className="max-h-48">
                        {analystTypeSearchQuery.length < 2 ? (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setAnalystTypeSearchOpen(false);
                                setAnalystTypeSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Analyst Type)
                            </CommandItem>
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Type at least 2 characters to search
                            </div>
                          </>
                        ) : loadingAnalystTypes ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : analystTypes.length === 0 ? (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setAnalystTypeSearchOpen(false);
                                setAnalystTypeSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Analyst Type)
                            </CommandItem>
                            <CommandEmpty>No analyst type found</CommandEmpty>
                          </>
                        ) : (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setAnalystTypeSearchOpen(false);
                                setAnalystTypeSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Analyst Type)
                            </CommandItem>
                            <CommandGroup>
                              {analystTypes.map((analystType) => (
                                <CommandItem
                                  key={analystType.id}
                                  value={String(analystType.id)}
                                  onSelect={() => {
                                    field.onChange(String(analystType.id));
                                    setAnalystTypeSearchOpen(false);
                                    setAnalystTypeSearchQuery("");
                                  }}
                                  className="cursor-pointer"
                                >
                                  {analystType.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accreditation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accreditation (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Accreditation" 
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
            name="accreditationValidDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Accreditation Valid Date (Optional)</FormLabel>
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
            name="unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit (Optional)</FormLabel>
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

          <FormField
            control={form.control}
            name="publishedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Published Date (Optional)</FormLabel>
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
            name="lod"
            render={({ field }) => (
              <FormItem>
                <FormLabel>LOD (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="LOD" 
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
              <FormItem>
                <FormLabel>LOQ (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="LOQ" 
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
            name="proficiencyTest"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Proficiency Test (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Proficiency test" 
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
              <FormItem>
                <FormLabel>Status (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Status" 
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
            name="description"
            render={({ field }) => {
              const insertSymbol = (symbol: string) => {
                if (descriptionRef) {
                  const start = descriptionRef.selectionStart;
                  const end = descriptionRef.selectionEnd;
                  const currentValue = field.value || "";
                  const newValue = currentValue.substring(0, start) + symbol + currentValue.substring(end);
                  field.onChange(newValue);
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
                  const currentValue = field.value || "";
                  const selectedText = currentValue.substring(start, end);
                  const newValue = currentValue.substring(0, start) + prefix + selectedText + suffix + currentValue.substring(end);
                  field.onChange(newValue);
                  setTimeout(() => {
                    descriptionRef.focus();
                    descriptionRef.setSelectionRange(start + prefix.length, end + prefix.length);
                  }, 0);
                }
              };

              return (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
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
              );
            }}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
