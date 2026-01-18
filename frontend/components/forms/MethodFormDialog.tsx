import { useState, useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FormDialog } from "@/components/shared/FormDialog";
import { methodSchema, MethodFormData } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { methodService } from "@/services/methodService";
import api from "@/services/api";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { SUCCESS_MESSAGES, OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

interface Matrix {
  id: number;
  code?: string;
  name: string;
  category?: string;
}

interface MethodFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MethodFormDialog({ open, onOpenChange, onSuccess }: MethodFormDialogProps) {
  const [matrixSearchQuery, setMatrixSearchQuery] = useState("");
  const [matrixSearchOpen, setMatrixSearchOpen] = useState(false);

  const [matrices, setMatrices] = useState<Matrix[]>([]);
  const [loadingMatrices, setLoadingMatrices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<MethodFormData>({
    resolver: zodResolver(methodSchema),
    defaultValues: {
      name: "",
      category: "In House",
      status: "Active",
      matrixId: "",
      description: "",
    },
  });

  // Fetch matrices when search query changes
  useEffect(() => {
    const fetchMatrices = async () => {
      if (matrixSearchQuery.length < 2) {
        setMatrices([]);
        return;
      }

      try {
        setLoadingMatrices(true);
        const response = await api.get('/matrices/json', {
          params: { q: matrixSearchQuery },
        });
        setMatrices(response.data.items || []);
      } catch (error) {
        console.error('Error fetching matrices:', error);
        setMatrices([]);
      } finally {
        setLoadingMatrices(false);
      }
    };

    const timeoutId = setTimeout(fetchMatrices, 300);
    return () => clearTimeout(timeoutId);
  }, [matrixSearchQuery]);

  const selectedMatrix = useMemo(() => {
    const matrixId = form.watch("matrixId");
    return matrices.find((m) => m.id === Number(matrixId));
  }, [form.watch("matrixId"), matrices]);

  const onSubmit = async (data: MethodFormData) => {
    try {
      setSubmitting(true);
      await methodService.create({
        name: data.name,
        matrix_id: Number(data.matrixId),
        category_name: data.category,
        status: data.status || "Active",
        description: data.description || undefined,
        instruction: data.instruction || undefined,
      });
      toast.success(SUCCESS_MESSAGES.CREATED('Metode'));
      form.reset();
      setMatrixSearchQuery("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('metode')));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setMatrixSearchQuery("");
    }
    onOpenChange(newOpen);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Add New Method"
      description="Fill in the details to create a new method."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name Method</FormLabel>
                <FormControl>
                  <Input placeholder="Method name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || "In House"}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="In House">In House</SelectItem>
                    <SelectItem value="Official">Official</SelectItem>
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
                <FormLabel>Status</FormLabel>
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
          {/* Matrix Search Field */}
          <FormField
            control={form.control}
            name="matrixId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Matrix</FormLabel>
                <Popover open={matrixSearchOpen} onOpenChange={setMatrixSearchOpen}>
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
                        {selectedMatrix
                          ? `${selectedMatrix.code ? selectedMatrix.code + ' - ' : ''}${selectedMatrix.name}`
                          : "Search matrix..."}
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
                          value={matrixSearchQuery}
                          onChange={(e) => setMatrixSearchQuery(e.target.value)}
                          className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <CommandList className="max-h-48">
                        {loadingMatrices ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Loading...
                          </div>
                        ) : matrixSearchQuery.length < 2 ? (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            Type at least 2 characters to search
                          </div>
                        ) : matrices.length === 0 ? (
                          <CommandEmpty>No matrix found</CommandEmpty>
                        ) : (
                          <CommandGroup>
                            {matrices.map((matrix) => (
                              <CommandItem
                                key={matrix.id}
                                value={String(matrix.id)}
                                onSelect={() => {
                                  field.onChange(String(matrix.id));
                                  setMatrixSearchOpen(false);
                                  setMatrixSearchQuery("");
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {matrix.code ? `${matrix.code} - ` : ''}{matrix.name}
                                  </span>
                                </div>
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
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Method description" 
                    className="h-24 resize-none"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
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