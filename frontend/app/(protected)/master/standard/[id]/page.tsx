'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, FileText, Layers, Users, Loader2 } from "lucide-react";
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
import { standardService, Standard } from "@/services/standardService";
import { RenderHTML } from "@/components/shared/RenderHTML";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";

export default function StandardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [standard, setStandard] = useState<Standard | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchStandard = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const response = await standardService.getById(id);
        setStandard(response.data);
      } catch (error) {
        console.error('Error fetching standard:', error);
        toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('standard')));
      } finally {
        setLoading(false);
      }
    };
    fetchStandard();
  }, [id]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await standardService.delete(id);
      toast.success("Standard deleted successfully");
      router.push("/master/standard");
    } catch (error) {
      console.error('Error deleting standard:', error);
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.DELETE('standard')));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
              <Button variant="destructive" className="gap-2" disabled={deleting}>
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
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
                value={standard.customer ? `${standard.customer.code} - ${standard.customer.customer_name}` : '-'}
                disabled
                className="h-10 bg-muted/30 border-muted"
              />
            </div>
          </div>

          {standard.category && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Category
                </label>
                <Input
                  value={standard.category.name}
                  disabled
                  className="h-10 bg-muted/30 border-muted"
                />
              </div>
            </div>
          )}
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
            {standard.standartDetails && standard.standartDetails.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({standard.standartDetails.length} items)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!standard.standartDetails || standard.standartDetails.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No items in this standard</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Service</TableHead>
                    <TableHead>Parameter</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Min. Value</TableHead>
                    <TableHead>Max. Value</TableHead>
                    <TableHead>Unit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standard.standartDetails.map((detail, index) => (
                    <TableRow key={detail.id || index}>
                      <TableCell className="font-medium">
                        {detail.service?.code || '-'} - <RenderHTML html={detail.service?.name} />
                      </TableCell>
                      <TableCell><RenderHTML html={detail.service?.parameter?.name} /></TableCell>
                      <TableCell><RenderHTML html={detail.service?.method?.name} /></TableCell>
                      <TableCell>
                        <div className="h-9 w-auto min-w-24 px-3 py-2 bg-muted/30 rounded-md border border-input flex items-center">
                          <RenderHTML html={detail.min} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-9 w-auto min-w-24 px-3 py-2 bg-muted/30 rounded-md border border-input flex items-center">
                          <RenderHTML html={detail.max} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="h-9 w-auto min-w-32 px-3 py-2 bg-muted/30 rounded-md border border-input flex items-center">
                          <RenderHTML html={detail.unit} />
                        </div>
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
