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
  ChevronDown,
  ChevronRight,
  FileCheck,
  Download,
  DollarSign,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { orderService, Order, OrderSample } from "@/services/orderService";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import { cn } from "@/lib/utils";

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
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

const getStorageLabel = (storage: string | null) => {
  switch (storage?.toLowerCase()) {
    case "chill":
      return "Chill";
    case "frozen":
      return "Frozen";
    case "dry":
    default:
      return "Dry";
  }
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [expandedSamples, setExpandedSamples] = useState<Set<string>>(new Set());

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getById(id);
      setOrder(response.data);
      // Expand all samples by default
      if (response.data.samples) {
        setExpandedSamples(new Set(response.data.samples.map(s => String(s.id))));
      }
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

  const toggleSampleExpanded = (sampleId: string) => {
    setExpandedSamples((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sampleId)) {
        newSet.delete(sampleId);
      } else {
        newSet.add(sampleId);
      }
      return newSet;
    });
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

  // Calculate totals
  const samples = order?.samples || [];
  const subtotal = samples.reduce((sum, sample) => {
    const sampleTotal = sample.worksheets?.reduce((svcSum, ws) => svcSum + (ws.total || 0), 0) || 0;
    return sum + (sampleTotal * (sample.quantity || 1));
  }, 0);

  const percentDiscount = order?.percentDiscount || 0;
  const discountAmount = Math.round(subtotal * (percentDiscount / 100));
  const subtotalAfterDiscount = subtotal - discountAmount;
  const percentVat = order?.percentVat || 11;
  const vatAmount = Math.round(subtotalAfterDiscount * (percentVat / 100));
  const grandTotal = subtotalAfterDiscount + vatAmount;

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
              <p className="text-sm font-medium">{order.document || '-'}</p>
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
            <div className="divide-y">
              {samples.map((sample) => (
                <Collapsible
                  key={sample.id}
                  open={expandedSamples.has(String(sample.id))}
                  onOpenChange={() => toggleSampleExpanded(String(sample.id))}
                >
                  <div className="flex items-center justify-between p-4 bg-muted/20 hover:bg-muted/30 transition-colors">
                    <CollapsibleTrigger asChild>
                      <button type="button" className="flex items-center gap-3 flex-1 text-left">
                        {expandedSamples.has(String(sample.id)) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sample.name}</span>
                            <span className="text-muted-foreground text-sm">
                              (Qty: {sample.quantity || 1}, {sample.worksheets?.length || 0} service{(sample.worksheets?.length || 0) !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {sample.description && <span>{sample.description}</span>}
                            {sample.standardName && <span>• {sample.standardName}</span>}
                            {sample.volume && <span>• Vol: {sample.volume}</span>}
                            <span>• {getStorageLabel(sample.sampleStorage)}</span>
                          </div>
                        </div>
                      </button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    {sample.worksheets && sample.worksheets.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/30">
                              <th className="text-left px-4 py-3 font-medium">Type</th>
                              <th className="text-left px-4 py-3 font-medium">Parameter</th>
                              <th className="text-left px-4 py-3 font-medium">Method</th>
                              <th className="text-right px-4 py-3 font-medium">Price (IDR)</th>
                              <th className="text-center px-4 py-3 font-medium">Discount (%)</th>
                              <th className="text-right px-4 py-3 font-medium">Total (IDR)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sample.worksheets.map((ws) => (
                              <tr key={ws.id} className="border-b hover:bg-muted/20">
                                <td className="px-4 py-3">
                                  <span className={cn(
                                    "text-xs px-2 py-1 rounded-full",
                                    ws.packageId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                  )}>
                                    {ws.packageId ? "Pkg" : "Svc"}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {ws.packageId && ws.packageName ? (
                                    <div>
                                      <div className="font-medium text-primary">{ws.packageName}</div>
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {ws.serviceName}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="font-medium">{ws.parameter}</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">{ws.method}</td>
                                <td className="text-right px-4 py-3">{formatCurrency(ws.price)}</td>
                                <td className="text-center px-4 py-3">{ws.discount}%</td>
                                <td className="text-right px-4 py-3 font-medium">{formatCurrency(ws.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-6 text-muted-foreground">
                        No services assigned to this sample
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary & Remarks Section */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            Summary & Remarks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Remarks */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">Remarks</h4>
              <div className="p-4 rounded-lg border bg-muted/30 min-h-[120px]">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {order.remarks || "-"}
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-3">Financial Summary</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal Services</span>
                  <span className="font-medium">{formatCurrency(order.subTotal || subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Global Discount ({percentDiscount}%)</span>
                  <span className="font-medium text-destructive">-{formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground">Subtotal After Discount</span>
                  <span className="font-medium">{formatCurrency(subtotalAfterDiscount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT ({percentVat}%)</span>
                  <span className="font-medium">{formatCurrency(vatAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Grand Total</span>
                  <span className="text-primary">{formatCurrency(order.total || grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Documents */}
      {(order.quotation || order.preOrder || order.invoice) && (
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {order.quotation && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Quotation
                  </p>
                  <p className="text-sm font-medium">
                    <Link href={`/operational/quotation/${order.quotation.id}`} className="text-primary hover:underline">
                      {order.quotation.code}
                    </Link>
                  </p>
                </div>
              )}
              {order.preOrder && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Pre Order
                  </p>
                  <p className="text-sm font-medium">
                    <Link href={`/operational/preorder/${order.preOrder.id}`} className="text-primary hover:underline">
                      {order.preOrder.code}
                    </Link>
                  </p>
                </div>
              )}
              {order.invoice && (
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
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
