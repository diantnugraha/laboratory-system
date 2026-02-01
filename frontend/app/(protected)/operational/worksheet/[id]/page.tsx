'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ClipboardList,
  FlaskConical,
  User,
  Calendar,
  FileText,
  Building2,
  AlertCircle,
  Loader2,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RenderHTML } from '@/components/shared/RenderHTML';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  WORKSHEET_STATUS_COLORS,
  WORKSHEET_STATUS_LABELS,
} from '@/lib/constants/worksheetStatus';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants/priority';
import { worksheetService, WorksheetDetail } from '@/services/worksheetService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/errorHandler';
import { OPERATION_ERROR_MESSAGES } from '@/lib/constants/errorMessages';

// ===== Date Helpers =====

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string | null) => {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

const formatCurrency = (value: number | null) => {
  if (value === null || value === undefined) return '-';
  return `Rp ${value.toLocaleString('id-ID')}`;
};

// ===== Main Component =====

export default function WorksheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [worksheet, setWorksheet] = useState<WorksheetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const worksheetId = Number(params.id);

  useEffect(() => {
    const controller = new AbortController();

    const fetchWorksheet = async () => {
      if (!worksheetId || isNaN(worksheetId)) {
        toast.error('Invalid worksheet ID');
        router.push('/operational/worksheet');
        return;
      }

      try {
        setLoading(true);
        const data = await worksheetService.getDetail(worksheetId, controller.signal);
        setWorksheet(data);
      } catch (error) {
        if ((error as Error).name !== 'CanceledError') {
          toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('worksheet')));
          router.push('/operational/worksheet');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWorksheet();
    return () => controller.abort();
  }, [worksheetId, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found state
  if (!worksheet) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Worksheet not found</h2>
        <p className="text-muted-foreground mb-4">
          The worksheet you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link href="/operational/worksheet">Back to Worksheet List</Link>
        </Button>
      </div>
    );
  }

  const isSubcontracted = worksheet.isSubcontracted;
  const hasResult = worksheet.result !== null && worksheet.result !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <Link href="/operational/worksheet">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{worksheet.code}</h1>
              <StatusBadge
                status={worksheet.status}
                colorMap={WORKSHEET_STATUS_COLORS}
                labelMap={WORKSHEET_STATUS_LABELS}
              />
              {isSubcontracted && (
                <Badge variant="outline" className="text-xs">
                  <Building2 className="h-3 w-3 mr-1" />
                  Subcontract
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {worksheet.parameter || 'No Parameter'} • {worksheet.method || 'No Method'}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FlaskConical className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Sample</span>
            </div>
            <Link
              href={`/operational/sample/${worksheet.sample.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {worksheet.sample.code}
            </Link>
            <p className="text-xs text-muted-foreground truncate">{worksheet.sample.name}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FileText className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Order</span>
            </div>
            <Link
              href={`/operational/order/${worksheet.order.id}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              {worksheet.order.code}
            </Link>
            <p className="text-xs text-muted-foreground truncate">{worksheet.order.customerName}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <User className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Analyst</span>
            </div>
            <p className="text-sm font-medium">{worksheet.analystName || '-'}</p>
            <p className="text-xs text-muted-foreground">{worksheet.analystType || '-'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium uppercase">Priority</span>
            </div>
            <StatusBadge
              status={worksheet.order.priority?.toLowerCase() || 'normal'}
              colorMap={PRIORITY_COLORS}
              labelMap={PRIORITY_LABELS}
            />
          </CardContent>
        </Card>
      </div>

      {/* Result Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            Result
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {hasResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Result</p>
                  <p className="text-lg font-semibold">{worksheet.result}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">N Result</p>
                  <p className="text-sm font-medium">{worksheet.nResult || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit</p>
                  <p className="text-sm font-medium">
                    {worksheet.unit ? <RenderHTML html={worksheet.unit} /> : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">% PC</p>
                  <p className="text-sm font-medium">{worksheet.percentPc !== null ? `${worksheet.percentPc}%` : '-'}</p>
                </div>
              </div>

              {worksheet.remarks && (
                <div className="pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Remarks</p>
                  <div className="p-3 rounded-lg border bg-muted/30">
                    <RenderHTML html={worksheet.remarks} className="text-sm" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No result recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Information */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
            Service Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parameter</p>
              <p className="text-sm font-medium">{worksheet.parameter || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Method</p>
              <p className="text-sm font-medium">{worksheet.method || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service Code</p>
              <p className="text-sm font-medium">{worksheet.serviceCode || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Service Name</p>
              <p className="text-sm font-medium">{worksheet.serviceName || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit</p>
              <p className="text-sm font-medium">
                {worksheet.serviceUnit ? <RenderHTML html={worksheet.serviceUnit} /> : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</p>
              <p className="text-sm font-medium">{formatCurrency(worksheet.servicePrice)}</p>
            </div>
            {worksheet.packageName && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Package</p>
                <p className="text-sm font-medium">{worksheet.packageName}</p>
              </div>
            )}
            {worksheet.standardName && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Standard</p>
                <p className="text-sm font-medium">{worksheet.standardName}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discount</p>
              <p className="text-sm font-medium">{worksheet.discount !== null ? `${worksheet.discount}%` : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subcontract Info (if applicable) */}
      {isSubcontracted && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              Subcontract Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Subcontractor</p>
                <p className="text-sm font-medium">{worksheet.subcontractorName || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Air Way Bill</p>
                <p className="text-sm font-medium">{worksheet.airWayBill || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Send Date</p>
                <p className="text-sm font-medium">{formatDate(worksheet.subconSendDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Received Date</p>
                <p className="text-sm font-medium">{formatDate(worksheet.subconReceivedDate)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</p>
                <p className="text-sm font-medium">{formatDate(worksheet.subconEndDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personnel & Verification */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            Personnel & Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analyst</p>
              <p className="text-sm font-medium">{worksheet.analystName || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supervisor</p>
              <p className="text-sm font-medium">{worksheet.supervisorName || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">QC</p>
              <p className="text-sm font-medium">{worksheet.qcName || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Manager</p>
              <p className="text-sm font-medium">{worksheet.managerName || '-'}</p>
            </div>
          </div>

          <Separator className="my-6" />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Verify QC Date</p>
              <p className="text-sm font-medium">{formatDateTime(worksheet.verifyQcDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retest & Revision History */}
      {(worksheet.totalRetest || worksheet.totalRevision || worksheet.totalCustomerRetest) && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <RefreshCw className="h-4 w-4 text-primary" />
              </div>
              Retest & Revision History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                <p className="text-2xl font-bold text-purple-600">{worksheet.totalRetest || 0}</p>
                <p className="text-xs text-muted-foreground">Internal Retest</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-pink-50 dark:bg-pink-950/20">
                <p className="text-2xl font-bold text-pink-600">{worksheet.totalCustomerRetest || 0}</p>
                <p className="text-xs text-muted-foreground">Customer Retest</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                <p className="text-2xl font-bold text-orange-600">{worksheet.totalRevision || 0}</p>
                <p className="text-xs text-muted-foreground">Revision</p>
              </div>
            </div>

            {worksheet.retestReason && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Retest Reason</p>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <RenderHTML html={worksheet.retestReason} className="text-sm" />
                </div>
              </div>
            )}

            {worksheet.reviseReason && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Revision Reason</p>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <RenderHTML html={worksheet.reviseReason} className="text-sm" />
                </div>
              </div>
            )}

            {worksheet.resultHistory && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Result History</p>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <RenderHTML html={worksheet.resultHistory} className="text-sm" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Worksheet Date</p>
              <p className="text-sm font-medium">{formatDate(worksheet.worksheetDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Finish Date</p>
              <p className="text-sm font-medium">{formatDate(worksheet.finishDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Created At</p>
              <p className="text-sm font-medium">{formatDateTime(worksheet.createdAt)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Updated At</p>
              <p className="text-sm font-medium">{formatDateTime(worksheet.updatedAt)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
