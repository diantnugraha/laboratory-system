'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, UserCog, Users } from 'lucide-react';
import { DataTable, Column } from "@/components/shared/DataTable";
import { userService, UserListItem, Role } from "@/services/userService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/useDebounce";
import { InternalUserFormDialog } from "@/components/forms/InternalUserFormDialog";
import { ExternalUserFormDialog } from "@/components/forms/ExternalUserFormDialog";

// External user roles (Customer = 16, Agency = 28)
const EXTERNAL_ROLE_IDS = [16, 28];

export default function UserPage() {
  const [activeTab, setActiveTab] = useState<string>("internal");

  // Dialog states
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [externalDialogOpen, setExternalDialogOpen] = useState(false);

  // Internal users state
  const [internalUsers, setInternalUsers] = useState<UserListItem[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalSearch, setInternalSearch] = useState('');
  const [internalPagination, setInternalPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  // External users state
  const [externalUsers, setExternalUsers] = useState<UserListItem[]>([]);
  const [externalLoading, setExternalLoading] = useState(true);
  const [externalSearch, setExternalSearch] = useState('');
  const [externalPagination, setExternalPagination] = useState({
    page: 1,
    limit: 30,
    total: 0,
    totalPages: 0,
  });

  // Roles for filter
  const [roles, setRoles] = useState<Role[]>([]);
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const debouncedInternalSearch = useDebounce(internalSearch, 500);
  const debouncedExternalSearch = useDebounce(externalSearch, 500);

  // Fetch internal users
  const fetchInternalUsers = useCallback(async (page: number = 1, search?: string) => {
    try {
      setInternalLoading(true);
      const response = await userService.getInternalUsers({
        page,
        limit: 30,
        search,
      });
      setInternalUsers(response.data);
      setInternalPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching internal users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch internal users');
    } finally {
      setInternalLoading(false);
    }
  }, []);

  // Fetch external users
  const fetchExternalUsers = useCallback(async (page: number = 1, search?: string) => {
    try {
      setExternalLoading(true);
      const response = await userService.getExternalUsers({
        page,
        limit: 30,
        search,
      });
      setExternalUsers(response.data);
      setExternalPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching external users:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch external users');
    } finally {
      setExternalLoading(false);
    }
  }, []);

  // Fetch roles for filter
  const fetchRoles = useCallback(async () => {
    try {
      const response = await userService.getRoles({ limit: 100 });
      setRoles(response.data);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
    }
  }, []);

  // Fetch internal users on search change
  useEffect(() => {
    fetchInternalUsers(1, debouncedInternalSearch);
  }, [fetchInternalUsers, debouncedInternalSearch]);

  // Fetch external users on search change
  useEffect(() => {
    fetchExternalUsers(1, debouncedExternalSearch);
  }, [fetchExternalUsers, debouncedExternalSearch]);

  // Fetch roles on mount
  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // Filter internal users by role (client-side since we already have the data)
  const filteredInternalUsers = useMemo(() => {
    if (roleFilter === 'all') return internalUsers;
    return internalUsers.filter(user => user.role_id === parseInt(roleFilter));
  }, [internalUsers, roleFilter]);

  // Get internal roles (exclude external roles)
  const internalRoles = useMemo(() => {
    return roles.filter(role => !EXTERNAL_ROLE_IDS.includes(role.id));
  }, [roles]);

  const handleAddUser = () => {
    if (activeTab === "internal") {
      setInternalDialogOpen(true);
    } else {
      setExternalDialogOpen(true);
    }
  };

  const handleUserCreated = () => {
    if (activeTab === "internal") {
      fetchInternalUsers(1, debouncedInternalSearch);
    } else {
      fetchExternalUsers(1, debouncedExternalSearch);
    }
  };

  // Pagination handlers
  const handleInternalPageChange = (page: number) => {
    fetchInternalUsers(page, debouncedInternalSearch);
  };

  const handleExternalPageChange = (page: number) => {
    fetchExternalUsers(page, debouncedExternalSearch);
  };

  // Internal user columns
  const internalColumns: Column<UserListItem>[] = [
    {
      key: "display_name",
      label: "Name",
      render: (item) => (
        <Link
          href={`/master/user/internal/${item.id}`}
          className="text-primary hover:underline font-medium"
        >
          {item.display_name}
        </Link>
      ),
    },
    {
      key: "username",
      label: "Username",
      render: (item) => (
        <span className="text-sm text-muted-foreground">@{item.username}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (item) => <span className="text-sm">{item.email}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (item) => (
        <Badge variant="outline">{item.role?.name || '-'}</Badge>
      ),
    },
    {
      key: "department",
      label: "Department",
      render: (item) => (
        <span className="text-sm">{item.department || '-'}</span>
      ),
    },
  ];

  // External user columns
  const externalColumns: Column<UserListItem>[] = [
    {
      key: "display_name",
      label: "Name",
      render: (item) => (
        <Link
          href={`/master/user/external/${item.id}`}
          className="text-primary hover:underline font-medium"
        >
          {item.display_name}
        </Link>
      ),
    },
    {
      key: "username",
      label: "Username",
      render: (item) => (
        <span className="text-sm text-muted-foreground">@{item.username}</span>
      ),
    },
    {
      key: "email",
      label: "Email",
      render: (item) => <span className="text-sm">{item.email}</span>,
    },
    {
      key: "role",
      label: "Role",
      render: (item) => (
        <Badge variant="outline">{item.role?.name || '-'}</Badge>
      ),
    },
    {
      key: "customer",
      label: "Customer",
      render: (item) => (
        <span className="text-sm">{item.customer?.customer_name || '-'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage internal and external users
          </p>
        </div>
        <Button onClick={handleAddUser} className="gap-2">
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="internal" className="flex items-center gap-2">
            <UserCog className="h-4 w-4" />
            Internal Users
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {internalPagination.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="external" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            External Users
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {externalPagination.total}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Internal Users Tab */}
        <TabsContent value="internal" className="mt-6 space-y-4">
          {/* Search + Role Filter Row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={internalSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select
              value={roleFilter}
              onValueChange={(value) => setRoleFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {internalRoles.map((role) => (
                  <SelectItem key={role.id} value={role.id.toString()}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground">
              {roleFilter === 'all' ? internalPagination.total : filteredInternalUsers.length} users
            </div>
          </div>

          {/* Internal Users Table */}
          <DataTable
            title=""
            columns={internalColumns}
            data={filteredInternalUsers}
            loading={internalLoading}
            searchPlaceholder=""
            pagination={roleFilter === 'all' ? internalPagination : undefined}
            onPageChange={roleFilter === 'all' ? handleInternalPageChange : undefined}
          />
        </TabsContent>

        {/* External Users Tab */}
        <TabsContent value="external" className="mt-6 space-y-4">
          {/* Search Row */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={externalSearch}
                onChange={(e) => setExternalSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              {externalPagination.total} users
            </div>
          </div>

          {/* External Users Table */}
          <DataTable
            title=""
            columns={externalColumns}
            data={externalUsers}
            loading={externalLoading}
            searchPlaceholder=""
            pagination={externalPagination}
            onPageChange={handleExternalPageChange}
          />
        </TabsContent>
      </Tabs>

      {/* Form Dialogs */}
      <InternalUserFormDialog
        open={internalDialogOpen}
        onOpenChange={setInternalDialogOpen}
        onSuccess={handleUserCreated}
      />
      <ExternalUserFormDialog
        open={externalDialogOpen}
        onOpenChange={setExternalDialogOpen}
        onSuccess={handleUserCreated}
      />
    </div>
  );
}
