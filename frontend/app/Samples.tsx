import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/ui/StatusBadge';
import { samples } from '@/data/mockData';
import { Plus, Search, Eye } from 'lucide-react';
'use client';

import { useRouter } from 'next/navigation';

const Samples = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSamples = samples.filter(
    (sample) =>
      sample.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sample.sampleType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Samples</h1>
            <p className="text-muted-foreground mt-1">Manage and track all laboratory samples</p>
          </div>
          <Button onClick={() => router.push('/samples/new')} className="gap-2">
            <Plus className="h-4 w-4" />
            Register Sample
          </Button>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, patient, or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Samples Table */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">
              All Samples ({filteredSamples.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.map((sample) => (
                  <TableRow key={sample.id}>
                    <TableCell className="font-medium">{sample.id}</TableCell>
                    <TableCell>{sample.patientName}</TableCell>
                    <TableCell>{sample.sampleType}</TableCell>
                    <TableCell>{sample.source}</TableCell>
                    <TableCell>{sample.receivedDate}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={sample.priority} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={sample.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/samples/${sample.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
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

export default Samples;
