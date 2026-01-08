'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Pencil, Save, Trash2, X, Search, FlaskConical, Loader2 } from 'lucide-react';
import { methodService, Method } from '@/services/methodService';
import { methodSchema, MethodFormData } from '@/lib/schemas';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

interface Matrix {
  id: number;
  code: string;
  name: string;
  category?: string;
}

export default function MethodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const methodId = params.id as string;
  const [method, setMethod] = useState<Method | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [matrixSearchQuery, setMatrixSearchQuery] = useState('');
  const [matrixSearchOpen, setMatrixSearchOpen] = useState(false);
  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [loadingMatrices, setLoadingMatrices] = useState(false);

  const form = useForm<MethodFormData>({
    resolver: zodResolver(methodSchema),
    defaultValues: {
      name: '',
      category: 'In House',
      matrixId: '',
      description: '',
    },
  });

  // Fetch method data
  useEffect(() => {
    const fetchMethod = async () => {
      try {
        setLoading(true);
        const response = await methodService.getById(methodId);
        setMethod(response.data);
      } catch (error: any) {
        console.error('Error fetching method:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch method');
      } finally {
        setLoading(false);
      }
    };

    if (methodId) {
      fetchMethod();
    }
  }, [methodId]);

  // Fetch matrices for search
  useEffect(() => {
    const fetchMatrices = async () => {
      try {
        setLoadingMatrices(true);
        const response = await api.get('/matrices', {
          params: { status: 'Active', limit: 1000 },
        });
        setMatrices(response.data.data || []);
      } catch (error: any) {
        console.error('Error fetching matrices:', error);
      } finally {
        setLoadingMatrices(false);
      }
    };

    if (isEditing) {
      fetchMatrices();
    }
  }, [isEditing]);

  // Active matrices for dropdown
  const activeMatrices = useMemo(() => {
    return matrices.filter((m) => m);
  }, [matrices]);

  // Matrix search filter
  const filteredMatrices = useMemo(() => {
    if (matrixSearchQuery.length < 2) return [];
    const query = matrixSearchQuery.toLowerCase();
    return activeMatrices.filter(
      (m) =>
        (m.code || '').toLowerCase().includes(query) ||
        (m.name || '').toLowerCase().includes(query)
    );
  }, [matrixSearchQuery, activeMatrices]);

  const selectedMatrix = useMemo(() => {
    const matrixId = form.watch('matrixId');
    return matrices.find((m) => String(m.id) === String(matrixId));
  }, [form.watch('matrixId'), matrices]);

  // Initialize form when entering edit mode
  useEffect(() => {
    if (isEditing && method) {
      form.reset({
        name: method.name,
        category: (method.category_name as 'In House' | 'Official') || 'In House',
        matrixId: method.matrix_id ? String(method.matrix_id) : '',
        description: method.description || '',
        instruction: method.instruction || '',
      });
    }
  }, [isEditing, method, form]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    setMatrixSearchQuery('');
    form.reset();
  };

  const onSubmit = async (data: MethodFormData) => {
    try {
      const updateData: Partial<MethodFormData> = {
        name: data.name,
        category: data.category,
        matrixId: data.matrixId,
        status: 'Active' as const,
        description: data.description || undefined,
        instruction: data.instruction || undefined,
      };
      
      await methodService.update(methodId, updateData);
      toast.success('Method updated successfully');
      setIsEditing(false);
      setMatrixSearchQuery('');
      // Refresh method data
      const response = await methodService.getById(methodId);
      setMethod(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update method');
    }
  };

  const handleDelete = async () => {
    try {
      await methodService.delete(methodId);
      toast.success('Method deleted successfully');
      router.push('/master/method');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete method');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!method) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h1 className="text-2xl font-bold mb-4">Method Not Found</h1>
          <p className="text-muted-foreground mb-4">The method you're looking for doesn't exist.</p>
          <Button asChild>
            <a href="/master/method">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Methods
            </a>
          </Button>
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
              onClick={() => router.push('/master/method')}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{method.code}</h1>
              <p className="text-sm text-muted-foreground mt-1">Method Details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-4 w-4" />
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
                  <AlertDialogTitle>Delete Method</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this method? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Method Details Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              Method Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Row 1: Code, Name Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</Label>
                <p className="text-sm font-medium">{method.code}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name Method</Label>
                <p className="text-sm font-medium">{method.name}</p>
              </div>
            </div>

            {/* Row 2: Category, Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Category</Label>
                <p className="text-sm font-medium">{method.category_name || '-'}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Matrix</Label>
                <p className="text-sm font-medium">
                  {method.matrix ? `${method.matrix.name}` : '-'}
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</Label>
              <p className="text-sm font-medium">{method.description || '-'}</p>
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
                <h1 className="text-2xl font-semibold text-foreground">Edit Method</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Code: {method.code}</p>
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
            <CardTitle>Method Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">Code</FormLabel>
                <Input value={method.code} disabled className="bg-muted" />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Name Method</FormLabel>
                    <FormControl>
                      <Input placeholder="Method name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "In House"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="In House">In House</SelectItem>
                        <SelectItem value="Official">Official</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Matrix Search Field */}
              <FormField
                control={form.control}
                name="matrixId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Matrix</FormLabel>
                    <Popover open={matrixSearchOpen} onOpenChange={setMatrixSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              'w-full justify-between font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {selectedMatrix
                              ? `${selectedMatrix.code || ''} - ${selectedMatrix.name}`
                              : 'Search matrix...'}
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
                              value={matrixSearchQuery}
                              onChange={(e) => setMatrixSearchQuery(e.target.value)}
                              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                          <CommandList className="max-h-48">
                            {loadingMatrices ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Loading matrices...
                              </div>
                            ) : matrixSearchQuery.length < 2 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
                              </div>
                            ) : filteredMatrices.length === 0 ? (
                              <CommandEmpty>No matrix found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {filteredMatrices.map((matrix) => (
                                  <CommandItem
                                    key={matrix.id}
                                    value={String(matrix.id)}
                                    onSelect={() => {
                                      field.onChange(String(matrix.id));
                                      setMatrixSearchOpen(false);
                                      setMatrixSearchQuery('');
                                    }}
                                    className="cursor-pointer"
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {matrix.code || ''} - {matrix.name}
                                      </span>
                                      {matrix.category && (
                                        <span className="text-xs text-muted-foreground">{matrix.category}</span>
                                      )}
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
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2">
                    <FormLabel className="text-sm font-medium">Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Method description"
                        className="h-24 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="instruction"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2">
                    <FormLabel className="text-sm font-medium">Instruction</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Method instruction"
                        className="h-24 resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
