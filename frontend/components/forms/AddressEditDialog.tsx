import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const addressSchema = z.object({
  addressType: z.string().min(1, "Address type is required"),
  address: z.string().min(1, "Address is required"),
  phone: z.string().min(1, "Phone is required"),
  fax: z.string().optional(),
  postalCode: z.number().int().positive().optional().nullable(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  status: z.enum(["Active", "Inactive"]),
});

type AddressFormData = z.infer<typeof addressSchema>;

interface Address {
  addressType: string;
  address: string;
  phone: string;
  fax: string;
  postalCode: number | null;
  city: string;
  state: string;
  country: string;
  status: "Active" | "Inactive";
}

interface AddressEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address: Address | null;
  onSave: (data: AddressFormData) => Promise<void>;
  isSubmitting?: boolean;
}

const addressTypes = ["Head Office", "Branch Office", "Warehouse", "Factory", "Other"];

export function AddressEditDialog({ open, onOpenChange, address, onSave, isSubmitting = false }: AddressEditDialogProps) {
  const form = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      addressType: "",
      address: "",
      phone: "",
      fax: "",
      postalCode: null,
      city: "",
      state: "",
      country: "",
      status: "Active",
    },
  });

  // Reset form when address changes or dialog opens
  useEffect(() => {
    if (open && address) {
      form.reset({
        addressType: address.addressType || "",
        address: address.address || "",
        phone: address.phone || "",
        fax: address.fax || "",
        postalCode: address.postalCode || null,
        city: address.city || "",
        state: address.state || "",
        country: address.country || "",
        status: address.status || "Active",
      });
    }
  }, [open, address, form]);

  const handleSubmit = async (data: AddressFormData) => {
    await onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <span>Edit Address</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="addressType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {addressTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "Active"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} placeholder="Enter full address" />
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
                    <FormLabel>Phone *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter phone number" />
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
                      <Input {...field} placeholder="Enter fax number" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="12345"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter city" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter state" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter country" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}