'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, FileText, Clock, Percent, Package, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { contractService, Contract } from "@/services/contractService";
import { toast } from "sonner";

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const getCleanFilename = (doc: string | null): string => {
  if (!doc) return '';
  let cleanDoc: any = doc;
  let maxIterations = 5;
  while (maxIterations-- > 0 && typeof cleanDoc === 'string' && (cleanDoc.startsWith('[') || cleanDoc.startsWith('"'))) {
    try {
      const parsed = JSON.parse(cleanDoc);
      cleanDoc = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      break;
    }
  }
  const filename = String(cleanDoc).split(/[/\\]/).pop() || cleanDoc;
  return filename.replace(/[^\w\-_.]/g, '');
};

export default function ContractDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchContract = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await contractService.getById(id);
      setContract(response.data);
    } catch (error: any) {
      console.error('Error fetching contract:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch contract');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContract();
  }, [fetchContract]);

  const handleDelete = async () => {
    try {
      await contractService.delete(id);
      toast.success("Contract deleted successfully");
      router.push("/master/contract");
    } catch (error: any) {
      console.error('Error deleting contract:', error);
      toast.error(error.response?.data?.message || 'Failed to delete contract');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Contract not found</p>
      </div>
    );
  }

  const serviceDetails = contract.details?.filter(d => d.serviceId) || [];
  const packageDetails = contract.details?.filter(d => d.packageId) || [];

  // Calculate totals
  const serviceTotalPrice = serviceDetails.reduce((sum, d) => sum + (d.service?.price || 0), 0);
  const packageTotalPrice = packageDetails.reduce((sum, d) => sum + (d.package?.totalPrice || 0), 0);
  const grandTotal = serviceTotalPrice + packageTotalPrice;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/master/contract")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{contract.code}</h1>
            <Badge variant={contract.statusService === "ALL" ? "default" : "secondary"}>
              {contract.statusService}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/master/contract/${id}/edit`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Contract</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this contract? This action cannot be undone.
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

      {/* Basic Info */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Contract Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Code
              </p>
              <p className="text-sm font-medium">{contract.code}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer
              </p>
              <p className="text-sm font-medium">{contract.customer?.customer_name || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer Code
              </p>
              <p className="text-sm font-medium">{contract.customer?.code || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Period
              </p>
              <p className="text-sm font-medium">{contract.period}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Period From
              </p>
              <p className="text-sm font-medium">{formatDate(contract.periodFrom)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Period To
              </p>
              <p className="text-sm font-medium">{formatDate(contract.periodTo)}</p>
            </div>
            {contract.periodAlias && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Period Alias
                </p>
                <p className="text-sm font-medium">{contract.periodAlias}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Service Mode
              </p>
              <Badge variant={contract.statusService === "ALL" ? "default" : "secondary"}>
                {contract.statusService}
              </Badge>
            </div>
          </div>
          {contract.remarks && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Remarks
              </p>
              <p className="text-sm font-medium">{contract.remarks}</p>
            </div>
          )}
          {contract.documents && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contract Document
              </p>
              <p className="text-sm font-medium">{getCleanFilename(contract.documents)}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lead Time */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            Lead Time (Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Normal
              </p>
              <p className="text-sm font-medium">{contract.normalDay} days</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Urgent
              </p>
              <p className="text-sm font-medium">{contract.urgentDay} days</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Very Urgent
              </p>
              <p className="text-sm font-medium">{contract.veryUrgentDay} days</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Percent className="h-4 w-4 text-primary" />
            </div>
            Pricing & Discounts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Base Discount
              </p>
              <p className="text-sm font-medium">{contract.discount || 0}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Urgent Charge
              </p>
              <p className="text-sm font-medium">{contract.discountUrgent || 50}%</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Very Urgent Charge
              </p>
              <p className="text-sm font-medium">{contract.discountVeryUrgent || 100}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Table */}
      {serviceDetails.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              Services ({serviceDetails.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Service Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount (%)</TableHead>
                  <TableHead className="text-right">Urgent (%)</TableHead>
                  <TableHead className="text-right">V.Urgent (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-medium">{detail.service?.code || '-'}</TableCell>
                    <TableCell><span dangerouslySetInnerHTML={{ __html: detail.service?.name || '-' }} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(detail.service?.price || 0)}</TableCell>
                    <TableCell className="text-right">{detail.discountNormal}%</TableCell>
                    <TableCell className="text-right">{detail.discountUrgent}%</TableCell>
                    <TableCell className="text-right">{detail.discountVeryUrgent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Packages Table */}
      {packageDetails.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              Packages ({packageDetails.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package Name</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount (%)</TableHead>
                  <TableHead className="text-right">Urgent (%)</TableHead>
                  <TableHead className="text-right">V.Urgent (%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packageDetails.map((detail) => (
                  <TableRow key={detail.id}>
                    <TableCell className="font-medium"><span dangerouslySetInnerHTML={{ __html: detail.package?.name || '-' }} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(detail.package?.totalPrice || 0)}</TableCell>
                    <TableCell className="text-right">{detail.discountNormal}%</TableCell>
                    <TableCell className="text-right">{detail.discountUrgent}%</TableCell>
                    <TableCell className="text-right">{detail.discountVeryUrgent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Grand Total - show when there are services or packages */}
      {(serviceDetails.length > 0 || packageDetails.length > 0) && (
        <Card className="overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-2">
              {serviceDetails.length > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Services Total ({serviceDetails.length} items)</span>
                  <span className="font-medium">{formatCurrency(serviceTotalPrice)}</span>
                </div>
              )}
              {packageDetails.length > 0 && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Packages Total ({packageDetails.length} items)</span>
                  <span className="font-medium">{formatCurrency(packageTotalPrice)}</span>
                </div>
              )}
              <div className="border-t pt-2 mt-2 flex justify-between items-center">
                <span className="font-semibold">Grand Total</span>
                <span className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State for Services/Packages - only show when SELECTED mode but no items */}
      {contract.statusService === "SELECTED" && serviceDetails.length === 0 && packageDetails.length === 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              Services & Packages
            </CardTitle>
          </CardHeader>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No Services or Packages</p>
              <p className="text-sm mt-1">
                No specific services or packages have been added to this contract.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
