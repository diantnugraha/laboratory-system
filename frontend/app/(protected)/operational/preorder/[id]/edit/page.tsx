'use client';

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Save,
  FileText,
  User,
  Loader2,
  Search,
  Calendar as CalendarIcon,
  Package,
  X,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUpload } from "@/components/ui/file-upload";
import { Calendar } from "@/components/ui/calendar";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { preorderService, PreOrderFormData, PreOrder } from "@/services/preorderService";
import { Contact } from "@/services/customerService";
import { useCustomerStore } from "@/store/customerStore";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Form Schema
const preorderFormSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  contactId: z.coerce.number().min(1, "Contact is required"),
  submitedBy: z.string().min(1, "Submitted by is required"),
  receivedDate: z.date().optional(),
  delivery: z.string().optional(),
  receiptNumber: z.string().optional(),
  priority: z.string().default("normal"),
  lab: z.coerce.number().min(1, "Laboratory is required"),
  sampleQuantity: z.coerce.number().min(1, "Sample quantity must be at least 1").default(1),
  characteristic: z.coerce.number().optional(),
  document: z.instanceof(File).optional().nullable().refine(
    (file) => !file || file.size <= MAX_FILE_SIZE,
    "File size must be less than 10MB"
  ),
  coveringLetter: z.boolean().default(false),
  testingParameters: z.boolean().default(false),
  allSampleSubcontracted: z.boolean().default(false),
  subconId: z.coerce.number().optional(),
  subconDue: z.date().optional(),
  remarks: z.string().optional(),
  notesCustomer: z.string().optional(),
});

type FormData = z.infer<typeof preorderFormSchema>;

const deliveryOptions = [
  "Delivered By Customer",
  "Pick Up By TUV Nord Indonesia",
  "Delivery Service",
];

const priorityOptions = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "very-urgent", label: "Very Urgent" },
  { value: "special-request", label: "Special Request" },
];

const labOptions = [
  { value: 1, label: "CTS Laboratory" },
  { value: 2, label: "NCTS Laboratory" },
];

const characteristicOptions = [
  { value: 1, label: "Perishable" },
  { value: 2, label: "Not Perishable" },
];

