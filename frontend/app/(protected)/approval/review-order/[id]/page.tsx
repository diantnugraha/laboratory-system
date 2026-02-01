'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  Check,
  X,
  Loader2,
  ExternalLink,
  FileImage,
  File,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { orderService, Order } from "@/services/orderService";
import { OrderRejectDialog } from "@/components/forms/OrderRejectDialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils/errorHandler";
import { OPERATION_ERROR_MESSAGES } from "@/lib/constants/errorMessages";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/constants/orderStatus";

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')) {
    return <FileImage className="h-4 w-4 flex-shrink-0" />;
  }
  return <File className="h-4 w-4 flex-shrink-0" />;
};

const isImageFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '');
};

const isPdfFile = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext === 'pdf';
};

// Truncate filename for display
const truncateFilename = (filename: string, maxLength: number = 20) => {
  if (filename.length <= maxLength) return filename;
  const ext = filename.split('.').pop();
  const name = filename.slice(0, filename.lastIndexOf('.'));
  const truncatedName = name.slice(0, maxLength - 3 - (ext?.length || 0));
  return `${truncatedName}...${ext}`;
};

export default function ReviewOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [documents, setDocuments] = useState<string[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      setLoading(true);
      const response = await orderService.getById(id);
      setOrder(response.data);

      const documentStr = response.data.document;
      if (documentStr) {
        const docs = documentStr.split(';;').filter(Boolean).map(d => d.trim());
        setDocuments(docs);
        if (docs.length > 0) {
          setSelectedDocument(docs[0]);
        }
      }
    } catch (error) {
      toast.error(getErrorMessage(error, OPERATION_ERROR_MESSAGES.FETCH('order')));
      router.push('/approval/review-order');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const loadOrderDetailPdf = useCallback(async () => {
    try {
      setPdfLoading(true);
      const blob = await orderService.downloadDocument(id, 'order_detail');
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to load order detail PDF'));
    } finally {
      setPdfLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    loadOrderDetailPdf();
  }, [fetchOrder, loadOrderDetailPdf]);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      await orderService.review(id, { status: 'Reviewed' });
      toast.success('Order approved successfully');
      router.push('/approval/review-order');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to approve order'));
    } finally {
      setApproving(false);
    }
  };

  const handleRejectSuccess = () => {
    router.push('/approval/review-order');
  };

  const getDocumentUrl = (filename: string) => {
    return `${process.env.NEXT_PUBLIC_API_URL}/uploads/orders/${filename}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Order not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/approval/review-order')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-foreground">
              Review Order: {order.code}
            </h1>
            <StatusBadge
              status={order.orderStatus?.toLowerCase() || ''}
              colorMap={ORDER_STATUS_COLORS}
              labelMap={ORDER_STATUS_LABELS}
            />
          </div>
        </div>
      </div>

      {/* Main Content - Side by Side */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 py-4 overflow-hidden">
        {/* Left Panel - Order Detail PDF */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Order Detail PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            {pdfLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="Order Detail PDF"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Failed to load PDF
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Uploaded Documents */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="border-b py-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Uploaded Documents ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
            {documents.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                No documents uploaded
              </div>
            ) : (
              <>
                {/* Document Tabs - Horizontal scrollable */}
                <div className="flex items-center gap-2 p-2 border-b overflow-x-auto">
                  {documents.map((doc, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedDocument(doc)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                        selectedDocument === doc
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                      title={doc}
                    >
                      {getFileIcon(doc)}
                      <span>{truncateFilename(doc)}</span>
                    </button>
                  ))}
                  {selectedDocument && (
                    <a
                      href={getDocumentUrl(selectedDocument)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1.5 text-sm text-muted-foreground hover:text-primary ml-auto"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Document Preview - Full height */}
                <div className="flex-1 overflow-hidden">
                  {selectedDocument && (
                    <>
                      {isImageFile(selectedDocument) ? (
                        <div className="h-full flex items-center justify-center p-4 bg-muted/30">
                          <img
                            src={getDocumentUrl(selectedDocument)}
                            alt={selectedDocument}
                            className="max-w-full max-h-full object-contain"
                          />
                        </div>
                      ) : isPdfFile(selectedDocument) ? (
                        <iframe
                          src={getDocumentUrl(selectedDocument)}
                          className="w-full h-full border-0"
                          title={selectedDocument}
                        />
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                          <File className="h-16 w-16" />
                          <p>Preview not available for this file type</p>
                          <a
                            href={getDocumentUrl(selectedDocument)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Open in new tab
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-end gap-4 pt-4 border-t">
        <Button
          variant="outline"
          className="gap-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
          onClick={() => setRejectDialogOpen(true)}
          disabled={approving}
        >
          <X className="h-4 w-4" />
          Reject
        </Button>
        <Button
          className="gap-2 bg-green-600 hover:bg-green-700"
          onClick={handleApprove}
          disabled={approving}
        >
          {approving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Approving...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Approve
            </>
          )}
        </Button>
      </div>

      {/* Reject Dialog */}
      <OrderRejectDialog
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        orderId={order?.id || null}
        orderCode={order?.code || null}
        onSuccess={handleRejectSuccess}
      />
    </div>
  );
}
