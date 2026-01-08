import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { samples, testResults } from '@/data/mockData';
import { FileText, Download, Printer, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const Reports = () => {
  const { toast } = useToast();

  const completedSamples = samples.filter((s) => s.status === 'Completed' || s.status === 'Released');

  const handleExport = () => {
    toast({
      title: 'Export Started',
      description: 'Your report is being generated and will download shortly.',
    });
  };

  const handlePrint = () => {
    toast({
      title: 'Preparing Print',
      description: 'Opening print dialog...',
    });
    window.print();
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Reports</h1>
            <p className="text-muted-foreground mt-1">Generate and export laboratory reports</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{completedSamples.length}</p>
                  <p className="text-sm text-muted-foreground">Completed Reports</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{testResults.length}</p>
                  <p className="text-sm text-muted-foreground">Total Results</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">Today</p>
                  <p className="text-sm text-muted-foreground">Report Period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Completed Sample Reports */}
        <Card className="animate-fade-in">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Available Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedSamples.map((sample) => {
                const sampleResults = testResults.filter((r) => r.sampleId === sample.id);
                return (
                  <div
                    key={sample.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{sample.id}</p>
                        <p className="text-sm text-muted-foreground">
                          {sample.patientName} • {sample.sampleType} • {sampleResults.length} test(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          sample.status === 'Released'
                            ? 'status-released'
                            : 'status-completed'
                        }`}
                      >
                        {sample.status}
                      </span>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Reports;
