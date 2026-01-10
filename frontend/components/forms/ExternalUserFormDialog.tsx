'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
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
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FormDialog } from "@/components/shared/FormDialog";
import { AgencyCustomerMultiSelect } from "@/components/shared/AgencyCustomerMultiSelect";
import { toast } from "sonner";
import { userService, AGENCY_ROLE_ID, CUSTOMER_ROLE_ID } from "@/services/userService";
import { customerService, Contact } from "@/services/customerService";
import { cn } from "@/lib/utils";

interface Customer {
  id: number;
  customer_name: string;
  code: string;
}

// External User Form Schema - validates based on role
const externalUserSchema = z.object({
  username: z.string().min(1, "Username is required").max(50, "Username must be less than 50 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  display_name: z.string().min(1, "Display name is required").max(100, "Display name must be less than 100 characters"),
  role_id: z.string().min(1, "Role is required"),
  // For Customer role - single customer
  customer_id: z.string().optional(),
  contact_id: z.string().optional(),
  // For Agency role - multiple customers
  customer_ids: z.array(z.number()).optional(),
}).refine((data) => {
  // Customer role requires customer_id
  if (data.role_id === CUSTOMER_ROLE_ID.toString()) {
    return !!data.customer_id && data.customer_id.length > 0;
  }
  return true;
}, {
  message: "Customer is required",
  path: ["customer_id"],
}).refine((data) => {
  // Agency role requires at least one customer
  if (data.role_id === AGENCY_ROLE_ID.toString()) {
    return data.customer_ids && data.customer_ids.length > 0;
  }
  return true;
}, {
  message: "At least one customer is required for Agency role",
  path: ["customer_ids"],
});

type ExternalUserFormData = z.infer<typeof externalUserSchema>;

interface ExternalUserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ExternalUserFormDialog({ open, onOpenChange, onSuccess }: ExternalUserFormDialogProps) {
  // Role state
  const [selectedRole, setSelectedRole] = useState<string>(CUSTOMER_ROLE_ID.toString());

  // Customer role states (single customer)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Contact states
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Agency role states (multiple customers)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ExternalUserFormData>({
    resolver: zodResolver(externalUserSchema),
    defaultValues: {
      username: "",
      email: "",
      display_name: "",
      role_id: CUSTOMER_ROLE_ID.toString(),
      customer_id: "",
      contact_id: "",
      customer_ids: [],
    },
  });

  const isAgencyRole = selectedRole === AGENCY_ROLE_ID.toString();

  // Sync customer_ids with form for Agency role
  useEffect(() => {
    form.setValue('customer_ids', selectedCustomerIds);
  }, [selectedCustomerIds, form]);

  // Handle role change
  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    form.setValue('role_id', value);

    // Clear customer/contact selections when role changes
    setSelectedCustomer(null);
    setSelectedContact(null);
    setSelectedCustomerIds([]);
    form.setValue('customer_id', '');
    form.setValue('contact_id', '');
    form.setValue('customer_ids', []);
  };

  // Fetch customers when searching (for Customer role)
  useEffect(() => {
    const fetchCustomers = async () => {
      if (customerSearchQuery.length < 2) {
        setCustomers([]);
        return;
      }

      try {
        setLoadingCustomers(true);
        const response = await customerService.getJson({ q: customerSearchQuery });
        const items = response.items || response.data || [];
        setCustomers(items.map((item: any) => ({
          id: item.id,
          customer_name: item.customer_name,
          code: item.code,
        })));
      } catch (error) {
        console.error('Error fetching customers:', error);
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    const timeoutId = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(timeoutId);
  }, [customerSearchQuery]);

  // Fetch contacts when customer is selected (for Customer role)
  useEffect(() => {
    const fetchContacts = async () => {
      if (!selectedCustomer) {
        setContacts([]);
        return;
      }

      try {
        setLoadingContacts(true);
        const response = await customerService.getContacts({
          customer_id: selectedCustomer.id,
          limit: 50,
        });
        setContacts(response.data);
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setContacts([]);
      } finally {
        setLoadingContacts(false);
      }
    };

    fetchContacts();
  }, [selectedCustomer]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setSelectedRole(CUSTOMER_ROLE_ID.toString());
      setSelectedCustomer(null);
      setSelectedContact(null);
      setSelectedCustomerIds([]);
      setCustomerSearchQuery("");
      setCustomers([]);
      setContacts([]);
    }
  }, [open, form]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    form.setValue('customer_id', customer.id.toString());
    // Clear contact when customer changes
    setSelectedContact(null);
    form.setValue('contact_id', '');
    setCustomerPopoverOpen(false);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    form.setValue('contact_id', contact.id.toString());
    // Auto-fill email if empty
    if (!form.getValues('email') && contact.email) {
      form.setValue('email', contact.email);
    }
    // Auto-fill display name if empty
    if (!form.getValues('display_name')) {
      const fullName = [contact.first_name, contact.middle_name, contact.surname]
        .filter(Boolean)
        .join(' ');
      form.setValue('display_name', fullName);
    }
    setContactPopoverOpen(false);
  };

  const onSubmit = async (data: ExternalUserFormData) => {
    try {
      setSubmitting(true);

      const roleId = parseInt(data.role_id);

      // Prepare request data based on role
      const requestData: any = {
        username: data.username,
        email: data.email,
        display_name: data.display_name,
        role_id: roleId,
      };

      if (roleId === CUSTOMER_ROLE_ID) {
        // Customer role: single customer
        requestData.customer_id = parseInt(data.customer_id!);
        if (data.contact_id) {
          requestData.contact_id = parseInt(data.contact_id);
        }
      } else if (roleId === AGENCY_ROLE_ID) {
        // Agency role: multiple customers
        requestData.customer_ids = data.customer_ids;
      }

      const response = await userService.create(requestData);

      if (response.success) {
        const roleLabel = roleId === AGENCY_ROLE_ID ? 'Agency' : 'Customer';
        toast.success(`${roleLabel} user created successfully. Welcome email has been sent.`);
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add External User"
      description="Create a new external user account. A password will be generated automatically."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Role Selection */}
          <FormField
            control={form.control}
            name="role_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>User Type</FormLabel>
                <Select
                  value={selectedRole}
                  onValueChange={handleRoleChange}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select user type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={CUSTOMER_ROLE_ID.toString()}>
                      Customer
                    </SelectItem>
                    <SelectItem value={AGENCY_ROLE_ID.toString()}>
                      Agency
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  {isAgencyRole
                    ? "Agency users can view orders from multiple customers"
                    : "Customer users can only view orders from one customer"
                  }
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Conditional Customer Selection based on Role */}
          {isAgencyRole ? (
            // Agency Role: Multi-select customers
            <FormField
              control={form.control}
              name="customer_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customers</FormLabel>
                  <FormControl>
                    <AgencyCustomerMultiSelect
                      selectedIds={selectedCustomerIds}
                      onChange={setSelectedCustomerIds}
                    />
                  </FormControl>
                  <FormDescription>
                    Select the customers this agency user can access
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            // Customer Role: Single customer selection
            <>
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Customer</FormLabel>
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !selectedCustomer && "text-muted-foreground"
                            )}
                          >
                            {selectedCustomer
                              ? `${selectedCustomer.code} - ${selectedCustomer.customer_name}`
                              : "Search customer..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Type to search customers..."
                            value={customerSearchQuery}
                            onValueChange={setCustomerSearchQuery}
                          />
                          <CommandList>
                            {loadingCustomers ? (
                              <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin" />
                              </div>
                            ) : customerSearchQuery.length < 2 ? (
                              <CommandEmpty>Type at least 2 characters to search</CommandEmpty>
                            ) : customers.length === 0 ? (
                              <CommandEmpty>No customer found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {customers.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={customer.id.toString()}
                                    onSelect={() => handleCustomerSelect(customer)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedCustomer?.id === customer.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">{customer.code}</span>
                                      <span className="text-sm text-muted-foreground">
                                        {customer.customer_name}
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

              {/* Contact Selection (Optional, depends on customer) */}
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Contact (Optional)</FormLabel>
                    <Popover open={contactPopoverOpen} onOpenChange={setContactPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!selectedCustomer || loadingContacts}
                            className={cn(
                              "w-full justify-between",
                              !selectedContact && "text-muted-foreground"
                            )}
                          >
                            {loadingContacts ? (
                              <span className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                              </span>
                            ) : selectedContact ? (
                              `${selectedContact.first_name} ${selectedContact.surname}`
                            ) : selectedCustomer ? (
                              "Select contact..."
                            ) : (
                              "Select customer first"
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search contact..." />
                          <CommandList>
                            {contacts.length === 0 ? (
                              <CommandEmpty>No contacts found for this customer</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {contacts.map((contact) => (
                                  <CommandItem
                                    key={contact.id}
                                    value={`${contact.first_name} ${contact.surname}`}
                                    onSelect={() => handleContactSelect(contact)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedContact?.id === contact.id
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-medium">
                                        {contact.first_name} {contact.middle_name} {contact.surname}
                                      </span>
                                      <span className="text-sm text-muted-foreground">
                                        {contact.email}
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
            </>
          )}

          <FormField
            control={form.control}
            name="display_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Display Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter display name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create User
            </Button>
          </div>
        </form>
      </Form>
    </FormDialog>
  );
}
