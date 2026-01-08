'use client';

import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, FileText, Layers, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { standards, customers, services, packages, units, methods } from "@/data/masterData";
import { toast } from "sonner";

// Mock data for standard items (in real app, would be fetched from API)
interface StandardItem {
  id: string;
  sourceType: "service" | "package";
  sourceId: string;
  parameter: string;
  method: string;
  matrix: string;
  matrixId: string;
  minValue: string;
  maxValue: string;
  unitId: string;
  unitName: string;
}

const generateMockItems = (standardId: string): StandardItem[] => {
  // Generate mock items based on standard id
  const mockServices = services.slice(0, 3);
  return mockServices.map((service, idx) => {
    const method = methods.find((m) => m.id === service.methodId);
    const unit = units[idx % units.length];
    return {
      id: `item-${standardId}-${idx}`,
      sourceType: "service" as const,
      sourceId: service.id,
      parameter: service.parameter,
      method: service.method,
      matrix: method?.matrix || "",
      matrixId: method?.matrixId || "",
      minValue: String((idx + 1) * 10),
      maxValue: String((idx + 1) * 100),
      unitId: unit.id,
      unitName: unit.name,
    };
  });
};

export default function StandardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  
  const standard = standards.find((s) => s.id === id);
  const standardItems = useMemo(() => id ? generateMockItems(id) : [], [id]);
  
  // Mock customer relation
  const customer = customers[0];

  const handleDelete = () => {
    toast.success("Standard deleted successfully");
    router.push("/master/standard");
  };

  if (!standard) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Standard not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.push("/master/standard")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Standard Detail</h1>
            <p className="text-sm text-muted-foreground mt-1">View standard information</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/master/standard/${id}/edit`)}
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Standard</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this standard? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Standard Information Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            Standard Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr_1fr] gap-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Code
              </label>
              <Input
                value={standard.code}
                disabled
                className="h-10 bg-muted/30 border-muted"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name Standard
              </label>
              <Input
                value={standard.name}
                disabled
                className="h-10 bg-muted/30 border-muted"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Users className="h-3.5 w-3.5" />
                Customer
              </label>
              <Input
                value={`${customer.code} - ${customer.name}`}
                disabled
                className="h-10 bg-muted/30 border-muted"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Layers className="h-4 w-4 text-primary" />
            </div>
            Standard Items
            {standardItems.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({standardItems.length} items)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {standardItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No items in this standard</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Parameter</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Matrix</TableHead>
                    <TableHead>Min. Value</TableHead>
                    <TableHead>Max. Value</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standardItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.parameter}</TableCell>
                      <TableCell>{item.method}</TableCell>
                      <TableCell>
                        <span className="text-sm">{item.matrix || "-"}</span>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.minValue}
                          disabled
                          className="h-9 w-24 bg-muted/30"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.maxValue}
                          disabled
                          className="h-9 w-24 bg-muted/30"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.unitName}
                          disabled
                          className="h-9 w-32 bg-muted/30"
                        />
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








