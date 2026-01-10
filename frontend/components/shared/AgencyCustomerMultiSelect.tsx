'use client';

import { useState, useEffect, useCallback } from "react";
import { X, Search, Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { customerService } from "@/services/customerService";
import { cn } from "@/lib/utils";

interface Customer {
  id: number;
  customer_name: string;
  code: string;
}

interface AgencyCustomerMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  initialCustomers?: Customer[];
  maxSelections?: number;
}

export function AgencyCustomerMultiSelect({
  selectedIds,
  onChange,
  disabled = false,
  initialCustomers = [],
  maxSelections,
}: AgencyCustomerMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>(initialCustomers);

  // Sync selectedCustomers when initialCustomers changes
  useEffect(() => {
    if (initialCustomers.length > 0) {
      setSelectedCustomers(initialCustomers);
    }
  }, [initialCustomers]);

  // Fetch customers based on search query
  useEffect(() => {
    const fetchCustomers = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        setLoading(true);
        const response = await customerService.getJson({ q: searchQuery });
        const items = response.items || response.data || [];
        setSearchResults(items.map((item: any) => ({
          id: item.id,
          customer_name: item.customer_name,
          code: item.code,
        })));
      } catch (error) {
        console.error('Error fetching customers:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSelect = useCallback((customer: Customer) => {
    const isSelected = selectedIds.includes(customer.id);

    if (isSelected) {
      // Remove from selection
      const newIds = selectedIds.filter(id => id !== customer.id);
      onChange(newIds);
      setSelectedCustomers(prev => prev.filter(c => c.id !== customer.id));
    } else {
      // Add to selection (check max limit)
      if (maxSelections && selectedIds.length >= maxSelections) {
        return;
      }
      const newIds = [...selectedIds, customer.id];
      onChange(newIds);
      setSelectedCustomers(prev => [...prev, customer]);
    }
  }, [selectedIds, onChange, maxSelections]);

  const handleRemove = useCallback((customerId: number) => {
    const newIds = selectedIds.filter(id => id !== customerId);
    onChange(newIds);
    setSelectedCustomers(prev => prev.filter(c => c.id !== customerId));
  }, [selectedIds, onChange]);

  return (
    <div className="space-y-2">
      {/* Selected customers badges */}
      {selectedCustomers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCustomers.map((customer) => (
            <Badge
              key={customer.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="font-medium">{customer.code}</span>
              <span className="text-muted-foreground">-</span>
              <span className="max-w-[150px] truncate">{customer.customer_name}</span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground ml-1"
                  onClick={() => handleRemove(customer.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Customer search popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled || (maxSelections !== undefined && selectedIds.length >= maxSelections)}
            className={cn(
              "w-full justify-between",
              selectedIds.length === 0 && "text-muted-foreground"
            )}
          >
            {selectedIds.length === 0 ? (
              "Search and add customers..."
            ) : (
              `${selectedIds.length} customer${selectedIds.length > 1 ? 's' : ''} selected`
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Type to search customers..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : searchQuery.length < 2 ? (
                <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
              ) : searchResults.length === 0 ? (
                <CommandEmpty>No customer found</CommandEmpty>
              ) : (
                <CommandGroup>
                  {searchResults.map((customer) => {
                    const isSelected = selectedIds.includes(customer.id);
                    return (
                      <CommandItem
                        key={customer.id}
                        value={customer.id.toString()}
                        onSelect={() => handleSelect(customer)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{customer.code}</span>
                          <span className="text-sm text-muted-foreground">
                            {customer.customer_name}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {maxSelections && (
        <p className="text-xs text-muted-foreground">
          {selectedIds.length}/{maxSelections} customers selected
        </p>
      )}
    </div>
  );
}
