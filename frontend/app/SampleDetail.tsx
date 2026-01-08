'use client';

import { useParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { samples, testResults } from '@/data/mockData';
import { ArrowLeft, User, TestTube, Calendar, Building, FileText } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const SampleDetail = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const sample = samples.find((s) => s.id === id);
  const sampleResults = testResults.filter((r) => r.sampleId === id);

  if (!sample) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Sample not found</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/samples')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">{sample.id}</h1>
              <StatusBadge status={sample.status} />
              <PriorityBadge priority={sample.priority} />
            </div>
            <p className="text-muted-foreground mt-1">Sample Details</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Info */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-4 w-4" />
                Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{sample.patientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {sample.source}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sample Info */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Sample Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{sample.sampleType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Collection Date</p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {sample.collectionDate}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received Date</p>
                <p className="font-medium">{sample.receivedDate}</p>
              </div>
            </CardContent>
          </Card>

          {/* Tests */}
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Assigned Tests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {sample.tests.map((test, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-sm font-medium">{test}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Results Table */}
        {sampleResults.length > 0 && (
          <Card className="animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Reference Range</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Performed By</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleResults.map((result) => (
                    <TableRow key={result.id}>
                      <TableCell className="font-medium">{result.testName}</TableCell>
                      <TableCell>{result.result}</TableCell>
                      <TableCell>{result.unit}</TableCell>
                      <TableCell>{result.referenceRange}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            result.flag === 'Normal'
                              ? 'bg-green-100 text-green-700'
                              : result.flag === 'High'
                              ? 'bg-red-100 text-red-700'
                              : result.flag === 'Low'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-200 text-red-800'
                          }`}
                        >
                          {result.flag}
                        </span>
                      </TableCell>
                      <TableCell>{result.performedBy}</TableCell>
                      <TableCell>{result.performedAt}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default SampleDetail;
