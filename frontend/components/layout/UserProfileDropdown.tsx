'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { LogOut } from 'lucide-react';

export function UserProfileDropdown() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <p className="text-sm font-medium leading-none">{user.name}</p>
        <p className="text-xs text-primary font-medium mt-0.5 uppercase tracking-wide">{user.role}</p>
      </div>
      <Avatar className="h-9 w-9 bg-primary text-primary-foreground">
        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to logout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

