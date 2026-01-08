'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DataTable, Column } from "@/components/shared/DataTable";
import { packages, Package } from "@/data/masterData";
import { Badge } from "@/components/ui/badge";
import { RenderHTML } from "@/components/shared/RenderHTML";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const columns: Column<Package>[] = [
  { 
    key: "code", 
    label: "Code",
    render: (item) => (
      <Link 
        href={`/master/package/${item.id}`}
        className="text-primary hover:underline font-medium"
      >
        <RenderHTML html={item.code} />
      </Link>
    ),
  },
  { 
    key: "name", 
    label: "Package Name",
    render: (item) => <RenderHTML html={item.name} />,
  },
  {
    key: "price",
    label: "Price (IDR)",
    render: (item) => formatCurrency(item.price),
  },
];

export default function PackagePage() {
  const router = useRouter();

  return (
    <DataTable
        title="Package"
        columns={columns}
        data={packages}
        onAddNew={() => router.push("/master/package/new")}
        addNewLabel="Add Package"
        searchPlaceholder="Search packages..."
      />
  );
}
