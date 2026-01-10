'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Edit, Trash2, User, Loader2, Mail, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { userService, User as UserType, AGENCY_ROLE_ID, CUSTOMER_ROLE_ID, Customer as CustomerType } from "@/services/userService";
import { customerService, Contact } from "@/services/customerService";
import { AgencyCustomerMultiSelect } from "@/components/shared/AgencyCustomerMultiSelect";
import { AgencyContactMultiSelect } from "@/components/shared/AgencyContactMultiSelect";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Customer {
  id: number;
  customer_name: string;
  code: string;
}

// Unified form schema with conditional validation
const externalUserFormSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  display_name: z.string().min(1, "Display name is required").max(100),
  role_id: z.string().min(1, "Role is required"),
  // For Customer role - single customer
  customer_id: z.string().optional(),
  contact_id: z.string().optional(),
  // For Agency role - multiple customers and contacts
  customer_ids: z.array(z.number()).optional(),
  contact_ids: z.array(z.number()).optional(),
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

type ExternalUserFormData = z.infer<typeof externalUserFormSchema>;

export default function ExternalUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

  // Role state for edit mode
  const [selectedRole, setSelectedRole] = useState<string>(CUSTOMER_ROLE_ID.toString());

  // Customer search
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Contact selection
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactPopoverOpen, setContactPopoverOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  // Agency role multi-select
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<number[]>([]);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [initialCustomers, setInitialCustomers] = useState<Customer[]>([]);
  const [initialContacts, setInitialContacts] = useState<any[]>([]);

  // Check if currently Agency role (for edit mode)
  const isAgencyRole = selectedRole === AGENCY_ROLE_ID.toString();

  const form = useForm<ExternalUserFormData>({
    resolver: zodResolver(externalUserFormSchema),
    defaultValues: {
      username: "",
      email: "",
      display_name: "",
      role_id: CUSTOMER_ROLE_ID.toString(),
      customer_id: "",
      contact_id: "",
      customer_ids: [],
      contact_ids: [],
    },
  });

  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await userService.getById(id);
      setUser(response.data);

      const roleId = response.data.role_id?.toString() || CUSTOMER_ROLE_ID.toString();
      setSelectedRole(roleId);

      // Set form values
      form.reset({
        username: response.data.username,
        email: response.data.email,
        display_name: response.data.display_name,
        role_id: roleId,
        customer_id: response.data.customer_id?.toString() || "",
        contact_id: response.data.contact_id?.toString() || "",
        customer_ids: response.data.customer_ids || [],
        contact_ids: response.data.contact_ids || [],
      });

      // Set customer selection states based on role
      if (Number(response.data.role_id) === AGENCY_ROLE_ID) {
        // Agency role: set multi-select for customers and contacts
        if (response.data.customer_ids) {
          setSelectedCustomerIds(response.data.customer_ids);
        }
        if (response.data.contact_ids) {
          setSelectedContactIds(response.data.contact_ids);
        }
        if (response.data.customers) {
          setInitialCustomers(response.data.customers.map((c: CustomerType) => ({
            id: c.id,
            customer_name: c.customer_name,
            code: '',
          })));
        }
        if (response.data.contacts) {
          setInitialContacts(response.data.contacts.map((c: any) => ({
            id: c.id,
            first_name: c.first_name,
            surname: c.surname,
            email: c.email,
            customer_id: c.customer_id,
            customer_name: c.customer?.customer_name,
          })));
        }
      } else {
        // Customer role: set single customer and contact
        if (response.data.customer) {
          setSelectedCustomer({
            id: response.data.customer.id,
            customer_name: response.data.customer.customer_name,
            code: '',
          });
        }
        if (response.data.contact) {
          setSelectedContact({
            id: response.data.contact.id,
            first_name: response.data.contact.first_name,
            surname: response.data.contact.surname,
            email: response.data.contact.email,
          } as Contact);
        }
      }
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Sync customer_ids and contact_ids with form for Agency role
  useEffect(() => {
    if (isAgencyRole) {
      form.setValue('customer_ids', selectedCustomerIds);
      form.setValue('contact_ids', selectedContactIds);
    }
  }, [selectedCustomerIds, selectedContactIds, isAgencyRole, form]);

  // Handle role change in edit mode
  const handleRoleChange = (value: string) => {
    setSelectedRole(value);
    form.setValue('role_id', value);

    // Clear selections when role changes
    if (value === AGENCY_ROLE_ID.toString()) {
      // Switching to Agency: clear single customer
      setSelectedCustomer(null);
      setSelectedContact(null);
      form.setValue('customer_id', '');
      form.setValue('contact_id', '');
    } else {
      // Switching to Customer: clear multi-select
      setSelectedCustomerIds([]);
      setSelectedContactIds([]);
      setInitialCustomers([]);
      setInitialContacts([]);
      form.setValue('customer_ids', []);
      form.setValue('contact_ids', []);
    }
  };

  // Fetch customers when searching
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

  // Fetch contacts when customer is selected
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
    setContactPopoverOpen(false);
  };

  const onSubmit = async (data: ExternalUserFormData) => {
    try {
      setSaving(true);

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
        // Agency role: multiple customers and contacts
        // Use state values directly to ensure latest data is used
        requestData.customer_ids = selectedCustomerIds;
        requestData.contact_ids = selectedContactIds;
      }

      await userService.update(id, requestData);
      toast.success('User updated successfully');
      setIsEditing(false);
      fetchUser();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await userService.delete(id);
      toast.success('User deleted successfully');
      router.push('/master/user');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleResendWelcome = async () => {
    try {
      setResendingEmail(true);
      const response = await userService.resendWelcome(id);
      toast.success('Welcome email sent successfully', {
        description: response.data?.password ? `New password: ${response.data.password}` : undefined,
        duration: 10000,
      });
    } catch (error: any) {
      console.error('Error resending welcome email:', error);
      toast.error(error.response?.data?.message || 'Failed to resend welcome email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      const roleId = user.role_id?.toString() || CUSTOMER_ROLE_ID.toString();
      setSelectedRole(roleId);

      form.reset({
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role_id: roleId,
        customer_id: user.customer_id?.toString() || "",
        contact_id: user.contact_id?.toString() || "",
        customer_ids: user.customer_ids || [],
        contact_ids: user.contact_ids || [],
      });

      if (Number(user.role_id) === AGENCY_ROLE_ID) {
        setSelectedCustomerIds(user.customer_ids || []);
        setSelectedContactIds(user.contact_ids || []);
        if (user.customers) {
          setInitialCustomers(user.customers.map(c => ({
            id: c.id,
            customer_name: c.customer_name,
            code: '',
          })));
        }
        if (user.contacts) {
          setInitialContacts(user.contacts.map(c => ({
            id: c.id,
            first_name: c.first_name,
            surname: c.surname,
            email: c.email,
            customer_id: c.customer_id,
            customer_name: c.customer?.customer_name,
          })));
        }
        setSelectedCustomer(null);
        setSelectedContact(null);
      } else {
        setSelectedCustomerIds([]);
        setSelectedContactIds([]);
        setInitialCustomers([]);
        setInitialContacts([]);
        if (user.customer) {
          setSelectedCustomer({
            id: user.customer.id,
            customer_name: user.customer.customer_name,
            code: '',
          });
        }
        if (user.contact) {
          setSelectedContact({
            id: user.contact.id,
            first_name: user.contact.first_name,
            surname: user.contact.surname,
            email: user.contact.email,
          } as Contact);
        } else {
          setSelectedContact(null);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => router.push('/master/user')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/master/user')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{user.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
          <Badge variant="outline">{user.role?.name || 'Customer'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={handleResendWelcome} disabled={resendingEmail}>
                {resendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Resend Welcome
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(onSubmit)} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isEditing ? (
            <Form {...form}>
              <form className="space-y-4">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Conditional Customer Selection based on Role */}
                {isAgencyRole ? (
                  // Agency Role: Multi-select customers
                  <>
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
                              initialCustomers={initialCustomers}
                            />
                          </FormControl>
                          <FormDescription>
                            Select the customers this agency user can access
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {/* Contacts Multi-select */}
                    <FormField
                      control={form.control}
                      name="contact_ids"
                      render={() => (
                        <FormItem>
                          <FormLabel>Contacts</FormLabel>
                          <FormControl>
                            <AgencyContactMultiSelect
                              selectedIds={selectedContactIds}
                              onChange={setSelectedContactIds}
                              customerIds={selectedCustomerIds}
                              initialContacts={initialContacts}
                            />
                          </FormControl>
                          <FormDescription>
                            Select contacts from the selected customers. Contacts are automatically loaded based on customers.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  // Customer Role: Single customer selection
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Customer Selection */}
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
                                    ? selectedCustomer.customer_name
                                    : "Search customer..."}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Type to search..."
                                  value={customerSearchQuery}
                                  onValueChange={setCustomerSearchQuery}
                                />
                                <CommandList>
                                  {loadingCustomers ? (
                                    <div className="flex items-center justify-center py-6">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : customerSearchQuery.length < 2 ? (
                                    <CommandEmpty>Type at least 2 characters</CommandEmpty>
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

                    {/* Contact Selection */}
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
                                    <CommandEmpty>No contacts found</CommandEmpty>
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
                                              {contact.first_name} {contact.surname}
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
                  </div>
                )}
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Display Name</p>
                  <p className="font-medium">{user.display_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Username</p>
                  <p className="font-medium">@{user.username}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Role</p>
                  <Badge variant="outline">{user.role?.name || '-'}</Badge>
                </div>
                {Number(user.role_id) === AGENCY_ROLE_ID ? (
                  <>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-2">Customers</p>
                      {user.customers && user.customers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {user.customers.map((customer) => (
                            <Badge key={customer.id} variant="secondary">
                              {customer.customer_name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium text-muted-foreground">No customers assigned</p>
                      )}
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-muted-foreground mb-2">Contacts ({user.contacts?.length || 0})</p>
                      {user.contacts && user.contacts.length > 0 ? (
                        <div className="space-y-2">
                          {user.contacts.map((contact) => (
                            <div key={contact.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
                              <div className="flex-1">
                                <p className="font-medium text-sm">{contact.first_name} {contact.surname}</p>
                                <p className="text-xs text-muted-foreground">{contact.email}</p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {contact.customer?.customer_name || '-'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium text-muted-foreground">No contacts assigned</p>
                      )}
                    </div>
                  </>
                ) : Number(user.role_id) === CUSTOMER_ROLE_ID ? (
                  <>
                    <div>
                      <p className="text-sm text-muted-foreground">Customer</p>
                      {user.customer ? (
                        <Badge variant="secondary">{user.customer.customer_name}</Badge>
                      ) : user.customer_id ? (
                        <p className="font-medium text-muted-foreground">Customer ID: {user.customer_id} (not found)</p>
                      ) : (
                        <p className="font-medium text-muted-foreground">Not assigned</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contact</p>
                      {user.contact ? (
                        <>
                          <p className="font-medium">{user.contact.first_name} {user.contact.surname}</p>
                          <p className="text-xs text-muted-foreground">{user.contact.email}</p>
                        </>
                      ) : user.contact_id ? (
                        <p className="font-medium text-muted-foreground">Contact ID: {user.contact_id} (not found)</p>
                      ) : (
                        <p className="font-medium text-muted-foreground">Not assigned</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">Role ID: {user.role_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Created At</p>
                  <p className="font-medium">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }) : '-'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{user.display_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
