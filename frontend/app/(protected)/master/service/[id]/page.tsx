'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Edit, Save, Trash2, X, Search, Beaker, DollarSign, Loader2, Bold, Italic, Calendar } from 'lucide-react';
import { serviceService, Service } from '@/services/serviceService';
import { serviceSchema, ServiceFormData } from '@/lib/schemas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { RenderHTML } from '@/components/shared/RenderHTML';

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

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params.id as string;
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Search states
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categorySearchOpen, setCategorySearchOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [parameterSearchQuery, setParameterSearchQuery] = useState('');
  const [parameterSearchOpen, setParameterSearchOpen] = useState(false);
  const [parameters, setParameters] = useState<Parameter[]>([]);
  const [loadingParameters, setLoadingParameters] = useState(false);

  const [methodSearchQuery, setMethodSearchQuery] = useState('');
  const [methodSearchOpen, setMethodSearchOpen] = useState(false);
  const [methods, setMethods] = useState<Method[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  const [subcontractorSearchQuery, setSubcontractorSearchQuery] = useState('');
  const [subcontractorSearchOpen, setSubcontractorSearchOpen] = useState(false);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loadingSubcontractors, setLoadingSubcontractors] = useState(false);

  const [analystTypeSearchQuery, setAnalystTypeSearchQuery] = useState('');
  const [analystTypeSearchOpen, setAnalystTypeSearchOpen] = useState(false);
  const [analystTypes, setAnalystTypes] = useState<AnalystType[]>([]);
  const [loadingAnalystTypes, setLoadingAnalystTypes] = useState(false);

  const [descriptionRef, setDescriptionRef] = useState<HTMLTextAreaElement | null>(null);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      code: '',
      name: '',
      categoryId: '',
      parameterId: '',
      methodId: '',
      subcontractorId: '',
      analystTypeId: '',
      accreditation: '',
      accreditationValidDate: '',
      unit: '',
      publishedDate: '',
      lod: '',
      loq: '',
      proficiencyTest: '',
      description: '',
      price: 0,
      user: 1,
      usePc: 0,
      status: '',
    },
  });

  // Fetch service data
  useEffect(() => {
    const fetchService = async () => {
      try {
        setLoading(true);
        const response = await serviceService.getById(serviceId);
        setService(response.data);
      } catch (error: any) {
        console.error('Error fetching service:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch service');
      } finally {
        setLoading(false);
      }
    };

    if (serviceId) {
      fetchService();
    }
  }, [serviceId]);

  // Fetch search data when editing
  useEffect(() => {
    if (!isEditing) return;

    // Fetch categories
    const fetchCategories = async () => {
      if (categorySearchQuery.length < 2) {
        // Preserve pre-populated data if dropdown is not open
        if (categories.length > 0 && !categorySearchOpen) {
          return;
        }
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

    // Fetch parameters
    const fetchParameters = async () => {
      if (parameterSearchQuery.length < 2) {
        // Preserve pre-populated data if dropdown is not open
        if (parameters.length > 0 && !parameterSearchOpen) {
          return;
        }
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

    // Fetch methods
    const fetchMethods = async () => {
      if (methodSearchQuery.length < 2) {
        // Preserve pre-populated data if dropdown is not open
        if (methods.length > 0 && !methodSearchOpen) {
          return;
        }
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

    // Fetch subcontractors
    const fetchSubcontractors = async () => {
      if (subcontractorSearchQuery.length < 2) {
        // Preserve pre-populated data if dropdown is not open
        if (subcontractors.length > 0 && !subcontractorSearchOpen) {
          return;
        }
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

    // Fetch analyst types
    const fetchAnalystTypes = async () => {
      if (analystTypeSearchQuery.length < 2) {
        // Preserve pre-populated data if dropdown is not open
        if (analystTypes.length > 0 && !analystTypeSearchOpen) {
          return;
        }
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

    const timeoutCategory = setTimeout(fetchCategories, 300);
    const timeoutParameter = setTimeout(fetchParameters, 300);
    const timeoutMethod = setTimeout(fetchMethods, 300);
    const timeoutSubcontractor = setTimeout(fetchSubcontractors, 300);
    const timeoutAnalystType = setTimeout(fetchAnalystTypes, 300);

    return () => {
      clearTimeout(timeoutCategory);
      clearTimeout(timeoutParameter);
      clearTimeout(timeoutMethod);
      clearTimeout(timeoutSubcontractor);
      clearTimeout(timeoutAnalystType);
    };
  }, [
    categorySearchQuery,
    parameterSearchQuery,
    methodSearchQuery,
    subcontractorSearchQuery,
    analystTypeSearchQuery,
  ]);

  const selectedCategory = useMemo(() => {
    const categoryId = form.watch('categoryId');
    return categories.find((c) => String(c.id) === categoryId);
  }, [form.watch('categoryId'), categories]);

  const selectedParameter = useMemo(() => {
    const parameterId = form.watch('parameterId');
    return parameters.find((p) => String(p.id) === parameterId);
  }, [form.watch('parameterId'), parameters]);

  const selectedMethod = useMemo(() => {
    const methodId = form.watch('methodId');
    return methods.find((m) => String(m.id) === methodId);
  }, [form.watch('methodId'), methods]);

  const selectedSubcontractor = useMemo(() => {
    const subcontractorId = form.watch('subcontractorId');
    return subcontractors.find((s) => String(s.id) === subcontractorId);
  }, [form.watch('subcontractorId'), subcontractors]);

  const selectedAnalystType = useMemo(() => {
    const analystTypeId = form.watch('analystTypeId');
    return analystTypes.find((a) => String(a.id) === analystTypeId);
  }, [form.watch('analystTypeId'), analystTypes]);

  // Pre-populate arrays and initialize form when entering edit mode
  useEffect(() => {
    if (isEditing && service) {
      // Step 1: Pre-populate arrays with selected items first
      // Pre-populate category if exists
      if (service.category) {
        setCategories([{
          id: service.category.id,
          name: service.category.name,
        }]);
      }

      // Pre-populate parameter if exists
      if (service.parameter) {
        setParameters([{
          id: service.parameter.id,
          name: service.parameter.name,
        }]);
      }

      // Pre-populate method if exists (handle undefined code)
      if (service.method) {
        setMethods([{
          id: service.method.id,
          name: service.method.name,
        }]);
      }

      // Pre-populate subcontractor if exists
      if (service.subcontractor) {
        setSubcontractors([{
          id: service.subcontractor.id,
          lab_name: service.subcontractor.lab_name,
        }]);
      }

      // Pre-populate analyst type if exists
      if (service.analystType) {
        setAnalystTypes([{
          id: service.analystType.id,
          name: service.analystType.name,
        }]);
      }

      // Step 2: Reset form with service data after arrays are populated
      form.reset({
        code: service.code || '',
        name: service.name || '',
        categoryId: service.category_id ? String(service.category_id) : '',
        parameterId: service.parameter_id ? String(service.parameter_id) : '',
        methodId: service.method_id ? String(service.method_id) : '',
        subcontractorId: service.subcontractor_id ? String(service.subcontractor_id) : '',
        analystTypeId: service.analyst_type_id ? String(service.analyst_type_id) : '',
        accreditation: service.accreditation || '',
        accreditationValidDate: service.accreditation_valid_date || '',
        unit: service.unit || '',
        publishedDate: service.published_date ? new Date(service.published_date).toISOString().split('T')[0] : '',
        lod: service.lod || '',
        loq: service.loq || '',
        proficiencyTest: service.proficiency_test || '',
        description: service.description || '',
        price: service.price || 0,
        user: service.user || 1,
        usePc: service.use_pc || 0,
        status: service.status || '',
      });
    }
  }, [isEditing, service, form]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
    // Clear search arrays to reset state
    setCategories([]);
    setParameters([]);
    setMethods([]);
    setSubcontractors([]);
    setAnalystTypes([]);
    // Clear search queries
    setCategorySearchQuery('');
    setParameterSearchQuery('');
    setMethodSearchQuery('');
    setSubcontractorSearchQuery('');
    setAnalystTypeSearchQuery('');
  };

  const onSubmit = async (data: ServiceFormData) => {
    try {
      await serviceService.update(serviceId, {
        ...data,
        categoryId: Number(data.categoryId),
        parameterId: Number(data.parameterId),
        methodId: Number(data.methodId),
        subcontractorId: data.subcontractorId ? Number(data.subcontractorId) : null,
        analystTypeId: data.analystTypeId ? Number(data.analystTypeId) : null,
      });
      toast.success('Service updated successfully');
      setIsEditing(false);
      // Refresh service data
      const response = await serviceService.getById(serviceId);
      setService(response.data);
    } catch (error: any) {
      console.error('Error updating service:', error);
      toast.error(error.response?.data?.message || 'Failed to update service');
    }
  };

  const handleDelete = async () => {
    try {
      await serviceService.delete(serviceId);
      toast.success('Service deleted successfully');
      router.push('/master/service');
    } catch (error: any) {
      console.error('Error deleting service:', error);
      toast.error(error.response?.data?.message || 'Failed to delete service');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatPrice = (value: number) => {
    return value.toLocaleString("id-ID");
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Service not found</p>
        </div>
      </div>
    );
  }

  // View Mode
  if (!isEditing) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push('/master/service')}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                <RenderHTML html={service.name} />
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Code: <RenderHTML html={service.code} />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the service.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Code
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.code} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name Service
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.name} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </Label>
                <Badge variant={service.status === "Active" ? "default" : "secondary"}>
                  <RenderHTML html={service.status || "N/A"} />
                </Badge>
              </div>
            </div>

            {/* Row 2: Category Service, Parameter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Categories Service
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.category?.name || "-"} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Parameter
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.parameter?.name || "-"} />
                </p>
              </div>
            </div>

            {/* Row 3: Method, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Method
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.method?.name || "-"} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Unit
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.unit || "-"} />
                </p>
              </div>
            </div>

            {/* Row 3.5: Subcontractor & Analyst Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Subcontractor
                </Label>
                <p className="text-sm font-medium">
                  {service.subcontractor?.lab_name || "-"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Analyst Type
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.analystType?.name || "-"} />
                </p>
              </div>
            </div>

            {/* Row 4: Accreditation, Laboratory User */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Accreditation
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.accreditation || "Non Accredited"} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Laboratory User
                </Label>
                <p className="text-sm font-medium">
                  {service.user === 1 ? "CTS Laboratory" : service.user === 2 ? "NCTS Laboratory" : service.user === 3 ? "Both" : "-"}
                </p>
              </div>
            </div>

            {/* Row 5: Accreditation Valid Date, Published Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Accreditation Valid Date
                </Label>
                <p className="text-sm font-medium">{service.accreditation_valid_date || "-"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Published Date
                </Label>
                <p className="text-sm font-medium">
                  {service.published_date ? new Date(service.published_date).toLocaleDateString() : "-"}
                </p>
              </div>
            </div>

            {/* Row 6: LOD, LOQ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  LOD (Limit of Detection)
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.lod || "-"} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  LOQ (Limit of Quantitation)
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.loq || "-"} />
                </p>
              </div>
            </div>

            {/* Row 7: Proficiency Test, Use Priority Charge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Proficiency Test
                </Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={service.proficiency_test || "-"} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Use Priority Charge
                </Label>
                <p className="text-sm font-medium">
                  {service.use_pc === 1 ? "Yes" : "No"}
                </p>
              </div>
            </div>

            {/* Row 8: Price */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Price (IDR)
                </Label>
                <p className="text-sm font-medium">{formatPrice(service.price)}</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 inline-flex items-center gap-4 self-end">
                <div className="p-2 rounded-md bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Price</p>
                  <p className="text-xl font-bold text-primary">{formatCurrency(service.price)}</p>
                </div>
              </div>
            </div>
            {/* Row 9: Description */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Description
              </Label>
              <p className="text-sm font-medium">
                <RenderHTML html={service.description || "-"} />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit Mode
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancelEdit}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">Edit Service</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Code: {service.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Edit Form Card */}
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
                        {...field}
                        value={service.code}
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
            </div>

            {/* Row 2: Category Service, Parameter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Category Search Field */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Categories Service
                    </FormLabel>
                    <Popover open={categorySearchOpen} onOpenChange={setCategorySearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedCategory
                              ? selectedCategory.name
                              : 'Search category...'}
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
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Parameter
                    </FormLabel>
                    <Popover open={parameterSearchOpen} onOpenChange={setParameterSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedParameter
                              ? selectedParameter.name
                              : 'Search parameter...'}
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
            </div>

            {/* Row 3: Method, Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Method Search Field */}
              <FormField
                control={form.control}
                name="methodId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Method
                    </FormLabel>
                    <Popover open={methodSearchOpen} onOpenChange={setMethodSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedMethod
                              ? `${selectedMethod.code || ''} - ${selectedMethod.name}`
                              : 'Search method...'}
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
                name="user"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Laboratory User
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={String(field.value)}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted">
                          <SelectValue placeholder="Select laboratory user" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">CTS Laboratory</SelectItem>
                        <SelectItem value="2">NCTS Laboratory</SelectItem>
                        <SelectItem value="3">Both</SelectItem>
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
                name="publishedDate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Published Date
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
              {/* Analyst Type Search Field */}
              <FormField
                control={form.control}
                name="analystTypeId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Analyst Type
                    </FormLabel>
                    <Popover open={analystTypeSearchOpen} onOpenChange={setAnalystTypeSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedAnalystType
                              ? selectedAnalystType.name
                              : 'Search analyst type...'}
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
            </div>

            {/* Row 8: Subcontractor, Use Priority Charge */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Subcontractor Search Field */}
              <FormField
                control={form.control}
                name="subcontractorId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Subcontractor (Optional)
                    </FormLabel>
                    <Popover open={subcontractorSearchOpen} onOpenChange={setSubcontractorSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedSubcontractor
                              ? selectedSubcontractor.lab_name
                              : 'Search subcontractor...'}
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
              {/* Use Priority Charge Field */}
              <FormField
                control={form.control}
                name="usePc"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Use Priority Charge
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                        className="flex gap-4 h-10 items-center"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="0" id="pc-no" />
                          <Label htmlFor="pc-no" className="cursor-pointer font-normal">No</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1" id="pc-yes" />
                          <Label htmlFor="pc-yes" className="cursor-pointer font-normal">Yes</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 9: Price */}
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

            {/* Row 9: Description with rich text buttons */}
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
                          value={field.value || ""}
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
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
