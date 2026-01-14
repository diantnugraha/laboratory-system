'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Edit, Trash2, FlaskConical, X, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { toast } from "sonner";
import {
  analystTypeService,
  AnalystType,
  parseListService,
  toListService,
} from "@/services/analystTypeService";
import { serviceService } from "@/services/serviceService";
import { analystTypeWithServicesSchema, AnalystTypeWithServicesFormData } from "@/lib/schemas";

interface ServiceOption {
  id: number;
  code: string;
  name: string;
  parameter?: {
    id: number;
    name: string;
  };
}

interface AnalystTypeService {
  serviceId: string;
  serviceName: string;
  parameter: string;
}

export default function AnalystTypeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  // State
  const [analystType, setAnalystType] = useState<AnalystType | null>(null);
  const [services, setServices] = useState<AnalystTypeService[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [servicePopoverOpen, setServicePopoverOpen] = useState(false);
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

  // Fetch analyst type data
  const fetchAnalystType = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analystTypeService.getById(id);
      setAnalystType(response.data);

      // Parse list_service to get service IDs
      const serviceIds = parseListService(response.data.list_service);

      // Fetch service details for each ID
      if (serviceIds.length > 0) {
        const serviceDetails: AnalystTypeService[] = [];
        for (const serviceId of serviceIds) {
          try {
            const serviceResponse = await serviceService.getById(serviceId);
            if (serviceResponse.data) {
              serviceDetails.push({
                serviceId: String(serviceResponse.data.id),
                serviceName: serviceResponse.data.name,
                parameter: serviceResponse.data.parameter?.name || "",
              });
            }
          } catch {
            // Service might not exist, skip it
          }
        }
        setServices(serviceDetails);
      } else {
        setServices([]);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to fetch analyst type");
      router.push("/master/analyst-user");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) {
      fetchAnalystType();
    }
  }, [id, fetchAnalystType]);

  // Update form when entering edit mode
  useEffect(() => {
    if (isEditing && analystType) {
      form.reset({
        name: analystType.name,
        services: services,
        status: "Active",
      });
    }
  }, [isEditing, analystType, services, form]);

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

  const handleSave = async (data: AnalystTypeWithServicesFormData) => {
    try {
      setSaving(true);

      // Convert services array to list_service string
      const serviceIds = data.services.map((s) => s.serviceId);
      const list_service = toListService(serviceIds);

      await analystTypeService.update(id, {
        name: data.name,
        list_service,
      });

      toast.success("Analyst Type updated successfully");
      setIsEditing(false);

      // Refetch data
      await fetchAnalystType();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update analyst type");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await analystTypeService.delete(id);
      toast.success("Analyst Type deleted successfully");
      router.push("/master/analyst-user");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to delete analyst type");
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset({
      name: analystType?.name || "",
      services: services,
      status: "Active",
    });
    setServiceSearch("");
    setServiceOptions([]);
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not found state
  if (!analystType) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Analyst Type not found</p>
        <Button variant="outline" onClick={() => router.push("/master/analyst-user")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analyst User
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/master/analyst-user")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {analystType.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Analyst Type Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(handleSave)} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Analyst Type Information Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Analyst Type Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <Form {...form}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Services
                    </p>
                    <p className="font-medium">{selectedServices.length} services</p>
                  </div>
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </p>
                <p className="font-medium">{analystType.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Total Services
                </p>
                <p className="font-medium">{services.length} services</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service List Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            List Service
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isEditing && (
            <div className="p-4 border-b">
              <Popover open={servicePopoverOpen} onOpenChange={setServicePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
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
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-16">No</TableHead>
                <TableHead>Service Name</TableHead>
                <TableHead>Parameter</TableHead>
                {isEditing && <TableHead className="w-16">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isEditing ? selectedServices : services).length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isEditing ? 4 : 3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No services assigned.
                  </TableCell>
                </TableRow>
              ) : (
                (isEditing ? selectedServices : services).map(
                  (service: AnalystTypeService, index: number) => (
                    <TableRow key={service.serviceId}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{service.serviceName}</TableCell>
                      <TableCell className="text-muted-foreground">{service.parameter}</TableCell>
                      {isEditing && (
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveService(service.serviceId)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analyst Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this analyst type? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
