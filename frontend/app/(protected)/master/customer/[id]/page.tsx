'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Building2, MapPin, User, ChevronRight, Loader2, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AddressEditDialog } from "@/components/forms/AddressEditDialog";
import { ContactEditDialog } from "@/components/forms/ContactEditDialog";
import { CreateUserFromContactDialog } from "@/components/forms/CreateUserFromContactDialog";
import { customerService, Customer, Address, Contact } from "@/services/customerService";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

// Local interfaces for dialog state (with proper typing)
interface AddressDialogData {
  id: number;
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

interface ContactDialogData {
  id: number;
  addressId: number;
  title: string;
  firstName: string;
  surname: string;
  jobTitle: string;
  department: string;
  email: string;
  phone: string;
  status: "Active" | "Inactive";
}

// Transform API address to dialog format
const transformAddress = (addr: Address): AddressDialogData => ({
  id: addr.id,
  addressType: addr.address_type,
  address: addr.address,
  phone: addr.phone,
  fax: addr.fax || "",
  postalCode: addr.postal_code ?? null,
  city: addr.city,
  state: addr.state,
  country: addr.country,
  status: addr.status === "Active" ? "Active" : "Inactive",
});

// Transform API contact to dialog format
const transformContact = (contact: Contact): ContactDialogData => ({
  id: contact.id,
  addressId: contact.address?.id || 0,
  title: contact.title,
  firstName: contact.first_name,
  surname: contact.surname,
  jobTitle: contact.job_title || "",
  department: contact.department || "",
  email: contact.email,
  phone: contact.phone,
  status: contact.status === "Active" ? "Active" : "Inactive",
});

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("customer-info");
  const [selectedAddress, setSelectedAddress] = useState<AddressDialogData | null>(null);
  const [selectedContact, setSelectedContact] = useState<ContactDialogData | null>(null);
  const [editingAddress, setEditingAddress] = useState<AddressDialogData | null>(null);
  const [editingContact, setEditingContact] = useState<ContactDialogData | null>(null);
  const [isAddressSaving, setIsAddressSaving] = useState(false);
  const [isContactSaving, setIsContactSaving] = useState(false);
  const [createUserContact, setCreateUserContact] = useState<Contact | null>(null);

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await customerService.getById(id);
      setCustomer(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('customer')));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleAddressSave = async (data: any) => {
    if (!editingAddress || !customer) return;
    try {
      setIsAddressSaving(true);

      const action = editingAddress.id === 0 ? 'create' : 'update';

      await customerService.manageAddress({
        action,
        id: editingAddress.id === 0 ? undefined : editingAddress.id,
        customer_id: customer.id,
        address_type: data.addressType,
        address: data.address,
        phone: data.phone,
        fax: data.fax || undefined,
        city: data.city,
        state: data.state || undefined,
        country: data.country,
        postal_code: data.postalCode || undefined,
        status: data.status,
      });
      toast.success(action === 'create' ? 'Address created successfully' : 'Address updated successfully');
      setEditingAddress(null);
      fetchCustomer(); // Refresh data
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save address'));
    } finally {
      setIsAddressSaving(false);
    }
  };

  const handleContactSave = async (data: any) => {
    if (!editingContact || !customer) return;
    try {
      setIsContactSaving(true);

      const action = editingContact.id === 0 ? 'create' : 'update';

      await customerService.manageContact({
        action,
        id: editingContact.id === 0 ? undefined : editingContact.id,
        customer_id: customer.id,
        address_id: editingContact.addressId,
        title: data.title || undefined,
        first_name: data.firstName,
        surname: data.surname,
        job_title: data.jobTitle || undefined,
        department: data.department || undefined,
        email: data.email,
        phone: data.phone,
        status: data.status,
      });
      toast.success(action === 'create' ? 'Contact created successfully' : 'Contact updated successfully');
      setEditingContact(null);
      fetchCustomer(); // Refresh data
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to save contact'));
    } finally {
      setIsContactSaving(false);
    }
  };

  const handleAddressDelete = async (addressId: number) => {
    try {
      await customerService.manageAddress({
        action: 'delete',
        id: addressId,
      });
      toast.success("Address deleted successfully");
      setSelectedAddress(null);
      fetchCustomer(); // Refresh data
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('address')));
    }
  };

  const handleContactDelete = async (contactId: number) => {
    try {
      await customerService.manageContact({
        action: 'delete',
        id: contactId,
      });
      toast.success("Contact deleted successfully");
      setSelectedContact(null);
      fetchCustomer(); // Refresh data
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('contact')));
    }
  };

  const handleDelete = async () => {
    try {
      await customerService.delete(id);
      toast.success("Customer deleted successfully");
      router.push("/master/customer");
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('customer')));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  const isWhitelist = customer.special_customer === 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/master/customer")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{customer.code}</h1>
            <Badge variant={isWhitelist ? "secondary" : "default"}>
              {isWhitelist ? "Whitelist" : "Contract"}
            </Badge>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Customer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this customer? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="customer-info" className="gap-2">
            <Building2 className="h-4 w-4" />
            Customer Info
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4" />
            Addresses ({customer.addresses?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-2">
            <User className="h-4 w-4" />
            Contacts ({customer.contacts?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Customer Info Tab */}
        <TabsContent value="customer-info">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  Customer Info
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/master/customer/${id}/edit`)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Code
                  </p>
                  <p className="text-sm font-medium">{customer.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Customer Name
                  </p>
                  <p className="text-sm font-medium">{customer.customer_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Business Line
                  </p>
                  <p className="text-sm font-medium">{customer.business}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Customer Category
                  </p>
                  <p className="text-sm font-medium">{isWhitelist ? "Whitelist" : "Contract"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Term of Payment (Days)
                  </p>
                  <p className="text-sm font-medium">{customer.top?.toString() || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    NPWP Number
                  </p>
                  <p className="text-sm font-medium">{customer.npwp || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Central Customer ID
                  </p>
                  <p className="text-sm font-medium">{customer.central_cust_id || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sales Incharge
                  </p>
                  <p className="text-sm font-medium">{customer.sales_incharge || "-"}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Email
                  </p>
                  <p className="text-sm font-medium">{customer.email || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Legal Document
                  </p>
                  <p className="text-sm font-medium">{customer.legal_document || "-"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  Addresses
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAddress({
                      id: 0,
                      addressType: "",
                      address: "",
                      phone: "",
                      fax: "",
                      postalCode: null,
                      city: "",
                      state: "",
                      country: "",
                      status: "Active",
                    });
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address Type</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.addresses?.map((address) => (
                    <TableRow
                      key={address.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedAddress(transformAddress(address))}
                    >
                      <TableCell className="font-medium text-primary hover:underline">
                        {address.address_type}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {address.address}
                      </TableCell>
                      <TableCell>
                        <Badge variant={address.status === "Active" ? "default" : "secondary"}>
                          {address.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!customer.addresses || customer.addresses.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No addresses found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  Contacts
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    // Check if customer has addresses
                    if (!customer.addresses || customer.addresses.length === 0) {
                      toast.error("Please add an address first before adding contacts");
                      setActiveTab("addresses");
                      return;
                    }

                    setEditingContact({
                      id: 0,
                      addressId: customer.addresses[0].id,
                      title: "",
                      firstName: "",
                      surname: "",
                      jobTitle: "",
                      department: "",
                      email: "",
                      phone: "",
                      status: "Active",
                    });
                  }}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.contacts?.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedContact(transformContact(contact))}
                    >
                      <TableCell className="font-medium text-primary hover:underline">
                        {contact.title} {contact.first_name} {contact.surname}
                      </TableCell>
                      <TableCell>{contact.phone}</TableCell>
                      <TableCell>
                        <Badge variant={contact.status === "Active" ? "default" : "secondary"}>
                          {contact.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!customer.contacts || customer.contacts.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No contacts found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Address Detail Dialog */}
      <Dialog open={!!selectedAddress} onOpenChange={() => setSelectedAddress(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <span>{selectedAddress?.addressType}</span>
              </DialogTitle>
              <Badge variant={selectedAddress?.status === "Active" ? "default" : "secondary"} className="ml-auto mr-8">
                {selectedAddress?.status}
              </Badge>
            </div>
          </DialogHeader>
          {selectedAddress && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address Type</p>
                  <p className="text-sm font-medium">{selectedAddress.addressType}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                  <p className="text-sm font-medium">{selectedAddress.status}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</p>
                <p className="text-sm font-medium">{selectedAddress.address}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                  <p className="text-sm font-medium">{selectedAddress.phone}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fax</p>
                  <p className="text-sm font-medium">{selectedAddress.fax || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Postal Code</p>
                  <p className="text-sm font-medium">{selectedAddress.postalCode?.toString() || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">City</p>
                  <p className="text-sm font-medium">{selectedAddress.city}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">State</p>
                  <p className="text-sm font-medium">{selectedAddress.state || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Country</p>
                  <p className="text-sm font-medium">{selectedAddress.country}</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEditingAddress(selectedAddress);
                    setSelectedAddress(null);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleAddressDelete(selectedAddress.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Detail Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={() => setSelectedContact(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <span>{selectedContact?.title} {selectedContact?.firstName} {selectedContact?.surname}</span>
              </DialogTitle>
              <Badge variant={selectedContact?.status === "Active" ? "default" : "secondary"} className="ml-auto mr-8">
                {selectedContact?.status}
              </Badge>
            </div>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</p>
                  <p className="text-sm font-medium">{selectedContact.title || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">First Name</p>
                  <p className="text-sm font-medium">{selectedContact.firstName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Surname</p>
                  <p className="text-sm font-medium">{selectedContact.surname}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Title</p>
                  <p className="text-sm font-medium">{selectedContact.jobTitle || "-"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Department</p>
                  <p className="text-sm font-medium">{selectedContact.department || "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                  <p className="text-sm font-medium">{selectedContact.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                  <p className="text-sm font-medium">{selectedContact.phone}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                <p className="text-sm font-medium">{selectedContact.status}</p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                {selectedContact.email && customer && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // Find original contact from customer.contacts
                      const originalContact = customer.contacts?.find(c => c.id === selectedContact.id);
                      if (originalContact) {
                        setCreateUserContact(originalContact);
                        setSelectedContact(null);
                      }
                    }}
                  >
                    <UserPlus className="h-4 w-4" />
                    Create User
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setEditingContact(selectedContact);
                    setSelectedContact(null);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleContactDelete(selectedContact.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Address Edit Dialog */}
      <AddressEditDialog
        open={!!editingAddress}
        onOpenChange={(open) => !open && setEditingAddress(null)}
        address={editingAddress}
        onSave={handleAddressSave}
        isSubmitting={isAddressSaving}
      />

      {/* Contact Edit Dialog */}
      <ContactEditDialog
        open={!!editingContact}
        onOpenChange={(open) => !open && setEditingContact(null)}
        contact={editingContact}
        addresses={customer.addresses || []}
        onSave={handleContactSave}
        isSubmitting={isContactSaving}
      />

      {/* Create User From Contact Dialog */}
      {createUserContact && customer && (
        <CreateUserFromContactDialog
          open={!!createUserContact}
          onOpenChange={(open) => !open && setCreateUserContact(null)}
          contact={{
            id: createUserContact.id,
            first_name: createUserContact.first_name,
            surname: createUserContact.surname,
            email: createUserContact.email,
            customer_id: customer.id,
            customer: {
              id: customer.id,
              name: customer.customer_name,
            },
          }}
          onSuccess={() => {
            setCreateUserContact(null);
            toast.success('User created successfully. Welcome email has been sent.');
          }}
        />
      )}
    </div>
  );
}
