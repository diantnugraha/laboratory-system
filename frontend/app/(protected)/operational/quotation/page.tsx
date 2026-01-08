'use client';

import { useState } from "react";

import { DataTable, Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Quotation {
  id: string;
  code: string;
  customer: string;
  date: string;
  totalAmount: number;
  status: "Draft" | "Sent" | "Approved" | "Rejected";
}

const mockQuotations: Quotation[] = Array.from({ length: 20 }, (_, i) => ({
  id: `quot-${i + 1}`,
  code: `QUO-${String(i + 1).padStart(4, "0")}`,
  customer: `Customer ${(i % 10) + 1}`,
  date: `2024-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  totalAmount: Math.floor(Math.random() * 50000 + 5000) * 1000,
  status: ["Draft", "Sent", "Approved", "Rejected"][i % 4] as Quotation["status"],
}));

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const getStatusVariant = (status: Quotation["status"]) => {
  switch (status) {
    case "Draft":
      return "secondary";
    case "Sent":
      return "default";
    case "Approved":
      return "default";
    case "Rejected":
      return "destructive";
    default:
      return "secondary";
  }
};

const columns: Column<Quotation>[] = [
  { key: "code", label: "Code" },
  { key: "customer", label: "Customer" },
  { key: "date", label: "Date" },
  {
    key: "totalAmount",
    label: "Total Amount",
    render: (item) => formatCurrency(item.totalAmount),
  },
  {
    key: "status",
    label: "Status",
    render: (item) => (
      <Badge variant={getStatusVariant(item.status)}>
        {item.status}
      </Badge>
    ),
  },
];

export default function QuotationPage() {
  const handleAddNew = () => {
    toast.info("Add new quotation form will be implemented");
  };

  return (
    
      <DataTable
        title="Quotation"
        columns={columns}
        data={mockQuotations}
        onAddNew={handleAddNew}
        addNewLabel="Add Quotation"
        searchPlaceholder="Search quotations..."
      />
    
  );
}
