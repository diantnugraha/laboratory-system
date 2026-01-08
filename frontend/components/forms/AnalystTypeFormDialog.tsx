import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { analystTypeSchema, AnalystTypeFormData } from "@/lib/schemas";
import { toast } from "sonner";

interface AnalystTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnalystTypeFormDialog({ open, onOpenChange }: AnalystTypeFormDialogProps) {
  const form = useForm<AnalystTypeFormData>({
    resolver: zodResolver(analystTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
    },
  });

  const onSubmit = (data: AnalystTypeFormData) => {
    console.log("Form data:", data);
    toast.success("Analyst Type added successfully");
    form.reset();
    onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Analyst Type"
      description="Fill in the details to create a new analyst type."
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
                  <Input placeholder="Analyst type name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter list of services..."
                    rows={4}
                    {...field}
                    value={field.value || ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}








