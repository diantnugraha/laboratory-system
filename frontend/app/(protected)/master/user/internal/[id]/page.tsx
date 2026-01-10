'use client';

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Edit, Trash2, User, Loader2, Mail, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { userService, User as UserType, Role } from "@/services/userService";
import { toast } from "sonner";

// External role IDs to exclude
const EXTERNAL_ROLE_IDS = [16, 28];

// User form schema
const userFormSchema = z.object({
  username: z.string().min(1, "Username is required").max(50),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  display_name: z.string().min(1, "Display name is required").max(100),
  role_id: z.string().min(1, "Role is required"),
  department: z.string().optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function InternalUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      display_name: "",
      role_id: "",
      department: "",
    },
  });

  const fetchUser = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await userService.getById(id);
      setUser(response.data);
      // Set form values
      form.reset({
        username: response.data.username,
        email: response.data.email,
        display_name: response.data.display_name,
        role_id: response.data.role_id.toString(),
        department: response.data.department || "",
      });
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  }, [id, form]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await userService.getRoles({ limit: 100 });
      const internalRoles = response.data.filter(
        (role) => !EXTERNAL_ROLE_IDS.includes(role.id)
      );
      setRoles(internalRoles);
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  }, []);

  useEffect(() => {
    fetchUser();
    fetchRoles();
  }, [fetchUser, fetchRoles]);

  const handleSave = async (data: UserFormData) => {
    try {
      setSaving(true);
      await userService.update(id, {
        username: data.username,
        email: data.email,
        display_name: data.display_name,
        role_id: parseInt(data.role_id),
        department: data.department || null,
      });
      toast.success('User updated successfully');
      setIsEditing(false);
      fetchUser();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error.response?.data?.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await userService.delete(id);
      toast.success('User deleted successfully');
      router.push('/master/user');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleResendWelcome = async () => {
    try {
      setResendingEmail(true);
      const response = await userService.resendWelcome(id);
      toast.success('Welcome email sent successfully', {
        description: response.data?.password ? `New password: ${response.data.password}` : undefined,
        duration: 10000,
      });
    } catch (error: any) {
      console.error('Error resending welcome email:', error);
      toast.error(error.response?.data?.message || 'Failed to resend welcome email');
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (user) {
      form.reset({
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role_id: user.role_id.toString(),
        department: user.department || "",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="outline" onClick={() => router.push('/master/user')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/master/user')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{user.display_name}</h1>
            <p className="text-sm text-muted-foreground">@{user.username}</p>
          </div>
          <Badge variant="outline">{user.role?.name || 'No Role'}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={handleResendWelcome} disabled={resendingEmail}>
                {resendingEmail ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Resend Welcome
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(handleSave)} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader className="bg-gradient-to-r from-muted/50 to-transparent border-b">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            User Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {isEditing ? (
            <Form {...form}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="display_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {roles.map((role) => (
                              <SelectItem key={role.id} value={role.id.toString()}>
                                {role.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Display Name</p>
                <p className="font-medium">{user.display_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Username</p>
                <p className="font-medium">@{user.username}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Role</p>
                <p className="font-medium">{user.role?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Department</p>
                <p className="font-medium">{user.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString('id-ID', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : '-'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{user.display_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
