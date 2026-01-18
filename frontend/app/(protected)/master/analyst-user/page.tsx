'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, Users, Shield } from "lucide-react";
import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalystTypeWithServicesFormDialog } from "@/components/forms/AnalystTypeWithServicesFormDialog";
import { AnalystRuleFormDialog } from "@/components/forms/AnalystRuleFormDialog";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import {
  analystTypeService,
  AnalystType,
  parseListService,
} from "@/services/analystTypeService";
import {
  analystRules,
  AnalystRule,
} from "@/data/analystUserData";

// Interface for display in DataTable
interface AnalystTypeDisplay {
  id: number;
  name: string;
  serviceCount: number;
}

const typeColumns: Column<AnalystTypeDisplay>[] = [
  {
    key: "name",
    label: "Name",
    render: (item) => (
      <Link
        href={`/master/analyst-user/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        {item.name}
      </Link>
    ),
  },
  {
    key: "serviceCount",
    label: "Services",
    render: (item) => (
      <span className="text-muted-foreground">{item.serviceCount} services</span>
    ),
  },
];

const ruleColumns: Column<AnalystRule>[] = [
  {
    key: "userName",
    label: "Name",
    render: (item) => (
      <Link
        href={`/master/analyst-user/rule/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        {item.userName}
      </Link>
    ),
  },
  {
    key: "analystTypeName",
    label: "Analyst Type",
    render: (item) => (
      <span className="text-muted-foreground">{item.analystTypeName}</span>
    ),
  },
  {
    key: "accessAnalystTypes",
    label: "Access Analyst Type",
    render: (item) =>
      item.accessAnalystTypes.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {item.accessAnalystTypes.map((access) => (
            <Badge key={access.analystTypeId} variant="outline" className="text-xs">
              {access.analystTypeName}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      ),
  },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <Badge variant={item.status === "Active" ? "default" : "secondary"}>
        {item.status}
      </Badge>
    ),
  },
];

export default function AnalystUserPage() {
  const [activeTab, setActiveTab] = useState("analyst-type");
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);

  // Analyst Types state
  const [analystTypes, setAnalystTypes] = useState<AnalystTypeDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch analyst types
  const fetchAnalystTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await analystTypeService.getAll({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch || undefined,
      });

      // Transform data for display
      const displayData: AnalystTypeDisplay[] = response.data.map((item: AnalystType) => ({
        id: item.id,
        name: item.name,
        serviceCount: item.serviceCount ?? parseListService(item.list_service).length,
      }));

      setAnalystTypes(displayData);
      setPagination((prev) => ({
        ...prev,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      }));
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('analyst types')));
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, debouncedSearch]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchAnalystTypes();
  }, [fetchAnalystTypes]);

  // Reset page when search changes
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch]);

  const handleAddNew = () => {
    if (activeTab === "analyst-type") {
      setTypeDialogOpen(true);
    } else {
      setRuleDialogOpen(true);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleTypeDialogSuccess = () => {
    fetchAnalystTypes();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analyst User</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage analyst types and analyst rules
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          {activeTab === "analyst-type" ? "Add Analyst Type" : "Add Analyst Rule"}
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="analyst-type" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Analyst Type
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {pagination.total}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="analyst-rules" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Analyst Rules
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {analystRules.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analyst-type" className="mt-6">
          <DataTable
            title=""
            columns={typeColumns}
            data={analystTypes}
            loading={loading}
            searchPlaceholder="Search analyst types..."
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            pagination={pagination}
            onPageChange={handlePageChange}
          />
        </TabsContent>

        <TabsContent value="analyst-rules" className="mt-6">
          <DataTable
            title=""
            columns={ruleColumns}
            data={analystRules}
            searchPlaceholder="Search analyst rules..."
          />
        </TabsContent>
      </Tabs>

      {/* Form Dialogs */}
      <AnalystTypeWithServicesFormDialog
        open={typeDialogOpen}
        onOpenChange={setTypeDialogOpen}
        onSuccess={handleTypeDialogSuccess}
      />
      <AnalystRuleFormDialog
        open={ruleDialogOpen}
        onOpenChange={setRuleDialogOpen}
      />
    </div>
  );
}
