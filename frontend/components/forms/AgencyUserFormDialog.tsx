'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
  FormDescription,
} from "@/components/ui/form";
import { FormDialog } from "@/components/shared/FormDialog";
import { AgencyCustomerMultiSelect } from "@/components/shared/AgencyCustomerMultiSelect";
import { toast } from "sonner";
import { userService, AGENCY_ROLE_ID } from "@/services/userService";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

// Agency User Form Schema
const agencyUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username must be less than 50 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  display_name: z.string().min(1, "Display name is required").max(100, "Display name must be less than 100 characters"),
  customer_ids: z.array(z.number()).min(1, "At least one customer is required"),
});

type AgencyUserFormData = z.infer<typeof agencyUserSchema>;

interface AgencyUserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AgencyUserFormDialog({ open, onOpenChange, onSuccess }: AgencyUserFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

  const form = useForm<AgencyUserFormData>({
    resolver: zodResolver(agencyUserSchema),
    defaultValues: {
      username: "",
      email: "",
      display_name: "",
      customer_ids: [],
    },
  });

  // Sync customer_ids with form
  useEffect(() => {
    form.setValue('customer_ids', selectedCustomerIds);
  }, [selectedCustomerIds, form]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedCustomerIds([]);
    }
  }, [open, form]);

  const onSubmit = async (data: AgencyUserFormData) => {
    try {
      setSubmitting(true);

      const response = await userService.create({
        username: data.username,
        email: data.email,
        display_name: data.display_name,
        role_id: AGENCY_ROLE_ID,
        customer_ids: data.customer_ids,
      });

      if (response.success) {
        toast.success('Agency user created successfully. Welcome email has been sent.');
        form.reset();
        setSelectedCustomerIds([]);
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('agency user')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Agency User"
      description="Create a new agency user account. Agency users can view orders from multiple customers."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Customer Selection (Multi-select) */}
          <FormField
            control={form.control}
            name="customer_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customers</FormLabel>
                <FormControl>
                  <AgencyCustomerMultiSelect
                    selectedIds={selectedCustomerIds}
                    onChange={setSelectedCustomerIds}
                  />
                </FormControl>
                <FormDescription>
                  Select the customers this agency user can access
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter display name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} />
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
                    <Input type="email" placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Agency User
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
