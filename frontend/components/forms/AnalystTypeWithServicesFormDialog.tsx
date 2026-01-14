import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, Search, FlaskConical, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { analystTypeWithServicesSchema, AnalystTypeWithServicesFormData } from "@/lib/schemas";
import { analystTypeService, toListService } from "@/services/analystTypeService";
import { serviceService } from "@/services/serviceService";

interface ServiceOption {
  id: number;
  code: string;
  name: string;
  parameter?: {
    id: number;
    name: string;
  };
}

interface AnalystTypeWithServicesFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnalystTypeWithServicesFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: AnalystTypeWithServicesFormDialogProps) {
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicePopoverOpen, setServicePopoverOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);

  const form = useForm<AnalystTypeWithServicesFormData>({
    resolver: zodResolver(analystTypeWithServicesSchema),
    defaultValues: {
      name: "",
      services: [],
      status: "Active",
    },
  });

  const selectedServices = form.watch("services");

  // Search services from API
  const handleServiceSearch = async (query: string) => {
    setServiceSearch(query);
    if (query.length < 2) {
      setServiceOptions([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await serviceService.getJson({ q: query });
      const items = response.items || response.data || [];
      setServiceOptions(items);
    } catch (error) {
      console.error("Failed to search services:", error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Filter out already selected services
  const filteredServices = serviceOptions.filter(
    (service) => !selectedServices.some((s) => s.serviceId === String(service.id))
  );

  const handleAddService = (service: ServiceOption) => {
    const currentServices = form.getValues("services");
    form.setValue("services", [
      ...currentServices,
      {
        serviceId: String(service.id),
        serviceName: service.name,
        parameter: service.parameter?.name || "",
      },
    ]);
    setServiceSearch("");
    setServicePopoverOpen(false);
    setServiceOptions([]);
  };

  const handleRemoveService = (serviceId: string) => {
    const currentServices = form.getValues("services");
    form.setValue(
      "services",
      currentServices.filter((s) => s.serviceId !== serviceId)
    );
  };

  const onSubmit = async (data: AnalystTypeWithServicesFormData) => {
    try {
      setSubmitting(true);

      // Convert services array to comma-separated string for list_service
      const serviceIds = data.services.map((s) => s.serviceId);
      const list_service = toListService(serviceIds);

      await analystTypeService.create({
        name: data.name,
        list_service,
      });

      toast.success("Analyst Type created successfully");
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create analyst type");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setServiceSearch("");
    setServiceOptions([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Analyst Type</DialogTitle>
          <DialogDescription>
            Create a new analyst type with associated services.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter analyst type name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service List */}
            <div className="space-y-3">
              <FormLabel>List Service</FormLabel>

              {/* Search Service */}
              <Popover open={servicePopoverOpen} onOpenChange={setServicePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-start text-muted-foreground font-normal"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search and add service...
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Type to search service..."
                      value={serviceSearch}
                      onValueChange={handleServiceSearch}
                    />
                    <CommandList>
                      {serviceSearch.length < 2 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Type at least 2 characters to search...
                        </div>
                      ) : searchLoading ? (
                        <div className="py-6 text-center">
                          <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                        </div>
                      ) : filteredServices.length === 0 ? (
                        <CommandEmpty>No service found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredServices.slice(0, 10).map((service) => (
                            <CommandItem
                              key={service.id}
                              value={String(service.id)}
                              onSelect={() => handleAddService(service)}
                            >
                              <div className="flex items-center gap-2">
                                <FlaskConical className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {service.code} - {service.name}
                                  </div>
                                  {service.parameter && (
                                    <div className="text-xs text-muted-foreground">
                                      {service.parameter.name}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Services */}
              {selectedServices.length > 0 ? (
                <div className="border rounded-lg">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/50">
                    <span className="text-sm font-medium">Selected Services</span>
                    <span className="text-xs text-muted-foreground">
                      {selectedServices.length} items
                    </span>
                  </div>
                  <div className="max-h-[240px] overflow-y-auto">
                    <div className="divide-y">
                      {selectedServices.map((service, index) => (
                        <div
                          key={service.serviceId}
                          className="flex items-center justify-between p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground w-6">
                              {index + 1}.
                            </span>
                            <div>
                              <div className="font-medium text-sm">
                                {service.serviceName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {service.parameter}
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveService(service.serviceId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-6 text-center text-muted-foreground">
                  No services added yet. Search and add services above.
                </div>
              )}

              {form.formState.errors.services && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.services.message}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Analyst Type
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
