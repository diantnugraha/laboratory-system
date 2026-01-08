'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable, Column } from "@/components/shared/DataTable";
import { standards, Standard } from "@/data/masterData";
import { Badge } from "@/components/ui/badge";
import { RenderHTML } from "@/components/shared/RenderHTML";

const columns: Column<Standard>[] = [
  { 
    key: "code", 
    label: "Code",
    render: (item) => (
      <Link 
        href={`/master/standard/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  { 
    key: "name", 
    label: "Standard Name",
    render: (item) => <RenderHTML html={item.name} />,
  },
];

export default function StandardPage() {
  const router = useRouter();

  return (
    <DataTable
        title="Standard"
        columns={columns}
        data={standards}
        onAddNew={() => router.push("/master/standard/new")}
        addNewLabel="Add Standard"
        searchPlaceholder="Search standards..."
      />
  );
}
