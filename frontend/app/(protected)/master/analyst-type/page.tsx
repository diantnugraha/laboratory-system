'use client';

import { useState } from "react";
import Link from 'next/link';
import { DataTable, Column } from "@/components/shared/DataTable";
import { analystTypes, AnalystType } from "@/data/masterData";
import { AnalystTypeFormDialog } from "@/components/forms/AnalystTypeFormDialog";
import { RenderHTML } from "@/components/shared/RenderHTML";

const columns: Column<AnalystType>[] = [
  { 
    key: "name", 
    label: "Name",
    render: (item) => (
      <Link 
        href={`/master/analyst-type/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.name} />
      </Link>
    ),
  },
  { 
    key: "list_service", 
    label: "List Service",
    render: (item) => (
      <span className="text-sm text-muted-foreground">
        {item.list_service ? (
          <RenderHTML html={item.list_service.length > 50 ? `${item.list_service.substring(0, 50)}...` : item.list_service} />
        ) : (
          "-"
        )}
      </span>
    ),
  },
];

export default function AnalystTypePage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DataTable
        title="Analyst Type"
        columns={columns}
        data={analystTypes}
        onAddNew={() => setDialogOpen(true)}
        addNewLabel="Add Analyst Type"
        searchPlaceholder="Search analyst types..."
      />
      <AnalystTypeFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}








