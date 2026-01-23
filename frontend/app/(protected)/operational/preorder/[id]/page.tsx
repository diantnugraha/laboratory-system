'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, Trash2, FileText, User, Calendar, Package, Check, X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

const getPriorityVariant = (priority: string | null): "default" | "secondary" | "destructive" | "outline" => {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return "outline";
    case "very urgent":
      return "destructive";
    case "special request":
      return "outline";
    default:
      return "secondary";
  }
};

const getPriorityLabel = (priority: string | null) => {
  if (!priority) return 'Normal';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
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

  const contactFullName = preorder.contact
    ? [preorder.contact.first_name, preorder.contact.middle_name, preorder.contact.surname]
        .filter(Boolean)
        .join(' ')
    : '-';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/operational/preorder')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{preorder.code}</h1>
            <p className="text-sm text-muted-foreground">Pre Order Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/operational/preorder/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
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
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-medium">{preorder.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Received Date</p>
              <p className="font-medium">{formatDate(preorder.received_date)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge variant={getPriorityVariant(preorder.priority)}>
                {getPriorityLabel(preorder.priority)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Laboratory Service</p>
              <p className="font-medium">{getLabLabel(preorder.lab)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Submitted By</p>
              <p className="font-medium">{preorder.submited_by || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivery</p>
              <p className="font-medium">{preorder.delivery || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer & Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer & Contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{preorder.customer?.customer_name || '-'}</p>
              {preorder.customer?.code && (
                <p className="text-sm text-muted-foreground">{preorder.customer.code}</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Contact Person</p>
              <p className="font-medium">{contactFullName}</p>
              {preorder.contact?.email && (
                <p className="text-sm text-muted-foreground">{preorder.contact.email}</p>
              )}
              {preorder.contact?.phone && (
                <p className="text-sm text-muted-foreground">{preorder.contact.phone}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sample Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Sample Quantity</p>
              <p className="font-medium">{preorder.sample_quantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Covering Letter</p>
              <div className="flex items-center gap-2">
                {preorder.covering_letter === '1' || preorder.covering_letter === 'true' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{preorder.covering_letter === '1' || preorder.covering_letter === 'true' ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Testing Parameters</p>
              <div className="flex items-center gap-2">
                {preorder.testing_parameters === '1' || preorder.testing_parameters === 'true' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <X className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{preorder.testing_parameters === '1' || preorder.testing_parameters === 'true' ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subcontractor Information */}
      {(preorder.subcon === 1 || preorder.subcon_id) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subcontractor Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">All Sample Subcontracted</p>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>Yes</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">COA Release Due Date</p>
                <p className="font-medium">{formatDate(preorder.subcon_due)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Document</p>
              <p className="font-medium">{preorder.document || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remarks</p>
              <p className="font-medium whitespace-pre-wrap">{preorder.remarks || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Notes for Customer</p>
              <p className="font-medium whitespace-pre-wrap">{preorder.notes_customer || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Links */}
      <Card>
        <CardHeader>
          <CardTitle>Related Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Quotation</p>
              {preorder.quotation_id ? (
                <Link
                  href={`/operational/quotation/${preorder.quotation_id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {preorder.quotation?.code || `Quotation #${preorder.quotation_id}`}
                </Link>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order</p>
              {preorder.order_id ? (
                <Link
                  href={`/operational/order/${preorder.order_id}`}
                  className="text-primary hover:underline font-medium"
                >
                  {preorder.order?.code || `Order #${preorder.order_id}`}
                </Link>
              ) : (
                <Link href={`/operational/order/new?preorderId=${preorder.id}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                    Create Order
                  </Badge>
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>Timestamps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">{formatDate(preorder.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Updated At</p>
              <p className="font-medium">{formatDate(preorder.updated_at)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
