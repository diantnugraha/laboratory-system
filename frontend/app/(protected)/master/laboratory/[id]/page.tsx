'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Pencil, Save, Trash2, X, Loader2 } from 'lucide-react';
import { labService, Lab } from '@/services/labService';
import { laboratorySchema, LaboratoryFormData } from '@/lib/schemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

export default function LaboratoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const laboratoryId = params.id as string;
  const [laboratory, setLaboratory] = useState<Lab | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<LaboratoryFormData>({
    resolver: zodResolver(laboratorySchema),
    defaultValues: {
      name: '',
    },
  });

  // Fetch laboratory data
  useEffect(() => {
    const fetchLaboratory = async () => {
      try {
        setLoading(true);
        const response = await labService.getById(laboratoryId);
        setLaboratory(response.data);
      } catch (error: any) {
        console.error('Error fetching laboratory:', error);
        toast.error(error.response?.data?.message || 'Failed to fetch laboratory');
      } finally {
        setLoading(false);
      }
    };

    if (laboratoryId) {
      fetchLaboratory();
    }
  }, [laboratoryId]);

  // Initialize form when entering edit mode
  useEffect(() => {
    if (isEditing && laboratory) {
      form.reset({
        name: laboratory.name,
      });
    }
  }, [isEditing, laboratory, form]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = async (data: LaboratoryFormData) => {
    try {
      await labService.update(laboratoryId, {
        name: data.name,
      });
      toast.success('Laboratory updated successfully');
      setIsEditing(false);
      // Refresh laboratory data
      const response = await labService.getById(laboratoryId);
      setLaboratory(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update laboratory');
    }
  };

  const handleDelete = async () => {
    try {
      await labService.delete(laboratoryId);
      toast.success('Laboratory deleted successfully');
      router.push('/master/laboratory');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete laboratory');
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

  if (!laboratory) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h1 className="text-2xl font-bold mb-4">Laboratory Not Found</h1>
          <p className="text-muted-foreground mb-4">The laboratory you're looking for doesn't exist.</p>
          <Button asChild>
            <a href="/master/laboratory">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Laboratories
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
              onClick={() => router.push('/master/laboratory')}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Laboratory #{laboratory.id}</h1>
              <p className="text-sm text-muted-foreground mt-1">Laboratory Details</p>
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
                  <AlertDialogTitle>Delete Laboratory</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this laboratory? This action cannot be undone.
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

        {/* Laboratory Details Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <div className="h-4 w-4 rounded bg-primary" />
              </div>
              Laboratory Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ID</Label>
                <p className="text-sm font-medium">{laboratory.id}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</Label>
                <p className="text-sm font-medium">
                  <RenderHTML html={laboratory.name} />
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
                <h1 className="text-2xl font-semibold text-foreground">Edit Laboratory</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">ID: {laboratory.id}</p>
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
            <CardTitle>Laboratory Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <FormLabel className="text-sm font-medium">ID</FormLabel>
                <Input value={laboratory.id} disabled className="bg-muted" />
              </div>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Laboratory name" {...field} />
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
