import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Loader2 } from "lucide-react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormDialog } from "@/components/shared/FormDialog";
import { parameterSchema, ParameterFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { parameterService } from "@/services/parameterService";
import api from "@/services/api";
import { cn } from "@/lib/utils";

interface Lab {
  id: number;
  name: string;
}

interface ParameterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ParameterFormDialog({ open, onOpenChange, onSuccess }: ParameterFormDialogProps) {
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [labSearchOpen, setLabSearchOpen] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ParameterFormData>({
    resolver: zodResolver(parameterSchema),
    defaultValues: {
      name: "",
      laboratoryId: "",
    },
  });

  // Fetch labs when search query changes
  useEffect(() => {
    const fetchLabs = async () => {
      if (labSearchQuery.length < 2) {
        setLabs([]);
        return;
      }

      try {
        setLoadingLabs(true);
        const response = await api.get('/labs/json', {
          params: { q: labSearchQuery },
        });
        setLabs(response.data.items || []);
      } catch (error) {
        console.error('Error fetching labs:', error);
        setLabs([]);
      } finally {
        setLoadingLabs(false);
      }
    };

    const timeoutId = setTimeout(fetchLabs, 300);
    return () => clearTimeout(timeoutId);
  }, [labSearchQuery]);

  const selectedLab = useMemo(() => {
    const labId = form.watch("laboratoryId");
    return labs.find((l) => String(l.id) === labId);
  }, [form.watch("laboratoryId"), labs]);

  const onSubmit = async (data: ParameterFormData) => {
    try {
      setSubmitting(true);
      await parameterService.create({
        name: data.name,
        lab_id: Number(data.laboratoryId),
      });
      toast.success("Parameter created successfully");
      form.reset();
      setLabSearchQuery("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      console.error('Error creating parameter:', error);
      toast.error(error.response?.data?.message || 'Failed to create parameter');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setLabSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add New Parameter"
      description="Fill in the details to create a new parameter."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name Parameter</FormLabel>
                <FormControl>
                  <Input placeholder="Parameter name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* Lab Search Field */}
          <FormField
            control={form.control}
            name="laboratoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Laboratory</FormLabel>
                <Popover open={labSearchOpen} onOpenChange={setLabSearchOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? selectedLab?.name || "Search laboratory..."
                          : "Search laboratory..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <div className="flex items-center px-3 py-2 border-b">
                        <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Type at least 2 characters..."
                          value={labSearchQuery}
                          onChange={(e) => setLabSearchQuery(e.target.value)}
                          className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <CommandList className="max-h-48">
                        {loadingLabs ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : labSearchQuery.length < 2 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </div>
                        ) : labs.length === 0 ? (
                          <CommandEmpty>No laboratory found</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {labs.map((lab) => (
                              <CommandItem
                                key={lab.id}
                                value={String(lab.id)}
                                onSelect={() => {
                                  field.onChange(String(lab.id));
                                  setLabSearchOpen(false);
                                  setLabSearchQuery("");
                                }}
                                className="cursor-pointer"
                              >
                                {lab.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
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
