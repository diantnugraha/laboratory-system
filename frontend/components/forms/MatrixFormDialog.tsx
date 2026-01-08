import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormDialog } from "@/components/shared/FormDialog";
import { matrixSchema, MatrixFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { matrixService } from "@/services/matrixService";

interface MatrixFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MatrixFormDialog({ open, onOpenChange, onSuccess }: MatrixFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<MatrixFormData>({
    resolver: zodResolver(matrixSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: MatrixFormData) => {
    try {
      setSubmitting(true);
      await matrixService.create({
        name: data.name,
      });
      toast.success("Matrix created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating matrix:', error);
      toast.error(error.response?.data?.message || 'Failed to create matrix');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add New Matrix"
      description="Fill in the details to create a new matrix."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Matrix name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
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
              {submitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
