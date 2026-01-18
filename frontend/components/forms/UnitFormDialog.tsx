import { useRef, useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Loader2 } from "lucide-react";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormDialog } from "@/components/shared/FormDialog";
import { unitSchema, UnitFormData } from "@/lib/schemas";
import { toast } from "sonner";
import { unitService } from "@/services/unitService";
import api from "@/services/api";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { SUCCESS_MESSAGES, OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

interface Lab {
  id: number;
  name: string;
}

interface UnitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const scientificSymbols = [
  { symbol: "²", label: "Squared" },
  { symbol: "³", label: "Cubed" },
  { symbol: "⁻¹", label: "Inverse" },
  { symbol: "⁻²", label: "Inverse Squared" },
  { symbol: "µ", label: "Micro" },
  { symbol: "Σ", label: "Sigma" },
  { symbol: "Δ", label: "Delta" },
  { symbol: "α", label: "Alpha" },
  { symbol: "β", label: "Beta" },
  { symbol: "γ", label: "Gamma" },
  { symbol: "°", label: "Degree" },
  { symbol: "±", label: "Plus Minus" },
  { symbol: "×", label: "Multiply" },
  { symbol: "÷", label: "Divide" },
  { symbol: "√", label: "Square Root" },
  { symbol: "∞", label: "Infinity" },
];

export function UnitFormDialog({ open, onOpenChange, onSuccess }: UnitFormDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [labSearchQuery, setLabSearchQuery] = useState("");
  const [labSearchOpen, setLabSearchOpen] = useState(false);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const form = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      name: "",
      laboratoryId: "",
      description: "",
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

  const insertSymbol = (symbol: string) => {
    const currentValue = form.getValues("name");
    const input = inputRef.current;
    
    if (input) {
      const start = input.selectionStart || currentValue.length;
      const end = input.selectionEnd || currentValue.length;
      const newValue = currentValue.slice(0, start) + symbol + currentValue.slice(end);
      form.setValue("name", newValue);
      
      // Set cursor position after the inserted symbol
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + symbol.length, start + symbol.length);
      }, 0);
    } else {
      form.setValue("name", currentValue + symbol);
    }
  };

  const onSubmit = async (data: UnitFormData) => {
    try {
      setSubmitting(true);
      await unitService.create({
        name: data.name,
        description: data.description,
        lab_id: data.laboratoryId ? Number(data.laboratoryId) : null,
      });
      toast.success(SUCCESS_MESSAGES.CREATED('Unit'));
      form.reset();
      setLabSearchQuery("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('unit')));
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
      title="Add New Unit"
      description="Fill in the details to create a new unit."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unit Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="mg/L, µg/L, m², etc." 
                    {...field}
                    ref={inputRef}
                    className="font-mono text-base"
                  />
                </FormControl>
                <div className="flex flex-wrap gap-1 pt-2">
                  <TooltipProvider delayDuration={300}>
                    {scientificSymbols.map((item) => (
                      <Tooltip key={item.symbol}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 font-mono text-sm hover:bg-primary hover:text-primary-foreground"
                            onClick={() => insertSymbol(item.symbol)}
                          >
                            {item.symbol}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{item.label}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
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
                    placeholder="Enter description..." 
                    className="min-h-[100px] resize-none"
                    {...field} 
                  />
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
                <FormLabel>Laboratory (Optional)</FormLabel>
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
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setLabSearchOpen(false);
                                setLabSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Laboratory)
                            </CommandItem>
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Type at least 2 characters to search
                            </div>
                          </>
                        ) : labs.length === 0 ? (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setLabSearchOpen(false);
                                setLabSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Laboratory)
                            </CommandItem>
                            <CommandEmpty>No laboratory found</CommandEmpty>
                          </>
                        ) : (
                          <>
                            <CommandItem
                              value=""
                              onSelect={() => {
                                field.onChange("");
                                setLabSearchOpen(false);
                                setLabSearchQuery("");
                              }}
                              className="cursor-pointer"
                            >
                              None (No Laboratory)
                            </CommandItem>
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
                          </>
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
