'use client';

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Edit, Save, Trash2, X, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { analystTypes } from "@/data/masterData";
import { analystTypeSchema, AnalystTypeFormData } from "@/lib/schemas";
import { toast } from "sonner";

export default function AnalystTypeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [isEditing, setIsEditing] = useState(false);

  const analystType = analystTypes.find((a) => a.id === id);

  const form = useForm<AnalystTypeFormData>({
    resolver: zodResolver(analystTypeSchema),
    defaultValues: {
      name: "",
      description: "",
      status: "Active",
    },
  });

  useEffect(() => {
    if (isEditing && analystType) {
      form.reset({
        name: analystType.name,
      });
    }
  }, [isEditing, analystType, form]);

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset();
  };

  const onSubmit = (data: AnalystTypeFormData) => {
    console.log("Form data:", data);
    toast.success("Analyst Type updated successfully");
    setIsEditing(false);
  };

  const handleDelete = () => {
    toast.success("Analyst Type deleted successfully");
    router.push("/master/analyst-type");
  };

  if (!analystType) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Analyst Type not found</p>
      </div>
    );
  }

  // View Mode
  if (!isEditing) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/master/analyst-type")}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">Analyst Type</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{analystType.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
              className="gap-2 hover:border-primary hover:text-primary transition-colors"
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
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    analyst type "{analystType.name}".
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

        {/* Analyst Type Details Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              Analyst Type Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">Name</label>
                <Input value={analystType.name} disabled className="bg-muted" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label className="text-sm font-medium">List Service</label>
                <Textarea 
                  value={analystType.list_service || ""} 
                  disabled 
                  className="bg-muted min-h-[120px] resize-none" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Edit Mode
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCancelEdit}
              className="h-9 w-9 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-foreground">Edit Analyst Type</h1>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{analystType.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" className="gap-2">
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Edit Form Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <UserCog className="h-4 w-4 text-primary" />
              </div>
              Analyst Type Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2">
                    <FormLabel className="text-sm font-medium">Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Analyst type name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-2 sm:col-span-2">
                    <FormLabel className="text-sm font-medium">Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter list of services..." 
                        className="min-h-[120px] resize-none"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}








