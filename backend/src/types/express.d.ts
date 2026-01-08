import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        display_name: string | null;
        role_id: number;
        customer_id: number | null;
        contact_id: number | null;
        profile_picture: string | null;
        department: string | null;
        role?: {
          id: number;
          name: string;
        };
      };
    }
  }
}













