'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable, Column } from "@/components/shared/DataTable";
import { customers, Customer } from "@/data/masterData";
import { Badge } from "@/components/ui/badge";
import { RenderHTML } from "@/components/shared/RenderHTML";

const columns: Column<Customer>[] = [
  { 
    key: "code", 
    label: "Code",
    render: (item) => (
      <Link 
        href={`/master/customer/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  { 
    key: "name", 
    label: "Customer Name",
    render: (item) => <RenderHTML html={item.name} />,
  },
  { 
    key: "businessLine", 
    label: "Business Line",
    render: (item) => <RenderHTML html={item.businessLine} />,
  },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <Badge variant={item.status === "Contract" ? "default" : "secondary"}>
        <RenderHTML html={item.status} />
      </Badge>
    ),
  },
];

export default function CustomerPage() {
  const router = useRouter();

  return (
    <DataTable
        title="Customer"
        columns={columns}
        data={customers}
        onAddNew={() => router.push("/master/customer/new")}
        addNewLabel="Add Customer"
        searchPlaceholder="Search customers..."
      />
  );
}
