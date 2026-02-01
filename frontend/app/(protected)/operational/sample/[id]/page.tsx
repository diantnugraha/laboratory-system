'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Download,
  FlaskConical,
  Beaker,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RenderHTML } from '@/components/shared/RenderHTML';
import { StatusBadge, ProgressBar } from '@/components/shared/StatusProgress';
import { StatusBadge as PriorityBadge } from '@/components/shared/StatusBadge';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@/lib/constants/priority';
import sampleService, { SampleDetail } from '@/services/sampleService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/errorHandler';
import { OPERATION_ERROR_MESSAGES } from '@/lib/constants/errorMessages';

// Format date helper
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

const isOverdue = (dueDate: string | null, status: string | null): boolean => {
  if (!dueDate || status?.toLowerCase() === 'completed') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due < today;
};

export default function SampleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sample, setSample] = useState<SampleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const sampleId = Number(params.id);

  useEffect(() => {
    const fetchSample = async () => {
      if (!sampleId || isNaN(sampleId)) {
        toast.error('Invalid sample ID');
        router.push('/operational/sample');
        return;
      }

      try {
        setLoading(true);
        const data = await sampleService.getSampleDetail(sampleId);
        setSample(data);
      } catch (error) {
        toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('sample')));
        router.push('/operational/sample');
      } finally {
        setLoading(false);
      }
    };

    fetchSample();
  }, [sampleId, router]);

  // Calculate worksheet status counts (grouped into 4 categories)
  const getStatusCounts = () => {
    if (!sample?.worksheets) {
      return { inProgress: 0, completed: 0, needRevised: 0, cancel: 0 };
    }

    return sample.worksheets.reduce(
      (acc, ws) => {
        const status = ws.status || 'Process';
        // In Progress: Process, To Be Verified
        if (status === 'Process' || status === 'To Be Verified') {
          acc.inProgress++;
        }
        // Completed: Verified by QC, Approved by TM
        else if (status === 'Verified by QC' || status === 'Approved by TM') {
          acc.completed++;
        }
        // Need Revised: Need to Revised, Internal Retest, Customer Retest
        else if (status === 'Need to Revised' || status === 'Internal Retest' || status === 'Customer Retest') {
          acc.needRevised++;
        }
        // Cancel
        else if (status === 'Cancel') {
          acc.cancel++;
        }
        return acc;
      },
      { inProgress: 0, completed: 0, needRevised: 0, cancel: 0 }
    );
  };

  const handlePrint = () => {
    toast.info('Print functionality coming soon');
  };

  const handleExport = () => {
    toast.info('Export functionality coming soon');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">Sample not found</h2>
        <p className="text-muted-foreground mb-4">
          The sample you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild>
          <Link href="/operational/sample">Back to Sample List</Link>
        </Button>
      </div>
    );
  }

  const statusCounts = getStatusCounts();
  const overdueStatus = isOverdue(sample.dueDate, sample.sampleStatus);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-9 w-9">
            <Link href="/operational/sample">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{sample.code}</h1>
              <StatusBadge status={sample.sampleStatus} />
              {overdueStatus && (
                <Badge variant="destructive" className="text-xs">OVERDUE</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{sample.name || 'Unnamed Sample'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Sample Information Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FlaskConical className="h-4 w-4 text-primary" />
            </div>
            Sample Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Sample Name */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample Name</p>
            <p className="text-sm font-medium">{sample.name || '-'}</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-4 border-t">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Customer</p>
              <p className="text-sm font-medium">
                {sample.order?.customerId ? (
                  <Link href={`/master/customer/${sample.order.customerId}`} className="text-primary hover:underline">
                    {sample.order.customerName}
                  </Link>
                ) : (
                  sample.order?.customerName || '-'
                )}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Order</p>
              <p className="text-sm font-medium">
                {sample.order?.id ? (
                  <Link href={`/operational/order/${sample.order.id}`} className="text-primary hover:underline">
                    {sample.order.code}
                  </Link>
                ) : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Volume</p>
              <p className="text-sm font-medium">{sample.volume || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Storage</p>
              <p className="text-sm font-medium">{sample.sampleStorage || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Quantity</p>
              <p className="text-sm font-medium">{sample.quantity || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Price</p>
              <p className="text-sm font-medium">
                {sample.price ? `Rp ${sample.price.toLocaleString('id-ID')}` : '-'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Discount</p>
              <p className="text-sm font-medium">{sample.discount ? `${sample.discount}%` : '-'}</p>
            </div>
          </div>

          {sample.description && (
            <div className="pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Description</p>
              <div className="p-4 rounded-lg border bg-muted/30">
                <RenderHTML html={sample.description} className="text-sm" />
              </div>
            </div>
          )}

          {sample.resultSummary && (
            <div className="pt-6 border-t">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Result Summary</p>
              <div className="p-4 rounded-lg border bg-muted/30">
                <RenderHTML html={sample.resultSummary} className="text-sm" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status & Progress Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            Status & Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Status Fields */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sample Status</p>
              <StatusBadge status={sample.sampleStatus} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lead Time</p>
              <p className="text-sm font-medium">{sample.leadTime || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
              <PriorityBadge
                status={sample.priority?.toLowerCase() || 'normal'}
                colorMap={PRIORITY_COLORS}
                labelMap={PRIORITY_LABELS}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Standard</p>
              <p className="text-sm font-medium">{sample.standardName || '-'}</p>
            </div>
          </div>

          {/* Worksheet Progress */}
          <div className="pt-4 border-t">
            <ProgressBar
              completed={sample.worksheetProgress.completed}
              total={sample.worksheetProgress.total}
              label="Worksheet Progress"
              showCount
            />
          </div>

          {/* Status Counts */}
          <div className="grid grid-cols-4 gap-3 pt-4 border-t">
            <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <p className="text-2xl font-bold text-blue-600">{statusCounts.inProgress}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
              <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20">
              <p className="text-2xl font-bold text-orange-600">{statusCounts.needRevised}</p>
              <p className="text-xs text-muted-foreground">Need Revised</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/20">
              <p className="text-2xl font-bold text-red-600">{statusCounts.cancel}</p>
              <p className="text-xs text-muted-foreground">Cancel</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Card */}
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Received Date</p>
              <p className="text-sm font-medium">{formatDate(sample.receivedDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</p>
              <p className={`text-sm font-medium ${overdueStatus ? 'text-red-600' : ''}`}>
                {formatDate(sample.dueDate)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">COA Release Due</p>
              <p className="text-sm font-medium">{formatDate(sample.coaReleaseDueDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Analysis Finished</p>
              <p className="text-sm font-medium">{formatDate(sample.analysisFinishedDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">COA Released</p>
              <p className="text-sm font-medium">{formatDate(sample.coaReleasedDate)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Retain Until</p>
              <p className="text-sm font-medium">{formatDate(sample.retainDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Worksheets Table */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Beaker className="h-4 w-4 text-primary" />
            </div>
            Worksheets ({sample.worksheets.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {sample.worksheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Beaker className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No worksheets found for this sample</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium">Code</th>
                    <th className="text-left px-4 py-3 font-medium">Parameter</th>
                    <th className="text-left px-4 py-3 font-medium">Method</th>
                    <th className="text-left px-4 py-3 font-medium">Result</th>
                    <th className="text-left px-4 py-3 font-medium">Unit</th>
                    <th className="text-left px-4 py-3 font-medium">Min</th>
                    <th className="text-left px-4 py-3 font-medium">Max</th>
                    <th className="text-left px-4 py-3 font-medium">Analyst</th>
                    <th className="text-left px-4 py-3 font-medium">Finish Date</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sample.worksheets.map((worksheet) => (
                    <tr key={worksheet.id} className="border-b hover:bg-muted/20">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {worksheet.code}
                      </td>
                      <td className="px-4 py-3">
                        <RenderHTML html={worksheet.parameter} />
                        {worksheet.packageName && (
                          <span className="text-xs text-muted-foreground block">
                            Pkg: <RenderHTML html={worksheet.packageName} />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {worksheet.method || '-'}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        {worksheet.result || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <RenderHTML html={worksheet.unit || '-'} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <RenderHTML html={worksheet.min || '-'} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <RenderHTML html={worksheet.max || '-'} />
                      </td>
                      <td className="px-4 py-3">
                        {worksheet.analystName || '-'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(worksheet.finishDate)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={worksheet.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
