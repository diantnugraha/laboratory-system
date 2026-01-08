'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Edit, Save, Trash2, X, User, Mail, Phone, Briefcase, Building2 } from "lucide-react";
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
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { contacts } from "@/data/masterData";
import { contactSchema, ContactFormData } from "@/lib/schemas";
import { toast } from "sonner";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [isEditing, setIsEditing] = useState(false);

  const contact = contacts.find((c) => c.id === id);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      position: "",
      customer: "",
      status: "Active",
    },
  });

  useEffect(() => {
    if (isEditing && contact) {
      form.reset({
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        customer: contact.customer,
        status: contact.status as "Active" | "Inactive",
      });
    }
  }, [isEditing, contact, form]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = (data: ContactFormData) => {
    console.log("Form data:", data);
    toast.success("Contact updated successfully");
    setIsEditing(false);
  };

  const handleDelete = () => {
    toast.success("Contact deleted successfully");
    router.push("/master/contact");
  };

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Contact not found</p>
      </div>
    );
  }

  // View Mode
  if (!isEditing) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/master/contact")}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">Contact</h1>
                <Badge 
                  variant={contact.status === "Active" ? "default" : "secondary"}
                  className="animate-fade-in"
                >
                  {contact.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{contact.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-2 hover:border-primary hover:text-primary transition-colors"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    contact "{contact.name}".
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Contact Details Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
                </div>
                <p className="text-sm font-semibold text-foreground pl-7">{contact.name}</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Position</p>
                </div>
                <p className="text-sm font-semibold text-foreground pl-7">{contact.position}</p>
              </div>

              <div className="space-y-1.5 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 group">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Mail className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
                </div>
                <a 
                  href={`mailto:${contact.email}`} 
                  className="text-sm font-semibold text-primary hover:underline pl-7 block"
                >
                  {contact.email}
                </a>
              </div>

              <div className="space-y-1.5 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 group">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Phone className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</p>
                </div>
                <a 
                  href={`tel:${contact.phone}`} 
                  className="text-sm font-semibold text-primary hover:underline pl-7 block"
                >
                  {contact.phone}
                </a>
              </div>

              <div className="space-y-1.5 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group sm:col-span-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
                </div>
                <p className="text-sm font-semibold text-foreground pl-7">{contact.customer}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit Mode
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancelEdit}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">Edit Contact</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{contact.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Edit Form Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Contact name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Position</FormLabel>
                    <FormControl>
                      <Input placeholder="Position" {...field} />
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
                    <FormLabel className="text-sm font-medium">Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium">Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customer"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2">
                    <FormLabel className="text-sm font-medium">Customer</FormLabel>
                    <FormControl>
                      <Input placeholder="Customer name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2 sm:max-w-xs">
                    <FormLabel className="text-sm font-medium">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
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








