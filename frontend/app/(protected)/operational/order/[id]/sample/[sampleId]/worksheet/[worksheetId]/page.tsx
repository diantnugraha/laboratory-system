'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, RefreshCw, Loader2, FlaskConical, Users, History, Package, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getWorksheetDetail, WorksheetDetail } from '@/services/worksheetService';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge } from '@/components/shared/StatusProgress';
import { RenderHTML } from '@/components/shared/RenderHTML';

// Format date helper
const formatDate = (dateString: string | null): string => {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '-';
  }
};

// Format currency helper
const formatCurrency = (value: number | null): string => {
  if (value === null) return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

export default function WorksheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const orderId = params.id as string;
  const sampleId = params.sampleId as string;
  const worksheetId = params.worksheetId as string;

  const [worksheet, setWorksheet] = useState<WorksheetDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorksheet = async () => {
    try {
      setLoading(true);
      const data = await getWorksheetDetail(parseInt(worksheetId));
      setWorksheet(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load worksheet details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (worksheetId) {
      fetchWorksheet();
    }
  }, [worksheetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!worksheet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Worksheet not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  // Parse result history if available
  let resultHistoryItems: { date: string; result: string; note: string }[] = [];
  if (worksheet.resultHistory) {
    try {
      resultHistoryItems = JSON.parse(worksheet.resultHistory);
    } catch {
      // If not JSON, show as plain text
    }
  }

  const hasSubcontractInfo = worksheet.isSubcontracted || worksheet.airWayBill || worksheet.subconSendDate;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Orders', href: '/operational/order' },
          { label: worksheet.order.code, href: `/operational/order/${orderId}` },
          { label: worksheet.sample.code, href: `/operational/order/${orderId}/sample/${sampleId}` },
          { label: worksheet.code },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{worksheet.code}</h1>
            <StatusBadge status={worksheet.status} />
          </div>
          <p className="text-muted-foreground ml-12">
            <RenderHTML html={worksheet.parameter} /> • {worksheet.method}
          </p>
          <p className="text-sm text-muted-foreground ml-12">
            Sample: <Link href={`/operational/order/${orderId}/sample/${sampleId}`} className="text-primary hover:underline">{worksheet.sample.code}</Link>
            {' • '}
            Order: <Link href={`/operational/order/${orderId}`} className="text-primary hover:underline">{worksheet.order.code}</Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchWorksheet}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Analysis Information Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FlaskConical className="h-4 w-4 text-primary" />
            </div>
            Analysis Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
              <StatusBadge status={worksheet.status} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Parameter</p>
              <div className="text-sm font-medium">
                <RenderHTML html={worksheet.parameter} />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Method</p>
              <p className="text-sm font-medium">{worksheet.method || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Unit</p>
              <p className="text-sm font-medium">{worksheet.unit || worksheet.serviceUnit || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Result</p>
              <p className="text-sm font-medium">
                {worksheet.result || '-'} {worksheet.result && worksheet.unit}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Numeric Result</p>
              <p className="text-sm font-medium">{worksheet.nResult || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Percent PC</p>
              <p className="text-sm font-medium">{worksheet.percentPc !== null ? `${worksheet.percentPc}%` : '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</p>
              <p className="text-sm font-medium">{formatCurrency(worksheet.price)}</p>
            </div>
          </div>

          {worksheet.packageName && (
            <div className="pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Package</p>
              <p className="text-sm font-medium">{worksheet.packageName}</p>
            </div>
          )}

          {worksheet.remarks && (
            <div className="pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Remarks</p>
              <div className="p-4 rounded-lg border bg-muted/30">
                <RenderHTML html={worksheet.remarks} className="text-sm leading-relaxed" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment & Workflow Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
            Assignment & Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Worksheet Date</p>
              <p className="text-sm font-medium">{formatDate(worksheet.worksheetDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Finish Date</p>
              <p className="text-sm font-medium">{formatDate(worksheet.finishDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">QC Verify Date</p>
              <p className="text-sm font-medium">{formatDate(worksheet.verifyQcDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analyst Type</p>
              <p className="text-sm font-medium">{worksheet.analystType || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retest/Revision History Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <History className="h-4 w-4 text-primary" />
            </div>
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Retest</p>
              <p className="text-sm font-medium">{worksheet.totalRetest || 0}</p>
              {worksheet.retestReason && (
                <p className="text-xs text-muted-foreground mt-1">Reason: {worksheet.retestReason}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Revision</p>
              <p className="text-sm font-medium">{worksheet.totalRevision || 0}</p>
              {worksheet.reviseReason && (
                <p className="text-xs text-muted-foreground mt-1">Reason: {worksheet.reviseReason}</p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer Retest</p>
              <p className="text-sm font-medium">{worksheet.totalCustomerRetest || 0}</p>
            </div>
          </div>

          {resultHistoryItems.length > 0 && (
            <div className="pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Result History</p>
              <div className="space-y-2 bg-muted/50 rounded-lg p-4">
                {resultHistoryItems.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="text-muted-foreground">{item.date}:</span> {item.result}
                    {item.note && <span className="text-muted-foreground"> ({item.note})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {worksheet.resultHistory && resultHistoryItems.length === 0 && (
            <div className="pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Result History</p>
              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{worksheet.resultHistory}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subcontract Info Card - Only show if relevant */}
      {hasSubcontractInfo && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Package className="h-4 w-4 text-primary" />
              </div>
              Subcontract Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">End Date</p>
                <p className="text-sm font-medium">{formatDate(worksheet.subconEndDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
