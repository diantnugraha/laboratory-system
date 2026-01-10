'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, Mail, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/services/api';

interface Contact {
  id: number;
  first_name: string;
  surname?: string | null;
  email: string;
  customer_id: number;
  customer?: {
    id: number;
    name: string;
  } | null;
}

interface CreateUserFromContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact;
  onSuccess: () => void;
}

export function CreateUserFromContactDialog({
  open,
  onOpenChange,
  contact,
  onSuccess,
}: CreateUserFromContactDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const response = await api.post('/users/from-contact', {
        contact_id: contact.id,
      });

      if (response.data.success) {
        toast.success('User created successfully. Welcome email has been sent.');
        onOpenChange(false);
        onSuccess();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = `${contact.first_name} ${contact.surname || ''}`.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create User from Contact
          </DialogTitle>
          <DialogDescription>
            Create a new user account for this contact with Customer role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Name:</span>
              <span className="font-medium">{displayName}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Email:</span>
              <span className="font-medium">{contact.email}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{contact.customer?.name || '-'}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p>A new user will be created with:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Username: {contact.first_name.toLowerCase().replace(/[^a-z0-9]/g, '')}-[random]</li>
              <li>Role: Customer</li>
              <li>Welcome email will be sent for password setup</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
