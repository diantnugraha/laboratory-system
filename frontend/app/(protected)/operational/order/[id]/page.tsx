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
  Loader2,
  FileCheck,
  Download,
  ChevronDown,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orderService, Order } from "@/services/orderService";
import { RenderHTML } from "@/components/shared/RenderHTML";
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

const getStatusBadge = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "created":
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Created</Badge>;
    case "to be verified":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">To Be Verified</Badge>;
    case "reviewed":
      return <Badge variant="outline" className="text-green-600 border-green-600">Reviewed</Badge>;
    case "under process":
      return <Badge variant="secondary">Under Process</Badge>;
    case "complete":
      return <Badge variant="default">Complete</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    case "payment confirmation":
      return <Badge variant="outline" className="text-purple-600 border-purple-600">Payment Confirmation</Badge>;
    case "need to revise":
      return <Badge variant="outline" className="text-red-600 border-red-600">Need to Revise</Badge>;
    default:
      return <Badge variant="outline">{status || '-'}</Badge>;
  }
};

// Sample status badge helper
const getSampleStatusBadge = (status: string | null) => {
  switch (status?.toLowerCase()) {
    case "complete":
    case "approved":
    case "verified":
      return <Badge variant="default" className="text-xs">{status}</Badge>;
    case "process":
    case "under process":
      return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    case "pending":
    case "waiting":
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
    case "cancel":
    case "cancelled":
      return <Badge variant="destructive" className="text-xs">{status}</Badge>;
    default:
      return <Badge variant="secondary" className="text-xs">{status || '-'}</Badge>;
  }
};

const getPriorityBadge = (priority: string | null) => {
  switch (priority?.toLowerCase()) {
    case "urgent":
      return <Badge variant="outline" className="text-orange-600 border-orange-600">Urgent</Badge>;
    case "very urgent":
      return <Badge variant="destructive">Very Urgent</Badge>;
    case "special request":
      return <Badge variant="outline" className="text-purple-600 border-purple-600">Special Request</Badge>;
    default:
      return <Badge variant="secondary">Normal</Badge>;
  }
};

const getContactFullName = (contact: Order['contact']) => {
  if (!contact) return '-';
  const parts = [contact.first_name, contact.middle_name, contact.surname].filter(Boolean);
  return parts.join(' ') || '-';
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getById(id);
      setOrder(response.data);
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('order')));
      router.push('/operational/order');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await orderService.delete(id);
      toast.success('Order deleted successfully');
      router.push('/operational/order');
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('order')));
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (type: 'sppc' | 'quotation' | 'request_form' | 'coa_request' | 'coa_release') => {
    try {
      const blob = await orderService.downloadDocument(id, type);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${order?.code}_${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Document downloaded successfully');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to download document'));
    }
  };

  const samples = order?.samples || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Order not found</p>
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
            onClick={() => router.push('/operational/order')}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{order.code}</h1>
            {getStatusBadge(order.orderStatus)}
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
            <DropdownMenuItem onClick={() => router.push(`/operational/order/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDownload('sppc')}>
              <Download className="h-4 w-4 mr-2" />
              Download SPPC
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('quotation')}>
              <Download className="h-4 w-4 mr-2" />
              Download Quotation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleDownload('request_form')}>
              <Download className="h-4 w-4 mr-2" />
              Download Request Form
            </DropdownMenuItem>
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
                  <AlertDialogTitle>Delete Order</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this order? This action cannot be undone.
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

      {/* Order Information */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Order Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Code
              </p>
              <p className="text-sm font-medium">{order.code}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Order Date
              </p>
              <p className="text-sm font-medium">{formatDate(order.orderDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Priority
              </p>
              {getPriorityBadge(order.orderPriority || order.priority)}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Status
              </p>
              {getStatusBadge(order.orderStatus)}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Submitted By
              </p>
              <p className="text-sm font-medium">{order.submitedBy || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Received Date
              </p>
              <p className="text-sm font-medium">{formatDate(order.receivedDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Delivery
              </p>
              <p className="text-sm font-medium">{order.delivery || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Document
              </p>
              <div className="text-sm font-medium">
                {order.document ? (
                  <div className="flex flex-col gap-1">
                    {order.document.split(';;').filter(Boolean).map((doc, index) => (
                      <a
                        key={index}
                        href={`${process.env.NEXT_PUBLIC_API_URL}/uploads/orders/${doc.trim()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="h-3 w-3" />
                        {doc.trim()}
                      </a>
                    ))}
                  </div>
                ) : '-'}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quotation
              </p>
              <p className="text-sm font-medium">
                {order.quotation ? (
                  <Link href={`/operational/quotation/${order.quotation.id}`} className="text-primary hover:underline">
                    {order.quotation.code}
                  </Link>
                ) : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Pre Order
              </p>
              <p className="text-sm font-medium">
                {order.preOrder ? (
                  <Link href={`/operational/preorder/${order.preOrder.id}`} className="text-primary hover:underline">
                    {order.preOrder.code}
                  </Link>
                ) : '-'}
              </p>
            </div>
          </div>

          {/* Remarks */}
          <div className="border-t pt-6">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Remarks
            </p>
            <div className="p-4 rounded-lg border bg-muted/30 min-h-[80px]">
              <RenderHTML html={order.remarks} className="text-sm leading-relaxed" />
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
                {order.customer ? (
                  <Link href={`/master/customer/${order.customer.id}`} className="text-primary hover:underline">
                    {order.customer.customer_name}
                  </Link>
                ) : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer Code
              </p>
              <p className="text-sm font-medium">{order.customer?.code || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contact Person
              </p>
              <p className="text-sm font-medium">{getContactFullName(order.contact)}</p>
            </div>
            {order.contact?.email && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm font-medium">{order.contact.email}</p>
              </div>
            )}
            {order.contact?.phone && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-sm font-medium">{order.contact.phone}</p>
              </div>
            )}
            {order.address && (
              <div className="space-y-1 col-span-full">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Address
                </p>
                <p className="text-sm font-medium">
                  {[order.address.address, order.address.city, order.address.province, order.address.postal_code]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Samples Section */}
      {samples.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileCheck className="h-4 w-4 text-primary" />
              </div>
              Samples ({samples.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium w-40">Sample Code</th>
                    <th className="text-left px-4 py-3 font-medium w-96">Sample Name</th>
                    <th className="text-left px-4 py-3 font-medium">Received Date</th>
                    <th className="text-left px-4 py-3 font-medium">Priority</th>
                    <th className="text-left px-4 py-3 font-medium">Due Date</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">COA Published</th>
                  </tr>
                </thead>
                <tbody>
                  {samples.map((sample) => (
                    <tr key={sample.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <Link
                          href={`/operational/order/${id}/sample/${sample.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {sample.code}
                        </Link>
                      </td>
                      <td className="px-4 py-3 max-w-96">
                        <RenderHTML html={sample.name} className="break-words" />
                      </td>
                      <td className="px-4 py-3">{formatDate(sample.receivedDate)}</td>
                      <td className="px-4 py-3">{sample.priority}</td>
                      <td className="px-4 py-3">{formatDate(sample.dueDate)}</td>
                      <td className="px-4 py-3">
                        {getSampleStatusBadge(sample.sampleStatus)}
                      </td>
                      <td className="px-4 py-3">{formatDate(sample.coaReleasedDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Related Documents - Invoice Only */}
      {order.invoice && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              Related Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Invoice
              </p>
              <p className="text-sm font-medium">
                <Link href={`/operational/invoice/${order.invoice.id}`} className="text-primary hover:underline">
                  {order.invoice.code}
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
