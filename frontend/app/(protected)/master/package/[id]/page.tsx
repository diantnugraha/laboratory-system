'use client';

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Package, DollarSign, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { toast } from "sonner";
import { packages, services, customers } from "@/data/masterData";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

export default function PackageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const pkg = packages.find((p) => p.id === id);

  const handleDelete = () => {
    toast.success("Package deleted successfully");
    router.push("/master/package");
  };

  if (!pkg) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Package not found</p>
      </div>
    );
  }

  // Mock customer and services
  const customer = customers[0];
  const mockServices = services.slice(0, pkg.services);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/master/package")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Package Detail</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {pkg.code} - {pkg.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/master/package/${id}/edit`)}
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
                  package "{pkg.code}" and remove all its services.
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

      {/* Package Information Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Package className="h-4 w-4 text-primary" />
            </div>
            Package Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name Package</label>
              <Input value={pkg.name} disabled className="h-10 bg-muted/50 border-muted" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</label>
              <Input
                value={customer ? `${customer.code} - ${customer.name}` : "-"}
                disabled
                className="h-10 bg-muted/50 border-muted"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
              <Textarea
                value={`Description for ${pkg.name}`}
                disabled
                rows={3}
                className="bg-muted/50 border-muted resize-none"
              />
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors border border-primary/20 inline-flex items-center gap-4">
            <div className="p-2 rounded-md bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Price</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(pkg.price)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Section */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ListChecks className="h-4 w-4 text-primary" />
            </div>
            Services
            <span className="text-sm font-normal text-muted-foreground">
              ({mockServices.length} items)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="w-14 text-center font-semibold">No</TableHead>
                  <TableHead className="w-28 font-semibold">Code</TableHead>
                  <TableHead className="font-semibold">Name</TableHead>
                  <TableHead className="w-32 font-semibold">Parameter</TableHead>
                  <TableHead className="w-36 text-right font-semibold">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground py-8">
                        <p>No services in this package</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  mockServices.map((service, index) => (
                    <TableRow key={service.id} className="border-b hover:bg-muted/50 transition-colors">
                      <TableCell className="text-center px-2 py-3 font-medium text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-semibold px-2 py-3 text-primary">{service.code}</TableCell>
                      <TableCell className="px-2 py-3">{service.name}</TableCell>
                      <TableCell className="px-2 py-3 text-muted-foreground">{service.parameter}</TableCell>
                      <TableCell className="text-right px-2 py-3 font-medium">{formatCurrency(service.price)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary Footer */}
          <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Services</p>
                  <p className="text-lg font-semibold">{mockServices.length}</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Price</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(pkg.price)}</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}








