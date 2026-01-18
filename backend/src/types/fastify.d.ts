import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
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

/**
 * Extended Request interface for file uploads
 */
export interface UploadedFile {
  fieldname: string;
  filename: string;
  encoding: string;
  mimetype: string;
  file: NodeJS.ReadableStream;
  toBuffer: () => Promise<Buffer>;
}
