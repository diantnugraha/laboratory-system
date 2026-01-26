'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Edit, RefreshCw, Loader2, FlaskConical, Calendar, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getSampleDetail, SampleDetail } from '@/services/sampleService';
import { Breadcrumb } from '@/components/shared/Breadcrumb';
import { StatusBadge, ProgressBar, VerificationStatus } from '@/components/shared/StatusProgress';
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

export default function SampleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const orderId = params.id as string;
  const sampleId = params.sampleId as string;

  const [sample, setSample] = useState<SampleDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSample = async () => {
    try {
      setLoading(true);
      const data = await getSampleDetail(parseInt(sampleId));
      setSample(data);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load sample details',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sampleId) {
      fetchSample();
    }
  }, [sampleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sample) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Sample not found</p>
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Orders', href: '/operational/order' },
          { label: sample.order.code, href: `/operational/order/${orderId}` },
          { label: sample.code },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">{sample.code}</h1>
            <StatusBadge status={sample.sampleStatus} />
          </div>
          <p className="text-muted-foreground ml-12">
            <RenderHTML html={sample.name} />
          </p>
          <p className="text-sm text-muted-foreground ml-12">
            Order: <Link href={`/operational/order/${orderId}`} className="text-primary hover:underline">{sample.order.code}</Link>
            {sample.order.customerName && ` • ${sample.order.customerName}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchSample}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Status & Progress Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Status & Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Sample Status</p>
              <StatusBadge status={sample.sampleStatus} className="mt-1" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Lead Time</p>
              <p className="text-sm font-medium mt-1">
                <RenderHTML html={sample.leadTime} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Priority</p>
              <p className="text-sm font-medium mt-1">
                <RenderHTML html={sample.priority} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Standard</p>
              <p className="text-sm font-medium mt-1">
                <RenderHTML html={sample.standardName} />
              </p>
            </div>
          </div>

          {/* Verification Status */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <VerificationStatus
              label="Verification (Micro)"
              isDone={sample.verificationStatusMicro === 1}
            />
            <VerificationStatus
              label="Verification (Chem)"
              isDone={sample.verificationStatusChem === 1}
            />
          </div>

          {/* Worksheet Progress */}
          <div className="pt-2 border-t">
            <ProgressBar
              completed={sample.worksheetProgress.completed}
              total={sample.worksheetProgress.total}
              label="Worksheet Progress"
              showCount
            />
          </div>
        </CardContent>
      </Card>

      {/* Timeline Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Received Date</p>
              <p className="text-sm font-medium mt-1">{formatDate(sample.receivedDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Due Date</p>
              <p className="text-sm font-medium mt-1">{formatDate(sample.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">COA Release Due</p>
              <p className="text-sm font-medium mt-1">{formatDate(sample.coaReleaseDueDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Analysis Finished</p>
              <p className="text-sm font-medium mt-1">{formatDate(sample.analysisFinishedDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">COA Released</p>
              <p className="text-sm font-medium mt-1">{formatDate(sample.coaReleasedDate)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Retain Until</p>
              <p className="text-sm font-medium mt-1">{formatDate(sample.retainDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Sample Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase">Description</p>
              <p className="text-sm font-medium mt-1">
                <RenderHTML html={sample.description} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Volume</p>
              <p className="text-sm font-medium mt-1">
                <RenderHTML html={sample.volume} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Storage</p>
              <p className="text-sm font-medium mt-1">
                <RenderHTML html={sample.sampleStorage} />
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Quantity</p>
              <p className="text-sm font-medium mt-1">{sample.quantity || '-'}</p>
            </div>
          </div>
          {sample.resultSummary && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground uppercase">Result Summary</p>
              <div className="text-sm mt-1 whitespace-pre-wrap">
                <RenderHTML html={sample.resultSummary} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Worksheets Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Worksheets ({sample.worksheets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sample.worksheets.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No worksheets found for this sample
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Min</TableHead>
                    <TableHead>Max</TableHead>
                    <TableHead>Analyst</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.worksheets.map((ws) => (
                    <TableRow key={ws.id}>
                      <TableCell>
                        <Link
                          href={`/operational/order/${orderId}/sample/${sampleId}/worksheet/${ws.id}`}
                          className="text-primary hover:underline font-medium"
                        >
                          {ws.code}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div>
                          <RenderHTML html={ws.parameter} />
                          {ws.packageName && (
                            <span className="text-xs text-muted-foreground block">
                              Pkg: <RenderHTML html={ws.packageName} />
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <RenderHTML html={ws.method} />
                      </TableCell>
                      <TableCell>
                        <RenderHTML html={ws.result} className="font-medium" />
                      </TableCell>
                      <TableCell>
                        <RenderHTML html={ws.unit} />
                      </TableCell>
                      <TableCell>
                        <RenderHTML html={ws.min} />
                      </TableCell>
                      <TableCell>
                        <RenderHTML html={ws.max} />
                      </TableCell>
                      <TableCell>{ws.analystName || '-'}</TableCell>
                      <TableCell>{formatDate(ws.dueDate)}</TableCell>
                      <TableCell>
                        <StatusBadge status={ws.status} size="sm" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
