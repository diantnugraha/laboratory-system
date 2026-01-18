import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import multipart from '@fastify/multipart';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Allowed file types for different upload categories
 */
export const ALLOWED_TYPES = {
  payment: ['image/jpeg', 'image/png', 'application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

/**
 * Maximum file sizes (in bytes)
 */
export const MAX_FILE_SIZES = {
  payment: 10 * 1024 * 1024, // 10MB
  image: 5 * 1024 * 1024,    // 5MB
  document: 20 * 1024 * 1024, // 20MB
};

/**
 * Ensure upload directory exists
 */
const ensureDir = (dir: string): void => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Generate unique filename
 */
const generateFilename = (originalName: string): string => {
  const uniqueId = uuidv4();
  const ext = path.extname(originalName).toLowerCase();
  const timestamp = Date.now();
  return `${timestamp}-${uniqueId}${ext}`;
};

/**
 * Validate file type
 */
const validateFileType = (mimetype: string, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(mimetype);
};

/**
 * Save uploaded file to disk
 */
export const saveFile = async (
  request: FastifyRequest,
  uploadDir: string,
  allowedTypes: string[],
  maxSize: number,
  fieldName: string = 'file'
): Promise<{ filename: string; path: string; mimetype: string; size: number }> => {
  const data = await request.file();

  if (!data) {
    throw new Error('No file uploaded');
  }

  if (data.fieldname !== fieldName) {
    throw new Error(`Expected field name '${fieldName}', got '${data.fieldname}'`);
  }

  // Validate file type
  if (!validateFileType(data.mimetype, allowedTypes)) {
    throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
  }

  // Generate filename and prepare directory
  const filename = generateFilename(data.filename);
  const fullDir = path.join(process.cwd(), 'uploads', uploadDir);
  ensureDir(fullDir);
  const filePath = path.join(fullDir, filename);

  // Save file with size check
  const writeStream = fs.createWriteStream(filePath);
  let size = 0;

  try {
    for await (const chunk of data.file) {
      size += chunk.length;
      if (size > maxSize) {
        writeStream.destroy();
        fs.unlinkSync(filePath);
        throw new Error(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
      }
      writeStream.write(chunk);
    }
    writeStream.end();
  } catch (error) {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }

  return {
    filename,
    path: path.join(uploadDir, filename).replace(/\\/g, '/'),
    mimetype: data.mimetype,
    size
  };
};

/**
 * Save payment document
 */
export const savePaymentDocument = async (request: FastifyRequest, fieldName: string = 'payment_document') => {
  return saveFile(request, 'payments', ALLOWED_TYPES.payment, MAX_FILE_SIZES.payment, fieldName);
};

/**
 * Save image
 */
export const saveImage = async (request: FastifyRequest, fieldName: string = 'image') => {
  return saveFile(request, 'images', ALLOWED_TYPES.image, MAX_FILE_SIZES.image, fieldName);
};

/**
 * Save document
 */
export const saveDocument = async (request: FastifyRequest, fieldName: string = 'document') => {
  return saveFile(request, 'documents', ALLOWED_TYPES.document, MAX_FILE_SIZES.document, fieldName);
};

/**
 * Save sample attachment
 */
export const saveSampleAttachment = async (request: FastifyRequest, fieldName: string = 'attachment') => {
  return saveFile(
    request,
    'samples',
    [...ALLOWED_TYPES.image, 'application/pdf'],
    10 * 1024 * 1024,
    fieldName
  );
};

/**
 * Delete uploaded file
 */
export const deleteUploadedFile = (filePath: string): boolean => {
  try {
    const fullPath = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), 'uploads', filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get relative path from full path
 */
export const getRelativePath = (fullPath: string): string => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (fullPath.startsWith(uploadsDir)) {
    return fullPath.substring(uploadsDir.length + 1).replace(/\\/g, '/');
  }
  return fullPath.replace(/\\/g, '/');
};

/**
 * Handle file upload errors
 */
export const handleUploadError = (error: any): { status: number; message: string } => {
  if (error.message?.includes('File too large')) {
    return { status: 400, message: 'File terlalu besar. Maksimal ukuran file yang diizinkan telah terlampaui.' };
  }
  if (error.message?.includes('Invalid file type')) {
    return { status: 400, message: error.message };
  }
  if (error.message?.includes('No file uploaded')) {
    return { status: 400, message: 'Tidak ada file yang diupload.' };
  }
  return { status: 500, message: 'Terjadi kesalahan saat mengupload file.' };
};

/**
 * File upload plugin for Fastify
 */
async function fileUploadPlugin(fastify: FastifyInstance) {
  await fastify.register(multipart, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB max (largest allowed)
      files: 10
    }
  });
}

export default fp(fileUploadPlugin, {
  name: 'fileUpload'
});
