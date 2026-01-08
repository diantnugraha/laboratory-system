'use client';

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Building2, Mail, Phone, Briefcase, Factory, Badge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge as BadgeComponent } from "@/components/ui/badge";
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
import { customers } from "@/data/masterData";
import { toast } from "sonner";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const customer = customers.find((c) => c.id === id);

  const handleDelete = () => {
    toast.success("Customer deleted successfully");
    router.push("/master/customer");
  };

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
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
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">Customer</h1>
              <BadgeComponent 
                variant={customer.status === "Contract" ? "default" : "secondary"}
                className="animate-fade-in"
              >
                {customer.status}
              </BadgeComponent>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Code: {customer.code}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/master/customer/${id}/edit`)}
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
                  customer "{customer.code}".
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

      {/* Customer Information Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            Customer Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Badge className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</p>
              </div>
              <p className="text-sm font-semibold text-foreground pl-7">{customer.code}</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
              </div>
              <p className="text-sm font-semibold text-foreground pl-7">{customer.name}</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Line</p>
              </div>
              <p className="text-sm font-semibold text-foreground pl-7">{customer.businessLine}</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Factory className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Industry</p>
              </div>
              <p className="text-sm font-semibold text-foreground pl-7">{customer.industry}</p>
            </div>

            <div className="space-y-1.5 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 group">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Mail className="h-3.5 w-3.5 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
              </div>
              <a 
                href={`mailto:${customer.email}`} 
                className="text-sm font-semibold text-primary hover:underline pl-7 block"
              >
                {customer.email}
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
                href={`tel:${customer.phone}`} 
                className="text-sm font-semibold text-primary hover:underline pl-7 block"
              >
                {customer.phone}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








