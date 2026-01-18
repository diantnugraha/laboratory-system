'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Pencil, Save, Trash2, X, Loader2, Ruler } from 'lucide-react';
import { unitService, Unit } from '@/services/unitService';
import { unitSchema, UnitFormData } from '@/lib/schemas';
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
import { RenderHTML } from '@/components/shared/RenderHTML';
import api from '@/services/api';
import { cn } from '@/lib/utils';
import { getErrorMessage } from '@/lib/utils/errorHandler';
import { OPERATION_ERROR_MESSAGES } from '@/lib/constants/errorMessages';

interface Lab {
  id: number;
  name: string;
}

export default function UnitDetailPage() {
  const params = useParams();
  const router = useRouter();
  const unitId = params.id as string;
  const [unit, setUnit] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [labSearchOpen, setLabSearchOpen] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);

  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: '',
      description: '',
      laboratoryId: '',
    },
  });

  // Fetch unit data
  useEffect(() => {
    const fetchUnit = async () => {
      try {
        setLoading(true);
        const response = await unitService.getById(unitId);
        setUnit(response.data);
        if (response.data.lab) {
          setLabs([{ id: response.data.lab.id, name: response.data.lab.name }]);
        }
      } catch (error) {
        console.error('Error fetching unit:', error);
        toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('unit')));
      } finally {
        setLoading(false);
      }
    };

    if (unitId) {
      fetchUnit();
    }
  }, [unitId]);

  // Fetch labs when search query changes
  useEffect(() => {
    const fetchLabs = async () => {
      if (labSearchQuery.length < 2) {
        if (unit?.lab) {
          setLabs([{ id: unit.lab.id, name: unit.lab.name }]);
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
  }, [labSearchQuery, unit]);

  // Initialize form when entering edit mode
  useEffect(() => {
    if (isEditing && unit) {
      form.reset({
        name: unit.name,
        description: unit.description,
        laboratoryId: unit.lab_id ? String(unit.lab_id) : '',
      });
    }
  }, [isEditing, unit, form]);

  const selectedLab = useMemo(() => {
    const labId = form.watch("laboratoryId");
    return labs.find((l) => String(l.id) === labId);
  }, [form.watch("laboratoryId"), labs]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = async (data: UnitFormData) => {
    try {
      await unitService.update(unitId, {
        name: data.name,
        description: data.description,
        lab_id: data.laboratoryId ? Number(data.laboratoryId) : null,
      });
      toast.success('Unit updated successfully');
      setIsEditing(false);
      // Refresh unit data
      const response = await unitService.getById(unitId);
      setUnit(response.data);
      if (response.data.lab) {
        setLabs([{ id: response.data.lab.id, name: response.data.lab.name }]);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.UPDATE('unit')));
    }
  };

  const handleDelete = async () => {
    try {
      await unitService.delete(unitId);
      toast.success('Unit deleted successfully');
      router.push('/master/units');
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('unit')));
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

  if (!unit) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h1 className="text-2xl font-bold mb-4">Unit Not Found</h1>
          <p className="text-muted-foreground mb-4">The unit you're looking for doesn't exist.</p>
          <Button asChild>
            <a href="/master/units">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Units
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
              onClick={() => router.push('/master/units')}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Unit #{unit.id}</h1>
              <p className="text-sm text-muted-foreground mt-1">Unit Details</p>
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
                  <AlertDialogTitle>Delete Unit</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this unit? This action cannot be undone.
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

        {/* Unit Details Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Ruler className="h-4 w-4 text-primary" />
              </div>
              Unit Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID</Label>
                <p className="text-sm font-medium">{unit.id}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={unit.name} />
                </p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={unit.description} />
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Laboratory</Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={unit.lab?.name || "N/A"} />
                </p>
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
                <h1 className="text-2xl font-semibold text-foreground">Edit Unit</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">ID: {unit.id}</p>
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
            <CardTitle>Unit Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">ID</FormLabel>
                <Input value={unit.id} disabled className="bg-muted" />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Unit name" {...field} />
                    </FormControl>
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
                      <Textarea placeholder="Unit description" {...field} />
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
                    <FormLabel className="text-sm font-medium">Laboratory (Optional)</FormLabel>
                    <Popover open={labSearchOpen} onOpenChange={setLabSearchOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? selectedLab?.name || "Select laboratory"
                              : "Select laboratory (optional)"}
                            <svg
                              className="ml-2 h-4 w-4 shrink-0 opacity-50"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="m6 9 6 6 6-6" />
                            </svg>
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <div className="flex items-center border-b px-3">
                            <svg
                              className="mr-2 h-4 w-4 shrink-0 opacity-50"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <circle cx="11" cy="11" r="8" />
                              <path d="m21 21-4.35-4.35" />
                            </svg>
                            <Input
                              placeholder="Search laboratory..."
                              value={labSearchQuery}
                              onChange={(e) => setLabSearchQuery(e.target.value)}
                              className="border-0 focus-visible:ring-0"
                            />
                          </div>
                          <CommandList>
                            {loadingLabs ? (
                              <div className="p-4 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              </div>
                            ) : (
                              <>
                                <CommandItem
                                  value=""
                                  onSelect={() => {
                                    field.onChange("");
                                    setLabSearchOpen(false);
                                  }}
                                >
                                  None (No Laboratory)
                                </CommandItem>
                                {labs.length === 0 ? (
                                  <CommandEmpty>
                                    {labSearchQuery.length < 2
                                      ? "Type at least 2 characters to search"
                                      : "No laboratory found."}
                                  </CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {labs.map((lab) => (
                                      <CommandItem
                                        key={lab.id}
                                        value={String(lab.id)}
                                        onSelect={() => {
                                          field.onChange(String(lab.id));
                                          setLabSearchOpen(false);
                                        }}
                                      >
                                        {lab.name}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
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
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
