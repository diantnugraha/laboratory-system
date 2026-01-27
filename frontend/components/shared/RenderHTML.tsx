'use client';

import { useMemo } from 'react';

interface RenderHTMLProps {
  html: string | null | undefined;
  className?: string;
  as?: 'span' | 'div' | 'li' | 'p' | 'td';
}

/**
 * Component untuk render HTML dari backend dengan sanitization
 * Menggunakan dangerouslySetInnerHTML untuk render HTML
 * Note: Untuk production, pertimbangkan menggunakan DOMPurify untuk sanitization
 */
export function RenderHTML({ html, className, as: Tag = 'span' }: RenderHTMLProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) return '';

    // Basic sanitization - remove script tags and event handlers
    // For production, consider using DOMPurify: npm install dompurify @types/dompurify
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '');

    return sanitized;
  }, [html]);

  if (!html) {
    return <Tag className={className}>-</Tag>;
  }

  return (
    <Tag
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

