'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Edit, Save, Trash2, X, FlaskConical, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { parameterSchema, ParameterFormData } from '@/lib/schemas';
import { toast } from 'sonner';
import { parameterService, Parameter } from '@/services/parameterService';
import api from '@/services/api';
import { cn } from '@/lib/utils';

interface Lab {
  id: number;
  name: string;
}

export default function ParameterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const parameterId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [parameter, setParameter] = useState<Parameter | null>(null);
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [labSearchOpen, setLabSearchOpen] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);

  const form = useForm<ParameterFormData>({
    resolver: zodResolver(parameterSchema),
    defaultValues: {
      name: '',
      laboratoryId: '',
    },
  });

  // Fetch parameter data
  useEffect(() => {
    const fetchParameter = async () => {
      try {
        setFetching(true);
        const response = await parameterService.getById(parameterId);
        setParameter(response.data);
        if (response.data.lab) {
          setLabs([{ id: response.data.lab.id, name: response.data.lab.name }]);
        }
      } catch (error: any) {
        console.error('Error fetching parameter:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch parameter');
        if (error.response?.status === 404) {
          router.push('/master/parameter');
        }
      } finally {
        setFetching(false);
      }
    };

    if (parameterId) {
      fetchParameter();
    }
  }, [parameterId, router]);

  // Fetch labs when search query changes
  useEffect(() => {
    const fetchLabs = async () => {
      if (labSearchQuery.length < 2) {
        if (parameter?.lab) {
          setLabs([{ id: parameter.lab.id, name: parameter.lab.name }]);
        } else {
          setLabs([]);
        }
        return;
      }

      try {
        setLoadingLabs(true);
        const response = await api.get('/labs/json', {
          params: { q: labSearchQuery },
        });
        setLabs(response.data.items || []);
      } catch (error) {
        console.error('Error fetching labs:', error);
        setLabs([]);
      } finally {
        setLoadingLabs(false);
      }
    };

    const timeoutId = setTimeout(fetchLabs, 300);
    return () => clearTimeout(timeoutId);
  }, [labSearchQuery, parameter]);

  useEffect(() => {
    if (isEditing && parameter) {
      form.reset({
        name: parameter.name,
        laboratoryId: String(parameter.lab_id),
      });
    }
  }, [isEditing, parameter, form]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = async (data: ParameterFormData) => {
    try {
      setLoading(true);
      await parameterService.update(parameterId, {
        name: data.name,
        lab_id: Number(data.laboratoryId),
      });
      toast.success('Parameter updated successfully');
      setIsEditing(false);
      // Refresh parameter data
      const response = await parameterService.getById(parameterId);
      setParameter(response.data);
      if (response.data.lab) {
        setLabs([{ id: response.data.lab.id, name: response.data.lab.name }]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update parameter');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await parameterService.delete(parameterId);
      toast.success('Parameter deleted successfully');
      router.push('/master/parameter');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete parameter');
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!parameter) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Parameter not found</p>
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
              onClick={() => router.push('/master/parameter')}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                {parameter.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Parameter Details
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
                  <AlertDialogTitle>Delete Parameter</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this parameter? This action
                    cannot be undone.
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

        {/* Parameter Information Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              Parameter Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name Parameter
                </Label>
                <p className="text-sm font-medium">{parameter.name}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Laboratory
                </Label>
                <p className="text-sm font-medium">{parameter.lab?.name || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit Mode
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
              onClick={handleCancelEdit}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Edit Parameter
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                ID: {parameter.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              className="gap-2"
              disabled={loading}
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={loading}>
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
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              Parameter Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      Name Parameter
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Parameter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="laboratoryId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">
                      Laboratory
                    </FormLabel>
                    <Popover open={labSearchOpen} onOpenChange={setLabSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? labs.find((lab) => String(lab.id) === field.value)?.name || "Search laboratory..."
                              : "Search laboratory..."}
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
                              value={labSearchQuery}
                              onChange={(e) => setLabSearchQuery(e.target.value)}
                              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                          <CommandList className="max-h-48">
                            {loadingLabs ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              </div>
                            ) : labSearchQuery.length < 2 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
                              </div>
                            ) : labs.length === 0 ? (
                              <CommandEmpty>No laboratory found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {labs.map((lab) => (
                                  <CommandItem
                                    key={lab.id}
                                    value={String(lab.id)}
                                    onSelect={() => {
                                      field.onChange(String(lab.id));
                                      setLabSearchOpen(false);
                                      setLabSearchQuery("");
                                    }}
                                    className="cursor-pointer"
                                  >
                                    {lab.name}
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
      </form>
    </Form>
  );
}
