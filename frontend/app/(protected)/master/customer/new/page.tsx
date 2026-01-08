'use client';

import React, { useState } from "react";
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  X,
  Building2,
  MapPin,
  User,
  Plus,
  Trash2,
} from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { toast } from "sonner";

// Address Schema
const addressSchema = z.object({
  addressType: z.string().min(1, "Address Type is required"),
  address: z.string().min(1, "Address is required").max(500, "Address must be less than 500 characters"),
  phone: z.string().min(1, "Phone is required").max(20, "Phone must be less than 20 characters"),
  fax: z.string().max(20, "Fax must be less than 20 characters").optional(),
  postalCode: z.string().max(10, "Postal Code must be less than 10 characters").optional(),
  city: z.string().min(1, "City is required").max(100, "City must be less than 100 characters"),
  state: z.string().max(100, "State must be less than 100 characters").optional(),
  country: z.string().min(1, "Country is required").max(100, "Country must be less than 100 characters"),
});

// Contact Schema
const contactSchema = z.object({
  title: z.string().max(20, "Title must be less than 20 characters").optional(),
  firstName: z.string().min(1, "First Name is required").max(50, "First Name must be less than 50 characters"),
  surname: z.string().min(1, "Surname is required").max(50, "Surname must be less than 50 characters"),
  jobTitle: z.string().max(100, "Job Title must be less than 100 characters").optional(),
  department: z.string().max(100, "Department must be less than 100 characters").optional(),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  phone: z.string().min(1, "Phone is required").max(20, "Phone must be less than 20 characters"),
});

// Schema for Customer form
const customerFormSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  customerName: z.string().min(1, "Customer Name is required").max(100, "Customer Name must be less than 100 characters"),
  businessLine: z.string().min(1, "Business Line is required"),
  npwpNumber: z.string().max(20, "NPWP Number must be less than 20 characters").optional(),
  centralCustomerId: z.string().max(50, "Central Customer ID must be less than 50 characters").optional(),
  salesIncharge: z.string().max(100, "Sales Incharge must be less than 100 characters").optional(),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  addresses: z.array(addressSchema).min(1, "At least one address is required"),
  contacts: z.array(contactSchema).min(1, "At least one contact is required"),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

