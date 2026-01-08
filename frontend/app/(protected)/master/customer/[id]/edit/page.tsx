'use client';

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  X,
  Building2,
  Loader2,
} from "lucide-react";
import { FileUpload } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { customerService, Customer } from "@/services/customerService";
import { toast } from "sonner";

// Schema for Customer form (only customer info)
const customerEditSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be less than 20 characters"),
  customerName: z.string().min(1, "Customer Name is required").max(100, "Customer Name must be less than 100 characters"),
  businessLine: z.string().min(1, "Business Line is required"),
  isWhitelist: z.boolean(),
  termOfPayment: z.number().min(0, "Term of Payment must be positive").optional(),
  npwpNumber: z.string().max(20, "NPWP Number must be less than 20 characters").optional(),
  centralCustomerId: z.string().max(50, "Central Customer ID must be less than 50 characters").optional(),
  salesIncharge: z.string().max(100, "Sales Incharge must be less than 100 characters").optional(),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

type CustomerEditFormData = z.infer<typeof customerEditSchema>;

export default function CustomerEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [legalDocument, setLegalDocument] = useState<File | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerEditFormData>({
    resolver: zodResolver(customerEditSchema),
    defaultValues: {
      code: "",
      customerName: "",
      businessLine: "",
      isWhitelist: false,
      termOfPayment: 0,
      npwpNumber: "",
      centralCustomerId: "",
      salesIncharge: "",
      email: "",
    },
  });

  const fetchCustomer = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await customerService.getById(id);
      setCustomer(response.data);

      // Populate form with fetched data
      form.reset({
        code: response.data.code,
        customerName: response.data.customer_name,
        businessLine: response.data.business,
        isWhitelist: response.data.special_customer === 1,
        termOfPayment: response.data.top || 0,
        npwpNumber: response.data.npwp || "",
        centralCustomerId: response.data.central_cust_id || "",
        salesIncharge: response.data.sales_incharge || "",
        email: response.data.email || "",
      });
    } catch (error: any) {
      console.error('Error fetching customer:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch customer');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  useEffect(() => {
    fetchCustomer();
  }, [fetchCustomer]);

  const handleFileChange = (file: File | null) => {
    setLegalDocument(file);
  };

  const onSubmit = async (data: CustomerEditFormData) => {
    try {
      setIsSubmitting(true);

      // Map form data to backend format
      const payload = {
        code: data.code,
        customer_name: data.customerName,
        business: data.businessLine,
        special_customer: data.isWhitelist,
        top: data.termOfPayment || 0,
        npwp: data.npwpNumber || null,
        central_cust_id: data.centralCustomerId || null,
        sales_incharge: data.salesIncharge || null,
        email: data.email,
      };

      await customerService.update(id, payload);
      toast.success("Customer updated successfully");
      router.push(`/master/customer/${id}`);
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error(error.response?.data?.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/master/customer/${id}`)}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Edit Customer</h1>
            <p className="text-sm text-muted-foreground mt-1">Update customer information</p>
          </div>
        </div>

        {/* Customer Info Section */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                Customer Information
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/master/customer/${id}`)}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" size="sm" className="gap-2" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <FormField
                control={form.control}
                name="isWhitelist"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Customer Category
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center space-x-2 h-10">
                        <Checkbox
                          id="whitelist"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                        <label htmlFor="whitelist" className="text-sm font-normal cursor-pointer">
                          Whitelist
                        </label>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="termOfPayment"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Term of Payment (Days)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value ?? ""}
                        className="h-10 bg-muted/30 hover:bg-muted/50 focus:bg-background transition-colors border-muted"
                      />
                    </FormControl>
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
              {!legalDocument && customer.legal_document && (
                <p className="text-xs text-muted-foreground mt-2">
                  Current: {customer.legal_document}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
