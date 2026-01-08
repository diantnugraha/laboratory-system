'use client';

import { useState } from "react";
import Link from 'next/link';
import { DataTable, Column } from "@/components/shared/DataTable";
import { contacts, Contact } from "@/data/masterData";
import { Badge } from "@/components/ui/badge";
import { ContactFormDialog } from "@/components/forms/ContactFormDialog";
import { RenderHTML } from "@/components/shared/RenderHTML";

const columns: Column<Contact>[] = [
  { 
    key: "name", 
    label: "Name",
    render: (item) => (
      <Link 
        href={`/master/contact/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.name} />
      </Link>
    ),
  },
  { 
    key: "email", 
    label: "Email",
    render: (item) => <RenderHTML html={item.email} />,
  },
  { 
    key: "phone", 
    label: "Phone",
    render: (item) => <RenderHTML html={item.phone} />,
  },
  { 
    key: "position", 
    label: "Position",
    render: (item) => <RenderHTML html={item.position} />,
  },
  { 
    key: "customer", 
    label: "Customer",
    render: (item) => <RenderHTML html={item.customer} />,
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

export default function ContactPage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <DataTable
        title="Contact"
        columns={columns}
        data={contacts}
        onAddNew={() => setDialogOpen(true)}
        addNewLabel="Add Contact"
        searchPlaceholder="Search contacts..."
      />
      <ContactFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
