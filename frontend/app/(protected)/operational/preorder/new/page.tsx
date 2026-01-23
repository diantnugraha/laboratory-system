'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { preorderService, PreOrderFormData } from "@/services/preorderService";
import { customerService, Contact } from "@/services/customerService";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

// Form Schema
const preorderFormSchema = z.object({
  customerId: z.coerce.number().min(1, "Customer is required"),
  contactId: z.coerce.number().min(1, "Contact is required"),
  submitedBy: z.string().min(1, "Submitted by is required"),
  receivedDate: z.date().optional(),
  delivery: z.string().optional(),
  priority: z.string().default("normal"),
  lab: z.coerce.number().min(1, "Laboratory is required"),
  sampleQuantity: z.coerce.number().min(1, "Sample quantity must be at least 1").default(1),
  coveringLetter: z.boolean().default(false),
  testingParameters: z.boolean().default(false),
  allSampleSubcontracted: z.boolean().default(false),
  subconId: z.coerce.number().optional(),
  subconDue: z.date().optional(),
  remarks: z.string().optional(),
  notesCustomer: z.string().optional(),
});

type FormData = z.infer<typeof preorderFormSchema>;

interface CustomerOption {
  id: number;
  code: string;
  customer_name: string;
  contacts: Contact[];
}

const deliveryOptions = [
  "Delivered By Customer",
  "Pick Up By TUV Nord Indonesia",
  "Delivery Service",
];

const priorityOptions = [
  { value: "normal", label: "Normal" },
  { value: "urgent", label: "Urgent" },
  { value: "very urgent", label: "Very Urgent" },
  { value: "special request", label: "Special Request" },
];

const labOptions = [
  { value: 1, label: "CTS Laboratory" },
  { value: 2, label: "NCTS Laboratory" },
];

export default function PreOrderNewPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string>("");

  // Customer search state
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);
  const [isCustomerSearching, setIsCustomerSearching] = useState(false);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [loadingCustomerDetails, setLoadingCustomerDetails] = useState(false);

  // Contact state
  const [contacts, setContacts] = useState<Contact[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(preorderFormSchema),
    defaultValues: {
      customerId: 0,
      contactId: 0,
      submitedBy: "",
      delivery: "",
      priority: "normal",
      lab: 1,
      sampleQuantity: 1,
      coveringLetter: false,
      testingParameters: false,
      allSampleSubcontracted: false,
      remarks: "",
      notesCustomer: "",
    },
  });

  const allSampleSubcontracted = form.watch("allSampleSubcontracted");
  const selectedLab = form.watch("lab");
  const customerId = form.watch("customerId");

  // Generate code on mount
  useEffect(() => {
    const generateCode = async () => {
      try {
        const response = await preorderService.generateCode(selectedLab);
        if (response.success) {
          setGeneratedCode(response.data.code);
        }
      } catch (error) {
        console.error("Failed to generate code:", error);
      }
    };
    generateCode();
  }, [selectedLab]);

  // Customer search
  const searchCustomers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setCustomerSearchResults([]);
      return;
    }

    setIsCustomerSearching(true);
    try {
      const response = await customerService.getJson({ q: query });
      const items = response.items || response.data || [];
      setCustomerSearchResults(items as CustomerOption[]);
    } catch (error) {
      console.error("Failed to search customers:", error);
      setCustomerSearchResults([]);
    } finally {
      setIsCustomerSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      searchCustomers(customerSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearchQuery, searchCustomers]);

  // Fetch full customer data when selected
  const fetchFullCustomerData = useCallback(async (customerId: number) => {
    setLoadingCustomerDetails(true);
    try {
      const response = await customerService.getById(customerId);
      if (response.success && response.data) {
        const fullCustomer: CustomerOption = {
          id: response.data.id,
          code: response.data.code,
          customer_name: response.data.customer_name,
          contacts: response.data.contacts || [],
        };
        setSelectedCustomer(fullCustomer);
        setContacts(response.data.contacts || []);
      }
    } catch (error) {
      console.error('Error fetching full customer data:', error);
      toast.error('Failed to load customer contacts');
    } finally {
      setLoadingCustomerDetails(false);
    }
  }, []);

  // Handle customer selection
  const handleCustomerSelect = async (customer: CustomerOption) => {
    form.setValue("customerId", customer.id);
    form.setValue("contactId", 0);
    setCustomerPopoverOpen(false);
    setCustomerSearchQuery("");
    await fetchFullCustomerData(customer.id);
  };

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

      const formData: PreOrderFormData = {
        customer_id: data.customerId,
        contact_id: data.contactId,
        submited_by: data.submitedBy,
        received_date: data.receivedDate ? format(data.receivedDate, 'yyyy-MM-dd') : null,
        delivery: data.delivery || null,
        priority: data.priority || null,
        lab: data.lab,
        sample_quantity: data.sampleQuantity,
        covering_letter: data.coveringLetter ? "1" : "0",
        testing_parameters: data.testingParameters ? "1" : "0",
        subcon: data.allSampleSubcontracted ? 1 : 0,
        subcon_id: data.allSampleSubcontracted ? data.subconId : null,
        subcon_due: data.allSampleSubcontracted && data.subconDue ? format(data.subconDue, 'yyyy-MM-dd') : null,
        remarks: data.remarks || null,
        notes_customer: data.notesCustomer || null,
      };

      const response = await preorderService.create(formData);
      toast.success("Pre Order created successfully");
      router.push(`/operational/preorder/${response.data.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.CREATE('pre order')));
    } finally {
      setIsSubmitting(false);
    }
  };

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
              onClick={() => router.push("/operational/preorder")}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">New Pre Order</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {generatedCode || 'Loading code...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/operational/preorder")}
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
              {isSubmitting ? "Saving..." : "Save Pre Order"}
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
                      open={customerPopoverOpen}
                      onOpenChange={(open) => {
                        setCustomerPopoverOpen(open);
                        if (!open) setCustomerSearchQuery("");
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
                              value={customerSearchQuery}
                              onChange={(e) => setCustomerSearchQuery(e.target.value)}
                              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                            />
                          </div>
                          <CommandList className="max-h-48">
                            {isCustomerSearching ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                              </div>
                            ) : customerSearchQuery.length < 2 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Type at least 2 characters to search
                              </div>
                            ) : customerSearchResults.length === 0 ? (
                              <CommandEmpty>No customer found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {customerSearchResults.map((customer) => (
                                  <CommandItem
                                    key={customer.id}
                                    value={String(customer.id)}
                                    onSelect={() => handleCustomerSelect(customer)}
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
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Contact <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={String(field.value || '')}
                      onValueChange={(val) => field.onChange(parseInt(val))}
                      disabled={!customerId || loadingCustomerDetails}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                          <SelectValue placeholder={
                            loadingCustomerDetails
                              ? "Loading contacts..."
                              : customerId
                                ? "Select contact"
                                : "Select customer first"
                          } />
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
                )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
