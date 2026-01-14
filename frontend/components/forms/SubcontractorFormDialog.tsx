import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
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
import { subcontractorSchema, SubcontractorFormData } from "@/lib/schemas";
import { subcontractorService, Subcontractor } from "@/services/subcontractorService";
import { toast } from "sonner";

interface SubcontractorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editData?: Subcontractor | null;
  onSuccess?: () => void;
}

export function SubcontractorFormDialog({
  open,
  onOpenChange,
  editData,
  onSuccess,
}: SubcontractorFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = !!editData;

  const form = useForm<SubcontractorFormData>({
    resolver: zodResolver(subcontractorSchema),
    defaultValues: {
      lab_name: "",
      address_name: "",
      phone: "",
      fax: "",
      contact: "",
      email: "",
    },
  });

  // Reset form when dialog opens/closes or editData changes
  useEffect(() => {
    if (open) {
      if (editData) {
        form.reset({
          lab_name: editData.lab_name,
          address_name: editData.address_name,
          phone: editData.phone,
          fax: editData.fax,
          contact: editData.contact,
          email: editData.email,
        });
      } else {
        form.reset({
          lab_name: "",
          address_name: "",
          phone: "",
          fax: "",
          contact: "",
          email: "",
        });
      }
    }
  }, [open, editData, form]);

  const onSubmit = async (data: SubcontractorFormData) => {
    try {
      setIsSubmitting(true);

      if (isEdit && editData) {
        await subcontractorService.update(editData.id, data);
        toast.success("Subcontractor updated successfully");
      } else {
        await subcontractorService.create(data);
        toast.success("Subcontractor created successfully");
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error("Subcontractor form error:", error);
      toast.error(error.response?.data?.message || `Failed to ${isEdit ? 'update' : 'create'} subcontractor`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit Subcontractor" : "Add New Subcontractor"}
      description={isEdit ? "Update the subcontractor details." : "Fill in the details to create a new subcontractor."}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="lab_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lab Name</FormLabel>
                <FormControl>
                  <Input placeholder="Laboratory name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="address_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input placeholder="Address" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="Phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fax"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fax</FormLabel>
                  <FormControl>
                    <Input placeholder="Fax number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="contact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Person</FormLabel>
                <FormControl>
                  <Input placeholder="Contact name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
