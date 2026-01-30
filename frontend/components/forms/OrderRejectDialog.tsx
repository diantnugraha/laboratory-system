'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FormDialog } from "@/components/shared/FormDialog";
import { orderRejectSchema, OrderRejectFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { orderService } from "@/services/orderService";
import { getErrorMessage } from "@/lib/utils/errorHandler";

interface OrderRejectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: number | null;
  orderCode: string | null;
  onSuccess?: () => void;
}

export function OrderRejectDialog({
  open,
  onOpenChange,
  orderId,
  orderCode,
  onSuccess,
}: OrderRejectDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<OrderRejectFormData>({
    resolver: zodResolver(orderRejectSchema),
    defaultValues: {
      reason: "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ reason: "" });
    }
  }, [open, form]);

  const reasonValue = form.watch("reason");
  const characterCount = reasonValue?.length || 0;

  const onSubmit = async (data: OrderRejectFormData) => {
    if (!orderId) return;

    try {
      setSubmitting(true);
      await orderService.review(orderId, {
        status: "Need to Revise",
        reason: data.reason,
      });
      toast.success("Order rejected successfully");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to reject order"));
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
      title="Reject Order"
      description={orderCode ? `Rejecting order: ${orderCode}` : "Please provide a reason for rejection"}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason for Rejection</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please explain why this order needs revision..."
                    className="min-h-[120px] resize-none"
                    {...field}
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <FormMessage />
                  <span className={characterCount > 450 ? "text-orange-500" : ""}>
                    {characterCount}/500
                  </span>
                </div>
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
            <Button
              type="submit"
              variant="destructive"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Order"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