export default function PreOrderEditPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preorder, setPreorder] = useState<PreOrder | null>(null);

  // Existing document state (URL from backend)
  const [existingDocument, setExistingDocument] = useState<string | null>(null);

  // Customer/Contact state from Zustand store
  const {
    searchQuery,
    searchResults,
    isSearching,
    popoverOpen,
    selectedCustomer,
    selectedContact,
    contacts,
    loadingDetails,
    setSearchQuery,
    setPopoverOpen,
    searchCustomers,
    selectCustomer,
    selectContact,
    loadCustomerWithContact,
    reset: resetCustomerStore,
  } = useCustomerStore();

  const form = useForm<FormData>({
    resolver: zodResolver(preorderFormSchema),
    defaultValues: {
      customerId: 0,
      contactId: 0,
      submitedBy: "",
      delivery: "",
      receiptNumber: "",
      priority: "normal",
      lab: 1,
      sampleQuantity: 1,
      characteristic: undefined,
      document: null,
      coveringLetter: false,
      testingParameters: false,
      allSampleSubcontracted: false,
      remarks: "",
      notesCustomer: "",
    },
  });

  const allSampleSubcontracted = form.watch("allSampleSubcontracted");

  // Fetch preorder data
  useEffect(() => {
    const loadPreorderData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);

        // Get fresh store functions using getState() to avoid stale closures
        const store = useCustomerStore.getState();
        store.reset();

        const response = await preorderService.getById(id);
        const data = response.data;
        setPreorder(data);

        // Save existing document URL if present
        if (data.document && data.document !== "0" && data.document !== "1") {
          setExistingDocument(data.document);
        }

        // API returns camelCase, so use camelCase property names
        // Support both camelCase (actual API) and snake_case (interface definition) for safety
        const customerId = (data as any).customerId || data.customer_id || 0;
        const contactId = (data as any).contactId || data.contact_id || 0;

        // Load customer and contact into Zustand store FIRST
        if (data.customer && customerId > 0) {
          const currentContact = data.contact ? {
            id: data.contact.id,
            title: '',
            first_name: data.contact.first_name,
            middle_name: data.contact.middle_name,
            surname: data.contact.surname,
            username: '',
            job_title: null,
            department: data.contact.department,
            email: data.contact.email,
            phone: data.contact.phone,
            fax: null,
            mobile_phone: null,
            status: 'active',
          } as Contact : null;

          // Use getState() to get fresh function reference
          await useCustomerStore.getState().loadCustomerWithContact(data.customer.id, currentContact);
        }

        // Set ALL form values AFTER store is loaded
        // Support both camelCase (actual API) and snake_case (interface) for safety
        const apiData = data as any;
        form.setValue('customerId', customerId, { shouldValidate: true });
        form.setValue('contactId', contactId, { shouldValidate: true });
        form.setValue('submitedBy', apiData.submitedBy || data.submited_by || "", { shouldValidate: true });
        form.setValue('receivedDate', (apiData.receivedDate || data.received_date) ? parseISO(apiData.receivedDate || data.received_date) : undefined);
        form.setValue('delivery', data.delivery || "");
        form.setValue('receiptNumber', apiData.receiptNumber || data.receipt_number || "");
        form.setValue('priority', data.priority || "normal");
        form.setValue('lab', data.lab || 1);
        form.setValue('sampleQuantity', apiData.sampleQuantity || data.sample_quantity || 1);
        form.setValue('characteristic', data.characteristic || undefined);
        form.setValue('coveringLetter', (apiData.coveringLetter || data.covering_letter) === "1" || (apiData.coveringLetter || data.covering_letter) === "true");
        form.setValue('testingParameters', (apiData.testingParameters || data.testing_parameters) === "1" || (apiData.testingParameters || data.testing_parameters) === "true");
        form.setValue('allSampleSubcontracted', data.subcon === 1);
        form.setValue('subconId', apiData.subconId || data.subcon_id || undefined);
        form.setValue('subconDue', (apiData.subconDue || data.subcon_due) ? parseISO(apiData.subconDue || data.subcon_due) : undefined);
        form.setValue('remarks', data.remarks || "");
        form.setValue('notesCustomer', apiData.notesCustomer || data.notes_customer || "");

      } catch (error) {
        toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('pre order')));
        router.push('/operational/preorder');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreorderData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Debounced customer search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchCustomers]);

  // Clear subcontractor fields when checkbox is unchecked
  useEffect(() => {
    if (!allSampleSubcontracted) {
      form.setValue("subconId", undefined);
      form.setValue("subconDue", undefined);
    }
  }, [allSampleSubcontracted, form]);

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);

      // Use FormData if there's a file to upload
      if (data.document instanceof File) {
        const formDataObj = new globalThis.FormData();
        formDataObj.append('customer_id', String(data.customerId));
        formDataObj.append('contact_id', String(data.contactId));
        formDataObj.append('submited_by', data.submitedBy);
        if (data.receivedDate) formDataObj.append('received_date', format(data.receivedDate, 'yyyy-MM-dd'));
        if (data.delivery) formDataObj.append('delivery', data.delivery);
        if (data.receiptNumber) formDataObj.append('receipt_number', data.receiptNumber);
        if (data.priority) formDataObj.append('priority', data.priority);
        formDataObj.append('lab', String(data.lab));
        formDataObj.append('sample_quantity', String(data.sampleQuantity));
        if (data.characteristic) formDataObj.append('characteristic', String(data.characteristic));
        formDataObj.append('document', data.document);
        formDataObj.append('covering_letter', data.coveringLetter ? "1" : "0");
        formDataObj.append('testing_parameters', data.testingParameters ? "1" : "0");
        formDataObj.append('subcon', data.allSampleSubcontracted ? "1" : "0");
        if (data.allSampleSubcontracted && data.subconId) formDataObj.append('subcon_id', String(data.subconId));
        if (data.allSampleSubcontracted && data.subconDue) formDataObj.append('subcon_due', format(data.subconDue, 'yyyy-MM-dd'));
        if (data.remarks) formDataObj.append('remarks', data.remarks);
        if (data.notesCustomer) formDataObj.append('notes_customer', data.notesCustomer);

        await preorderService.updateWithFile(id, formDataObj);
      } else {
        const formData: Partial<PreOrderFormData> = {
          customer_id: data.customerId,
          contact_id: data.contactId,
          submited_by: data.submitedBy,
          received_date: data.receivedDate ? format(data.receivedDate, 'yyyy-MM-dd') : null,
          delivery: data.delivery || null,
          receipt_number: data.receiptNumber || null,
          priority: data.priority || null,
          lab: data.lab,
          sample_quantity: data.sampleQuantity,
          characteristic: data.characteristic || null,
          covering_letter: data.coveringLetter ? "1" : "0",
          testing_parameters: data.testingParameters ? "1" : "0",
          subcon: data.allSampleSubcontracted ? 1 : 0,
          subcon_id: data.allSampleSubcontracted ? data.subconId : null,
          subcon_due: data.allSampleSubcontracted && data.subconDue ? format(data.subconDue, 'yyyy-MM-dd') : null,
          remarks: data.remarks || null,
          notes_customer: data.notesCustomer || null,
        };

        await preorderService.update(id, formData);
      }

      toast.success("Pre Order updated successfully");
      router.push(`/operational/preorder/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.UPDATE('pre order')));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!preorder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">Pre Order not found</p>
        <Button variant="outline" onClick={() => router.push('/operational/preorder')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Pre Orders
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/operational/preorder/${id}`)}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Edit Pre Order</h1>
              <p className="text-sm text-muted-foreground mt-1">{preorder.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/operational/preorder/${id}`)}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>

        {/* Customer Information Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Customer Search */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Customer <span className="text-destructive">*</span>
                    </FormLabel>
                    <Popover
                      open={popoverOpen}
                      onOpenChange={(open) => {
                        setPopoverOpen(open);
                        if (!open) setSearchQuery("");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between h-10 bg-muted/30 hover:bg-muted/50 border-muted font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {selectedCustomer
                              ? `${selectedCustomer.code} - ${selectedCustomer.customer_name}`
                              : "Search customer..."}
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
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                          <CommandList className="max-h-48">
                            {isSearching ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              </div>
                            ) : searchQuery.length < 2 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
                              </div>
                            ) : searchResults.length === 0 ? (
                              <CommandEmpty>No customer found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {searchResults.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={String(customer.id)}
                                    onSelect={() => selectCustomer(customer, form.setValue)}
                                    className="cursor-pointer"
                                  >
                                    {customer.code} - {customer.customer_name}
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

              {/* Contact */}
              <FormField
                control={form.control}
                name="contactId"
                render={() => {
                  // Get display name from selectedContact state (Zustand store)
                  const displayName = selectedContact
                    ? [selectedContact.first_name, selectedContact.middle_name, selectedContact.surname].filter(Boolean).join(' ')
                    : null;

                  return (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Contact <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select
                        value={selectedContact ? String(selectedContact.id) : ''}
                        onValueChange={(val) => {
                          const contactId = parseInt(val);
                          const contact = contacts.find(c => c.id === contactId);
                          if (contact) {
                            selectContact(contact, form.setValue);
                          }
                        }}
                        disabled={!selectedCustomer || loadingDetails}
                      >
                        <FormControl>
                          <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                            <span className={cn(
                              "truncate",
                              !displayName && "text-muted-foreground"
                            )}>
                              {displayName || (
                                loadingDetails
                                  ? "Loading contacts..."
                                  : selectedCustomer
                                    ? "Select contact"
                                    : "Select customer first"
                              )}
                            </span>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {contacts.map((contact) => {
                            const fullName = [contact.first_name, contact.middle_name, contact.surname]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <SelectItem key={contact.id} value={String(contact.id)}>
                                {fullName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Submitted By */}
              <FormField
                control={form.control}
                name="submitedBy"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Submitted By <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter name"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pre Order Details Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Pre Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Delivery */}
              <FormField
                control={form.control}
                name="delivery"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Delivery
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder="Select delivery method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {deliveryOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Receipt Number */}
              <FormField
                control={form.control}
                name="receiptNumber"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Receipt Number
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter receipt number"
                        {...field}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Received Date */}
              <FormField
                control={form.control}
                name="receivedDate"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Received Date
                    </FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full h-10 pl-3 text-left font-normal bg-muted/30 hover:bg-muted/50 border-muted",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd/MM/yyyy")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Priority */}
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Priority
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Laboratory Service */}
              <FormField
                control={form.control}
                name="lab"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Laboratory Service <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder="Select laboratory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {labOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sample Information Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              Sample Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Row 1: Sample Quantity & Characteristic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Sample Quantity */}
              <FormField
                control={form.control}
                name="sampleQuantity"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sample Quantity <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Characteristic */}
              <FormField
                control={form.control}
                name="characteristic"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Characteristic
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder="Select characteristic" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {characteristicOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value.toString()}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Covering Letter */}
              <FormField
                control={form.control}
                name="coveringLetter"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Covering Letter
                    </FormLabel>
                    <div className="flex items-center h-10 px-3 rounded-md border border-muted bg-muted/30">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="coveringLetter"
                      />
                      <label htmlFor="coveringLetter" className="ml-2 text-sm font-normal cursor-pointer">
                        Yes
                      </label>
                    </div>
                  </FormItem>
                )}
              />

              {/* Testing Parameters */}
              <FormField
                control={form.control}
                name="testingParameters"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Testing Parameters
                    </FormLabel>
                    <div className="flex items-center h-10 px-3 rounded-md border border-muted bg-muted/30">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="testingParameters"
                      />
                      <label htmlFor="testingParameters" className="ml-2 text-sm font-normal cursor-pointer">
                        Yes
                      </label>
                    </div>
                  </FormItem>
                )}
              />

              {/* All Sample Subcontracted */}
              <FormField
                control={form.control}
                name="allSampleSubcontracted"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      All Sample Subcontracted
                    </FormLabel>
                    <div className="flex items-center h-10 px-3 rounded-md border border-muted bg-muted/30">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        id="allSampleSubcontracted"
                      />
                      <label htmlFor="allSampleSubcontracted" className="ml-2 text-sm font-normal cursor-pointer">
                        Yes
                      </label>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Conditional Subcontractor Fields */}
            {allSampleSubcontracted && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border rounded-md bg-muted/20">
                {/* Subcontractor ID */}
                <FormField
                  control={form.control}
                  name="subconId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Subcontractor
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Enter subcontractor ID"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* COA Release Due Date */}
                <FormField
                  control={form.control}
                  name="subconDue"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        COA Release Due Date
                      </FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full h-10 pl-3 text-left font-normal bg-muted/30 hover:bg-muted/50 border-muted",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Row 3: Document Upload */}
            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Document
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      {existingDocument && !field.value && (
                        <div className="flex items-center gap-2 p-3 rounded-md border border-muted bg-muted/30">
                          <Upload className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Current file: {existingDocument.split('/').pop()}
                          </span>
                          <a
                            href={existingDocument}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary hover:underline ml-auto"
                          >
                            View
                          </a>
                        </div>
                      )}
                      <FileUpload
                        value={field.value}
                        onChange={field.onChange}
                        maxSize={10}
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        placeholder={existingDocument ? "Upload new file to replace" : "Drop file here or click to browse"}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Additional Information Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Additional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Remarks */}
              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Remarks
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter remarks..."
                        className="resize-none bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes for Customer */}
              <FormField
                control={form.control}
                name="notesCustomer"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Notes for Customer
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter notes for customer..."
                        className="resize-none bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