export default function CustomerNewPage() {
  const router = useRouter();
  const [legalDocument, setLegalDocument] = useState<File | null>(null);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      code: "",
      customerName: "",
      businessLine: "",
      npwpNumber: "",
      centralCustomerId: "",
      salesIncharge: "",
      email: "",
      addresses: [
        {
          addressType: "",
          address: "",
          phone: "",
          fax: "",
          postalCode: "",
          city: "",
          state: "",
          country: "",
        },
      ],
      contacts: [
        {
          title: "",
          firstName: "",
          surname: "",
          jobTitle: "",
          department: "",
          email: "",
          phone: "",
        },
      ],
    },
  });

  const {
    fields: addressFields,
    append: appendAddress,
    remove: removeAddress,
  } = useFieldArray({
    control: form.control,
    name: "addresses",
  });

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control: form.control,
    name: "contacts",
  });

  const handleFileChange = (file: File | null) => {
    setLegalDocument(file);
  };

  const onSubmit = (data: CustomerFormData) => {
    console.log("Form data:", { ...data, legalDocument: legalDocument?.name });
    toast.success("Customer created successfully");
    router.push("/master/customer");
  };

  const addNewAddress = () => {
    appendAddress({
      addressType: "",
      address: "",
      phone: "",
      fax: "",
      postalCode: "",
      city: "",
      state: "",
      country: "",
    });
  };

  const addNewContact = () => {
    appendContact({
      title: "",
      firstName: "",
      surname: "",
      jobTitle: "",
      department: "",
      email: "",
      phone: "",
    });
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
                onClick={() => router.push("/master/customer")}
                className="h-9 w-9 hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-semibold text-foreground">Add New Customer</h1>
                <p className="text-sm text-muted-foreground mt-1">Create a new customer record</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/master/customer")}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Save className="h-4 w-4" />
                Save Customer
              </Button>
            </div>
          </div>

          {/* Customer Info Section */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Code <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="CUS-001"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem className="space-y-2 lg:col-span-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Customer Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Customer name"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessLine"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Business Line <span className="text-destructive">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 bg-muted/30 hover:bg-muted/50 border-muted">
                            <SelectValue placeholder="Select business line" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Pharmaceutical">Pharmaceutical</SelectItem>
                          <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                          <SelectItem value="Chemical">Chemical</SelectItem>
                          <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                          <SelectItem value="Environmental">Environmental</SelectItem>
                          <SelectItem value="Oil & Gas">Oil & Gas</SelectItem>
                          <SelectItem value="Mining">Mining</SelectItem>
                          <SelectItem value="Cosmetics">Cosmetics</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <FormField
                  control={form.control}
                  name="npwpNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        NPWP Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234567890"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="centralCustomerId"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Central Customer ID
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Central ID"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salesIncharge"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Sales Incharge
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sales person name"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Email <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="email@example.com"
                          {...field}
                          className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="max-w-md">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-2">
                  Legal Document
                </label>
                <FileUpload
                  value={legalDocument}
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx"
                  maxSize={10}
                  placeholder="Drop document here or click to browse"
                />
              </div>
            </CardContent>
          </Card>

          {/* Addresses Section */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  Addresses
                  <span className="text-sm font-normal text-muted-foreground">({addressFields.length})</span>
                </CardTitle>
                <Button type="button" onClick={addNewAddress} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Address
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {addressFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Address {index + 1}
                    </h4>
                    {addressFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAddress(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Row 1: Address Type + Full Address */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name={`addresses.${index}.addressType`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Address Type <span className="text-destructive">*</span>
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 bg-background border-muted">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Head Office">Head Office</SelectItem>
                              <SelectItem value="Branch Office">Branch Office</SelectItem>
                              <SelectItem value="Warehouse">Warehouse</SelectItem>
                              <SelectItem value="Factory">Factory</SelectItem>
                              <SelectItem value="Billing">Billing</SelectItem>
                              <SelectItem value="Shipping">Shipping</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="md:col-span-3">
                      <FormField
                        control={form.control}
                        name={`addresses.${index}.address`}
                        render={({ field }) => (
                          <FormItem className="space-y-2">
                            <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Address <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Complete address"
                                {...field}
                                rows={2}
                                className="bg-background border-muted resize-none"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Row 2: Phone, Fax, Postal Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`addresses.${index}.phone`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Phone <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+62 21 1234567"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`addresses.${index}.fax`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Fax
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+62 21 1234568"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`addresses.${index}.postalCode`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Postal Code
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="12190"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 3: City, State, Country */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`addresses.${index}.city`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            City <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Jakarta"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`addresses.${index}.state`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            State
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="DKI Jakarta"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`addresses.${index}.country`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Country <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Indonesia"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Contacts Section */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  Contacts
                  <span className="text-sm font-normal text-muted-foreground">({contactFields.length})</span>
                </CardTitle>
                <Button type="button" onClick={addNewContact} variant="outline" size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Contact
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {contactFields.map((field, index) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Contact {index + 1}
                    </h4>
                    {contactFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeContact(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Row 1: Title, First Name, Surname, Job Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Title
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10 bg-background border-muted">
                                <SelectValue placeholder="Title" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Mr.">Mr.</SelectItem>
                              <SelectItem value="Mrs.">Mrs.</SelectItem>
                              <SelectItem value="Ms.">Ms.</SelectItem>
                              <SelectItem value="Dr.">Dr.</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.firstName`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            First Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="First name"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.surname`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Surname <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Surname"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.jobTitle`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Job Title
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Quality Manager"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Department, Email, Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`contacts.${index}.department`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Department
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Quality Control"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.email`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Email <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="email@example.com"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`contacts.${index}.phone`}
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Phone <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="+62 812 1234567"
                              {...field}
                              className="h-10 bg-background border-muted"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </form>
      </Form>
  );
}
