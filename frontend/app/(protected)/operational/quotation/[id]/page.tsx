'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Edit,
  Trash2,
  FileText,
  User,
  Calendar,
  Loader2,
  Package,
  FlaskConical,
  Receipt,
  Eye,
  ChevronDown,
} from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { quotationService, Quotation, QuotationDetail } from "@/services/quotationService";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// Minimum quotation values (same as backend)
const MIN_TOTAL = 200000;
const MIN_VAT = 22000;
const MIN_GRAND_TOTAL = 222000;

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const getPriorityText = (priority: string | null): string => {
  if (!priority || priority === 'normal') return 'Normal (0% PC)';
  switch (priority.toLowerCase()) {
    case "urgent":
      return 'Urgent (+50% PC)';
    case "very urgent":
      return 'Very Urgent (+100% PC)';
    default:
      return 'Normal (0% PC)';
  }
};

const getContactFullName = (contact: Quotation['contact']) => {
  if (!contact) return '-';
  const parts = [contact.first_name, contact.middle_name, contact.surname].filter(Boolean);
  return parts.join(' ') || '-';
};

// Group quotation details by sample and consolidate packages
interface SampleGroup {
  sampleName: string;
  quantity: number;
  priority: string;
  items: QuotationDetail[];
}

const groupDetailsBySample = (details: QuotationDetail[]): SampleGroup[] => {
  const groups: Record<string, SampleGroup> = {};

  if (!Array.isArray(details)) return [];

  details.forEach(detail => {
    const key = `${detail.sampleName}_${detail.indexSample || 0}`;
    if (!groups[key]) {
      groups[key] = {
        sampleName: detail.sampleName,
        quantity: detail.quantity,
        priority: detail.priority,
        items: [],
      };
    }
    groups[key].items.push(detail);
  });

  // Consolidate package items - keep only one item per package_id within each sample group
  Object.values(groups).forEach(group => {
    const seenPackages = new Set<number>();
    const consolidatedItems: QuotationDetail[] = [];

    group.items.forEach(item => {
      if (item.packageId) {
        // For package items, only keep the first occurrence
        if (!seenPackages.has(item.packageId)) {
          seenPackages.add(item.packageId);
          consolidatedItems.push(item);
        }
      } else {
        // For service items (no packageId), keep all
        consolidatedItems.push(item);
      }
    });

    group.items = consolidatedItems;
  });

  return Object.values(groups);
};

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [details, setDetails] = useState<QuotationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchQuotation = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [quotationRes, detailsRes] = await Promise.all([
        quotationService.getById(id),
        quotationService.getDetails(id),
      ]);
      setQuotation(quotationRes.data);
      setDetails(detailsRes.data || []);
    } catch (error) {
      console.error('Error fetching quotation:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('quotation')));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await quotationService.delete(id);
      toast.success("Quotation deleted successfully");
      router.push("/operational/quotation");
    } catch (error) {
      console.error('Error deleting quotation:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('quotation')));
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

  if (!quotation) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Quotation not found</p>
      </div>
    );
  }

  const sampleGroups = groupDetailsBySample(details).filter(
    group => group.items.some(item => item.product !== 1)
  );
  const productDetails = Array.isArray(details) ? details.filter(d => d.product === 1) : [];

  // Priority charge rates: normal = 0%, urgent = 50%, very urgent = 100%
  const getPriorityChargeRate = (priority: string | null): number => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return 0.5; // 50%
      case 'very urgent':
        return 1.0; // 100%
      default:
        return 0; // normal = 0%
    }
  };

  // Calculate subtotal from displayed items (consolidated)
  const calculateSubtotal = () => {
    let subTotal = 0;

    sampleGroups.forEach(group => {
      group.items.filter(item => item.product !== 1).forEach(item => {
        const price = item.package?.totalPrice || item.service?.price || item.price || 0;
        const quantity = item.quantity || 1;
        const discount = item.percentDiscount || 0;
        const itemTotal = price * quantity * (1 - discount / 100);
        subTotal += itemTotal;
      });
    });

    // Add products (products don't have priority charge)
    productDetails.forEach(item => {
      const price = item.price || 0;
      const quantity = item.quantity || 1;
      const discount = item.percentDiscount || 0;
      const itemTotal = price * quantity * (1 - discount / 100);
      subTotal += itemTotal;
    });

    return subTotal;
  };

  // Calculate totals - priority is from quotation level, not sample level
  const subTotal = calculateSubtotal();
  const percentDiscount = quotation.percent_discount || 0;
  const percentVat = quotation.percent_vat || 0;
  const priorityRate = getPriorityChargeRate(quotation.priority);

  const discountAmount = Math.round(subTotal * (percentDiscount / 100));
  const afterDiscount = subTotal - discountAmount;
  const pcAmount = Math.round(afterDiscount * priorityRate); // Priority charge from quotation priority
  const afterPc = afterDiscount + pcAmount;

  // Apply minimum total rule (same as backend)
  const isMinimumApplied = afterPc < MIN_TOTAL;
  const vatAmount = isMinimumApplied ? MIN_VAT : Math.round(afterPc * (percentVat / 100));
  const calculatedTotal = isMinimumApplied ? MIN_GRAND_TOTAL : afterPc + vatAmount;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/operational/quotation")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{quotation.code}</h1>
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
            <DropdownMenuItem
              disabled={pdfLoading}
              onClick={async () => {
                setPdfLoading(true);
                const toastId = toast.loading('Generating PDF preview...');
                try {
                  await quotationService.openPdfPreview(id as string);
                  toast.dismiss(toastId);
                  toast.success('PDF preview opened in new tab');
                } catch (error) {
                  toast.dismiss(toastId);
                  toast.error(getErrorMessage(error) || 'Failed to open PDF preview');
                } finally {
                  setPdfLoading(false);
                }
              }}
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
              {pdfLoading ? 'Generating...' : 'Preview PDF'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/operational/quotation/${id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
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
                  <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this quotation? This action cannot be undone.
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

      {/* Quotation Info */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Quotation Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Code
              </p>
              <p className="text-sm font-medium">{quotation.code}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quotation Date
              </p>
              <p className="text-sm font-medium">{formatDate(quotation.quo_date)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Valid Until
              </p>
              <p className="text-sm font-medium">{formatDate(quotation.expired_date)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Priority Charge
              </p>
              <p className="text-sm font-medium">{getPriorityText(quotation.priority)}</p>
            </div>
            {percentDiscount > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Discount
                </p>
                <Badge variant="outline" className="text-green-600 border-green-600">{percentDiscount}%</Badge>
              </div>
            )}
            {quotation.sampling_request && (
              <>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sampling Request
                  </p>
                  <Badge variant="outline" className="text-blue-600 border-blue-600">Yes</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Sampling Date
                  </p>
                  <p className="text-sm font-medium">{formatDate(quotation.sampling_date)}</p>
                </div>
              </>
            )}
          </div>
          {quotation.min_volume_sample && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Minimum Sample Volume
              </p>
              <p className="text-sm font-medium">{quotation.min_volume_sample}</p>
            </div>
          )}
          {quotation.remarks && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Remarks
              </p>
              <p className="text-sm font-medium whitespace-pre-wrap">{quotation.remarks}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Info */}
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
                {quotation.customer ? (
                  <Link href={`/master/customer/${quotation.customer.id}`} className="text-primary hover:underline">
                    {quotation.customer.customer_name}
                  </Link>
                ) : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Customer Code
              </p>
              <p className="text-sm font-medium">{quotation.customer?.code || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contact Person
              </p>
              <p className="text-sm font-medium">{getContactFullName(quotation.contact)}</p>
            </div>
            {quotation.contact?.email && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm font-medium">{quotation.contact.email}</p>
              </div>
            )}
            {quotation.contact?.phone && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Phone
                </p>
                <p className="text-sm font-medium">{quotation.contact.phone}</p>
              </div>
            )}
            {quotation.contact?.department && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Department
                </p>
                <p className="text-sm font-medium">{quotation.contact.department}</p>
              </div>
            )}
          </div>
          {quotation.address && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Address Type
                </p>
                <p className="text-sm font-medium">{quotation.address.address_type}</p>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Full Address
                </p>
                <p className="text-sm font-medium leading-relaxed">
                  {quotation.address.address}
                  {quotation.address.city && `, ${quotation.address.city}`}
                  {quotation.address.state && `, ${quotation.address.state}`}
                  {quotation.address.postal_code && ` ${quotation.address.postal_code}`}
                  {quotation.address.country && `, ${quotation.address.country}`}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Samples & Services */}
      {sampleGroups.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <FlaskConical className="h-4 w-4 text-primary" />
              </div>
              Samples & Services ({sampleGroups.length} samples)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {sampleGroups.map((group, index) => {
                const serviceItems = group.items.filter(item => item.product !== 1);
                return (
                  <div key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{group.sampleName}</span>
                        <Badge variant="outline">Qty: {group.quantity}</Badge>
                        {quotation.priority && quotation.priority !== 'normal' && (
                          <Badge
                            variant={quotation.priority === 'very urgent' ? 'destructive' : 'outline'}
                            className={quotation.priority === 'urgent' ? 'text-orange-600 border-orange-600' : ''}
                          >
                            {quotation.priority === 'urgent' ? 'Urgent (+50% PC)' : 'Very Urgent (+100% PC)'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Service/Package</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead className="text-right">Price</TableHead>
                          <TableHead className="text-right">Discount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {serviceItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="align-top">
                              <Badge variant={item.packageId ? 'default' : 'secondary'}>
                                {item.packageId ? 'Package' : 'Service'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium align-top">
                              <div>
                                <div className="font-semibold">
                                  <RenderHTML html={item.package?.name || item.service?.name || '-'} />
                                </div>
                                {Array.isArray(item.package?.services) && item.package.services.length > 0 && (
                                  <ul className="mt-1 text-xs text-muted-foreground list-disc list-inside">
                                    {item.package.services.map((svc, idx) => (
                                      <li key={`${item.id}-${svc.id}-${idx}`}>
                                        <RenderHTML html={svc.name} />
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="align-top">
                              {item.packageId && item.package?.services
                                ? 'Various Methods'
                                : item.service?.method?.name || '-'}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              {(() => {
                                const originalPrice = item.package?.totalPrice || item.service?.price || item.price || 0;
                                const discount = item.percentDiscount || 0;
                                if (discount > 0) {
                                  return (
                                    <div>
                                      <span className="line-through text-muted-foreground text-xs">{formatCurrency(originalPrice)}</span>
                                      <br />
                                      <span className="text-green-600 font-medium">{formatCurrency(originalPrice * (1 - discount / 100))}</span>
                                    </div>
                                  );
                                }
                                return formatCurrency(originalPrice);
                              })()}
                            </TableCell>
                            <TableCell className="text-right align-top">{item.percentDiscount}%</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products (if any) */}
      {productDetails.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              Additional Products ({productDetails.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productDetails.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.sampleName}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.price || 0)}</TableCell>
                    <TableCell className="text-right">{item.percentDiscount}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pricing Summary */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            Pricing Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="max-w-md ml-auto space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>
            {quotation.percent_discount > 0 && (
              <div className="flex justify-between items-center text-sm text-destructive">
                <span>Discount ({quotation.percent_discount}%)</span>
                <span>- {formatCurrency(discountAmount)}</span>
              </div>
            )}
            {quotation.percent_discount > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">After Discount</span>
                <span className="font-medium">{formatCurrency(afterDiscount)}</span>
              </div>
            )}
            {pcAmount > 0 && (
              <div className="flex justify-between items-center text-sm text-orange-600">
                <span>Priority Charge ({Math.round(priorityRate * 100)}%)</span>
                <span>+ {formatCurrency(pcAmount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Sub Total</span>
              <span className="font-medium">{formatCurrency(afterPc)}</span>
            </div>
            {isMinimumApplied && (
              <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-md">
                Minimum order IDR 200,000 applied
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">VAT ({quotation.percent_vat}%)</span>
              <span className="font-medium">+ {formatCurrency(vatAmount)}</span>
            </div>
            <div className="border-t pt-3 mt-3 flex justify-between items-center">
              <span className="font-semibold">Grand Total</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(calculatedTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Order (if any) */}
      {Array.isArray(quotation.orders) && quotation.orders.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Calendar className="h-4 w-4 text-primary" />
              </div>
              Linked Orders
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-2">
              {quotation.orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/operational/order/${order.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {order.code || `Order #${order.id}`}
                    </Link>
                    {order.order_status && (
                      <Badge variant="outline">{order.order_status}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
