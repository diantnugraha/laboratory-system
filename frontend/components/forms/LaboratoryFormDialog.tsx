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
import { laboratorySchema, LaboratoryFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { labService } from "@/services/labService";
import { Loader2 } from "lucide-react";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { SUCCESS_MESSAGES, OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

interface LaboratoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function LaboratoryFormDialog({ open, onOpenChange, onSuccess }: LaboratoryFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LaboratoryFormData>({
    resolver: zodResolver(laboratorySchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = async (data: LaboratoryFormData) => {
    try {
      setSubmitting(true);
      await labService.create({
        name: data.name,
      });
      toast.success(SUCCESS_MESSAGES.CREATED('Laboratorium'));
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('laboratorium')));
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
      title="Add New Laboratory"
      description="Fill in the details to create a new laboratory."
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
                  <Input placeholder="Laboratory name" {...field} />
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
