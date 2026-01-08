'use client';

import { useState } from "react";
import Link from 'next/link';
import { DataTable, Column } from "@/components/shared/DataTable";
import { subcontractors, Subcontractor } from "@/data/masterData";
import { Badge } from "@/components/ui/badge";
import { SubcontractorFormDialog } from "@/components/forms/SubcontractorFormDialog";
import { RenderHTML } from "@/components/shared/RenderHTML";

const columns: Column<Subcontractor>[] = [
  { 
    key: "code", 
    label: "Code",
    render: (item) => (
      <Link 
        href={`/master/subcontractor/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  { 
    key: "name", 
    label: "Name",
    render: (item) => <RenderHTML html={item.name} />,
  },
  { 
    key: "contact", 
    label: "Contact",
    render: (item) => <RenderHTML html={item.contact} />,
  },
  { 
    key: "email", 
    label: "Email",
    render: (item) => <RenderHTML html={item.email} />,
  },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <Badge variant={item.status === "Active" ? "default" : "secondary"}>
        <RenderHTML html={item.status} />
      </Badge>
    ),
  },
];

export default function SubcontractorPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DataTable
        title="Subcontractor"
        columns={columns}
        data={subcontractors}
        onAddNew={() => setDialogOpen(true)}
        addNewLabel="Add Subcontractor"
        searchPlaceholder="Search subcontractors..."
      />
      <SubcontractorFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
