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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Analysis Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Status</p>
              <StatusBadge status={worksheet.status} className="mt-1" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Parameter</p>
              <div className="text-sm font-medium mt-1">
                <RenderHTML html={worksheet.parameter} />
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Method</p>
              <p className="text-sm font-medium mt-1">{worksheet.method || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Unit</p>
              <p className="text-sm font-medium mt-1">{worksheet.unit || worksheet.serviceUnit || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Result</p>
              <p className="text-sm font-medium mt-1">
                {worksheet.result || '-'} {worksheet.result && worksheet.unit}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Numeric Result</p>
              <p className="text-sm font-medium mt-1">{worksheet.nResult || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Percent PC</p>
              <p className="text-sm font-medium mt-1">{worksheet.percentPc !== null ? `${worksheet.percentPc}%` : '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Price</p>
              <p className="text-sm font-medium mt-1">{formatCurrency(worksheet.price)}</p>
            </div>
          </div>

          {worksheet.packageName && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground uppercase">Package</p>
              <p className="text-sm font-medium mt-1">{worksheet.packageName}</p>
            </div>
          )}

          {worksheet.remarks && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground uppercase">Remarks</p>
              <div className="p-3 rounded-lg border bg-muted/30 mt-1">
                <RenderHTML html={worksheet.remarks} className="text-sm leading-relaxed" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assignment & Workflow Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Assignment & Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Analyst</p>
              <p className="text-sm font-medium mt-1">{worksheet.analystName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Supervisor</p>
              <p className="text-sm font-medium mt-1">{worksheet.supervisorName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">QC</p>
              <p className="text-sm font-medium mt-1">{worksheet.qcName || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Manager</p>
              <p className="text-sm font-medium mt-1">{worksheet.managerName || '-'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t mt-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Worksheet Date</p>
              <p className="text-sm font-medium mt-1">{formatDate(worksheet.worksheetDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Finish Date</p>
              <p className="text-sm font-medium mt-1">{formatDate(worksheet.finishDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">QC Verify Date</p>
              <p className="text-sm font-medium mt-1">{formatDate(worksheet.verifyQcDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Analyst Type</p>
              <p className="text-sm font-medium mt-1">{worksheet.analystType || '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retest/Revision History Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Retest</p>
              <p className="text-sm font-medium mt-1">{worksheet.totalRetest || 0}</p>
              {worksheet.retestReason && (
                <p className="text-xs text-muted-foreground mt-1">Reason: {worksheet.retestReason}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total Revision</p>
              <p className="text-sm font-medium mt-1">{worksheet.totalRevision || 0}</p>
              {worksheet.reviseReason && (
                <p className="text-xs text-muted-foreground mt-1">Reason: {worksheet.reviseReason}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Customer Retest</p>
              <p className="text-sm font-medium mt-1">{worksheet.totalCustomerRetest || 0}</p>
            </div>
          </div>

          {resultHistoryItems.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground uppercase mb-2">Result History</p>
              <div className="space-y-2 bg-muted/50 rounded-lg p-3">
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
            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground uppercase mb-2">Result History</p>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm whitespace-pre-wrap">{worksheet.resultHistory}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subcontract Info Card - Only show if relevant */}
      {hasSubcontractInfo && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Subcontract Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">Subcontractor</p>
                <p className="text-sm font-medium mt-1">{worksheet.subcontractorName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Air Way Bill</p>
                <p className="text-sm font-medium mt-1">{worksheet.airWayBill || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Send Date</p>
                <p className="text-sm font-medium mt-1">{formatDate(worksheet.subconSendDate)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase">Received Date</p>
                <p className="text-sm font-medium mt-1">{formatDate(worksheet.subconReceivedDate)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t mt-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase">End Date</p>
                <p className="text-sm font-medium mt-1">{formatDate(worksheet.subconEndDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
