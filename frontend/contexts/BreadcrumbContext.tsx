'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BreadcrumbContextType {
  subPage: string;
  setSubPage: (page: string) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [subPage, setSubPage] = useState('Operational');

  return (
    <BreadcrumbContext.Provider value={{ subPage, setSubPage }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider');
  }
  return context;
}


