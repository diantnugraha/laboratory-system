import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { testResults, samples } from '@/data/mockData';
import { Search } from 'lucide-react';

const Results = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const resultsWithPatient = testResults.map((result) => {
    const sample = samples.find((s) => s.id === result.sampleId);
    return {
      ...result,
      patientName: sample?.patientName || 'Unknown',
    };
  });

  const filteredResults = resultsWithPatient.filter(
    (result) =>
      result.sampleId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.testName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      result.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Test Results</h1>
          <p className="text-muted-foreground mt-1">View and manage laboratory test results</p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by sample ID, test, or patient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Table */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              All Results ({filteredResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Flag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResults.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">{result.sampleId}</TableCell>
                    <TableCell>{result.patientName}</TableCell>
                    <TableCell>{result.testName}</TableCell>
                    <TableCell className="font-mono">{result.result}</TableCell>
                    <TableCell>{result.unit || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{result.referenceRange}</TableCell>
                    <TableCell>
                      {result.flag && (
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
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={result.status} />
                    </TableCell>
                    <TableCell>{result.performedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Results;
