'use client';

import { useState, useEffect, useCallback } from "react";
import { X, Check, ChevronsUpDown, Loader2 } from "lucide-react";
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

interface Contact {
  id: number;
  first_name: string;
  surname: string;
  email: string;
  customer_id?: number;
  customer_name?: string;
}

interface AgencyContactMultiSelectProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  customerIds: number[]; // Filter contacts by these customer IDs
  disabled?: boolean;
  initialContacts?: Contact[];
}

export function AgencyContactMultiSelect({
  selectedIds,
  onChange,
  customerIds,
  disabled = false,
  initialContacts = [],
}: AgencyContactMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>(initialContacts);

  // Sync selectedContacts when initialContacts changes
  // ALSO sync parent's selectedIds if initialContacts has data but selectedIds is empty
  useEffect(() => {
    if (initialContacts.length > 0) {
      setSelectedContacts(initialContacts);
      // If parent's selectedIds is empty but we have initialContacts, sync the IDs to parent
      if (selectedIds.length === 0) {
        const idsFromInitial = initialContacts.map(c => c.id);
        onChange(idsFromInitial);
      }
    } else if (selectedIds.length === 0) {
      // Clear selectedContacts if no IDs selected
      setSelectedContacts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialContacts]);

  // Sync selectedContacts with allContacts when allContacts is fetched
  useEffect(() => {
    if (allContacts.length > 0) {
      if (selectedIds.length > 0 && selectedContacts.length === 0) {
        // Build selectedContacts from allContacts based on selectedIds
        const contactsFromIds = allContacts.filter(c => selectedIds.includes(c.id));
        if (contactsFromIds.length > 0) {
          setSelectedContacts(contactsFromIds);
        }
      } else if (selectedIds.length === 0 && initialContacts.length === 0) {
        // Auto-select all contacts if no selection exists and no initial contacts
        // This handles the case where Agency user was created before this feature
        const allIds = allContacts.map(c => c.id);
        onChange(allIds);
        setSelectedContacts(allContacts);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allContacts]);

  // Fetch all contacts for the selected customers
  useEffect(() => {
    const fetchContacts = async () => {
      if (customerIds.length === 0) {
        setAllContacts([]);
        return;
      }

      try {
        setLoading(true);
        // Fetch contacts for each customer
        const contactPromises = customerIds.map(customerId =>
          customerService.getContacts({ customer_id: customerId, limit: 100 })
        );
        const responses = await Promise.all(contactPromises);

        // Combine all contacts
        const contacts: Contact[] = [];
        responses.forEach(response => {
          response.data.forEach((contact: any) => {
            contacts.push({
              id: contact.id,
              first_name: contact.first_name,
              surname: contact.surname,
              email: contact.email,
              customer_id: contact.customer_id,
              customer_name: contact.customer?.customer_name,
            });
          });
        });

        setAllContacts(contacts);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setAllContacts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [customerIds]);

  // Filter contacts based on search query
  const filteredContacts = allContacts.filter(contact => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    return (
      contact.first_name.toLowerCase().includes(searchLower) ||
      contact.surname.toLowerCase().includes(searchLower) ||
      contact.email.toLowerCase().includes(searchLower)
    );
  });

  const handleSelect = useCallback((contact: Contact) => {
    const isSelected = selectedIds.includes(contact.id);

    if (isSelected) {
      // Remove from selection
      const newIds = selectedIds.filter(id => id !== contact.id);
      onChange(newIds);
      setSelectedContacts(prev => prev.filter(c => c.id !== contact.id));
    } else {
      // Add to selection
      const newIds = [...selectedIds, contact.id];
      onChange(newIds);
      setSelectedContacts(prev => [...prev, contact]);
    }
  }, [selectedIds, onChange]);

  const handleRemove = useCallback((contactId: number) => {
    const newIds = selectedIds.filter(id => id !== contactId);
    onChange(newIds);
    setSelectedContacts(prev => prev.filter(c => c.id !== contactId));
  }, [selectedIds, onChange]);

  const handleSelectAll = useCallback(() => {
    const allIds = allContacts.map(c => c.id);
    onChange(allIds);
    setSelectedContacts(allContacts);
  }, [allContacts, onChange]);

  const handleDeselectAll = useCallback(() => {
    onChange([]);
    setSelectedContacts([]);
  }, [onChange]);

  return (
    <div className="space-y-2">
      {/* Selected contacts badges */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {selectedContacts.map((contact) => (
            <Badge
              key={contact.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <span className="font-medium">{contact.first_name} {contact.surname}</span>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground ml-1"
                  onClick={() => handleRemove(contact.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Contact search popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            disabled={disabled || customerIds.length === 0}
            className={cn(
              "w-full justify-between",
              selectedIds.length === 0 && "text-muted-foreground"
            )}
          >
            {customerIds.length === 0 ? (
              "Select customers first"
            ) : selectedIds.length === 0 ? (
              "Search and add contacts..."
            ) : (
              `${selectedIds.length} contact${selectedIds.length > 1 ? 's' : ''} selected`
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search contacts..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : filteredContacts.length === 0 ? (
                <CommandEmpty>No contacts found</CommandEmpty>
              ) : (
                <>
                  {/* Select/Deselect All buttons */}
                  <div className="flex items-center gap-2 p-2 border-b">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={selectedIds.length === allContacts.length}
                    >
                      Select All ({allContacts.length})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      disabled={selectedIds.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                  <CommandGroup>
                    {filteredContacts.map((contact) => {
                      const isSelected = selectedIds.includes(contact.id);
                      return (
                        <CommandItem
                          key={contact.id}
                          value={contact.id.toString()}
                          onSelect={() => handleSelect(contact)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium">
                              {contact.first_name} {contact.surname}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {contact.email}
                            </span>
                          </div>
                          {contact.customer_name && (
                            <Badge variant="outline" className="text-xs ml-2">
                              {contact.customer_name}
                            </Badge>
                          )}
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <p className="text-xs text-muted-foreground">
        {selectedIds.length} of {allContacts.length} contacts selected
      </p>
    </div>
  );
}
