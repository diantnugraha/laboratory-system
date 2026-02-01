'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  User,
  Calendar,
  Package,
  Check,
  X,
  Loader2,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PRIORITY_COLORS, PRIORITY_LABELS } from "@/lib/constants/priority";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { preorderService, PreOrder } from "@/services/preorderService";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const getLabLabel = (lab: number) => {
  switch (lab) {
    case 1:
      return "CTS Laboratory";
    case 2:
      return "NCTS Laboratory";
    default:
      return "-";
  }
};

const getCharacteristicLabel = (characteristic: number | null) => {
  switch (characteristic) {
    case 1:
      return "Perishable";
    case 2:
      return "Not Perishable";
    default:
      return "-";
  }
};

const getContactFullName = (contact: PreOrder['contact']) => {
  if (!contact) return '-';
  const parts = [contact.first_name, contact.surname].filter(Boolean);
  return parts.join(' ') || '-';
};

export default function PreOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [preorder, setPreorder] = useState<PreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchPreorder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await preorderService.getById(id);
      setPreorder(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('pre order')));
      router.push('/operational/preorder');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchPreorder();
  }, [fetchPreorder]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await preorderService.delete(id);
      toast.success('Pre Order deleted successfully');
      router.push('/operational/preorder');
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('pre order')));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!preorder) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Pre Order not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/operational/preorder')}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{preorder.code}</h1>
          </div>
        </div>
        {/* Actions Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              Actions
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/operational/preorder/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {!(preorder.orderId && preorder.orderId > 0) && (
              <DropdownMenuItem onClick={() => router.push(`/operational/order/new?preorderId=${preorder.id}`)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Order
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="text-destructive focus:text-destructive"
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Pre Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this pre order? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pre Order Information */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Pre Order Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Code
              </p>
              <p className="text-sm font-medium">{preorder.code}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Received Date
              </p>
              <p className="text-sm font-medium">{formatDate(preorder.receivedDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Priority
              </p>
              <StatusBadge
                status={preorder.priority?.toLowerCase() || 'normal'}
                colorMap={PRIORITY_COLORS}
                labelMap={PRIORITY_LABELS}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Laboratory Service
              </p>
              <p className="text-sm font-medium">{getLabLabel(preorder.lab)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Submitted By
              </p>
              <p className="text-sm font-medium">{preorder.submitedBy || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Delivery
              </p>
              <p className="text-sm font-medium">{preorder.delivery || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Receipt Number
              </p>
              <p className="text-sm font-medium">{preorder.receiptNumber || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Information */}
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
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer
              </p>
              <p className="text-sm font-medium">
                {preorder.customer ? (
                  <Link href={`/master/customer/${preorder.customer.id}`} className="text-primary hover:underline">
                    {preorder.customer.customer_name}
                  </Link>
                ) : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer Code
              </p>
              <p className="text-sm font-medium">{preorder.customer?.code || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contact Person
              </p>
              <p className="text-sm font-medium">{getContactFullName(preorder.contact)}</p>
            </div>
            {preorder.contact?.email && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm font-medium">{preorder.contact.email}</p>
              </div>
            )}
            {preorder.contact?.phone && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-sm font-medium">{preorder.contact.phone}</p>
              </div>
            )}
            {preorder.contact?.department && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Department
                </p>
                <p className="text-sm font-medium">{preorder.contact.department}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sample Information */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Sample Quantity
              </p>
              <p className="text-sm font-medium">{preorder.sampleQuantity}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Characteristic
              </p>
              <p className="text-sm font-medium">{getCharacteristicLabel(preorder.characteristic)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Document
              </p>
              <div className="flex items-center gap-2">
                {preorder.document === '1' || preorder.document === 'true' ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Yes</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">No</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Covering Letter
              </p>
              <div className="flex items-center gap-2">
                {preorder.coveringLetter === '1' || preorder.coveringLetter === 'true' ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Yes</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">No</span>
                  </>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Testing Parameters
              </p>
              <div className="flex items-center gap-2">
                {preorder.testingParameters === '1' || preorder.testingParameters === 'true' ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Yes</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">No</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subcontractor Information */}
      {(preorder.subcon === 1 || preorder.subconId) && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              Subcontractor Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  All Sample Subcontracted
                </p>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Yes</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  COA Release Due Date
                </p>
                <p className="text-sm font-medium">{formatDate(preorder.subconDue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      {(preorder.remarks || preorder.notesCustomer) && (
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
            {preorder.remarks && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Remarks
                </p>
                <p className="text-sm font-medium whitespace-pre-wrap">{preorder.remarks}</p>
              </div>
            )}
            {preorder.notesCustomer && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Notes for Customer
                </p>
                <p className="text-sm font-medium whitespace-pre-wrap">{preorder.notesCustomer}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
