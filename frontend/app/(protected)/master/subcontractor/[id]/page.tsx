'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit, Trash2, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { SubcontractorFormDialog } from "@/components/forms/SubcontractorFormDialog";
import { subcontractorService, Subcontractor } from "@/services/subcontractorService";
import { toast } from "sonner";

export default function SubcontractorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [subcontractor, setSubcontractor] = useState<Subcontractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const fetchSubcontractor = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await subcontractorService.getById(id);
      setSubcontractor(response.data);
    } catch (error: any) {
      console.error('Error fetching subcontractor:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch subcontractor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSubcontractor();
  }, [fetchSubcontractor]);

  const handleDelete = async () => {
    try {
      await subcontractorService.delete(id);
      toast.success("Subcontractor deleted successfully");
      router.push("/master/subcontractor");
    } catch (error: any) {
      console.error('Error deleting subcontractor:', error);
      toast.error(error.response?.data?.message || 'Failed to delete subcontractor');
    }
  };

  const handleEditSuccess = () => {
    fetchSubcontractor();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!subcontractor) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Subcontractor not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/master/subcontractor")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-foreground">{subcontractor.lab_name}</h1>
          </div>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Subcontractor</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this subcontractor? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Subcontractor Info Card */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              Subcontractor Info
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Lab Name
              </p>
              <p className="text-sm font-medium">{subcontractor.lab_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Address
              </p>
              <p className="text-sm font-medium">{subcontractor.address_name}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Contact Person
              </p>
              <p className="text-sm font-medium">{subcontractor.contact}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Phone
              </p>
              <p className="text-sm font-medium">{subcontractor.phone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Fax
              </p>
              <p className="text-sm font-medium">{subcontractor.fax}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email
              </p>
              <p className="text-sm font-medium">{subcontractor.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <SubcontractorFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        editData={subcontractor}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
