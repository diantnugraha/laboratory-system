import { create } from 'zustand';
import { serviceService } from '@/services/serviceService';
import { packageService } from '@/services/packageService';

// Service option for search results
export interface ServiceOption {
  id: number;
  code: string;
  name: string;
  price: number;
  parameter?: { id: number; name: string };
  method?: { id: number; name: string };
}

// Package option for search results
export interface PackageOption {
  id: number;
  code: string;
  name: string;
  price: number;
  services?: Array<{
    id: number;
    code: string;
    name: string;
    price: { value: number };
  }>;
}

interface ServiceStoreState {
  // Per-sample search queries (keyed by sample ID)
  serviceSearchQueries: Record<string, string>;
  packageSearchQueries: Record<string, string>;

  // Global search results (shared, only one popover open at a time)
  serviceSearchResults: ServiceOption[];
  packageSearchResults: PackageOption[];

  // Loading states
  loadingServiceSearch: boolean;
  loadingPackageSearch: boolean;

  // Which sample's popover is open (null = none)
  openServicePopover: string | null;
  openPackagePopover: string | null;

  // Actions
  setServiceQuery: (sampleId: string, query: string) => void;
  setPackageQuery: (sampleId: string, query: string) => void;
  setServicePopoverOpen: (sampleId: string | null) => void;
  setPackagePopoverOpen: (sampleId: string | null) => void;
  searchServices: (query: string) => Promise<void>;
  searchPackages: (query: string) => Promise<void>;
  clearSampleSearch: (sampleId: string) => void;
  reset: () => void;
}

const initialState = {
  serviceSearchQueries: {},
  packageSearchQueries: {},
  serviceSearchResults: [],
  packageSearchResults: [],
  loadingServiceSearch: false,
  loadingPackageSearch: false,
  openServicePopover: null,
  openPackagePopover: null,
};

export const useServiceStore = create<ServiceStoreState>((set) => ({
  ...initialState,

  setServiceQuery: (sampleId, query) =>
    set((state) => ({
      serviceSearchQueries: {
        ...state.serviceSearchQueries,
        [sampleId]: query,
      },
    })),

  setPackageQuery: (sampleId, query) =>
    set((state) => ({
      packageSearchQueries: {
        ...state.packageSearchQueries,
        [sampleId]: query,
      },
    })),

  setServicePopoverOpen: (sampleId) =>
    set({
      openServicePopover: sampleId,
      // Clear results when closing popover
      serviceSearchResults: sampleId ? [] : [],
    }),

  setPackagePopoverOpen: (sampleId) =>
    set({
      openPackagePopover: sampleId,
      // Clear results when closing popover
      packageSearchResults: sampleId ? [] : [],
    }),

  searchServices: async (query) => {
    if (query.length < 2) {
      set({ serviceSearchResults: [] });
      return;
    }

    set({ loadingServiceSearch: true });

    try {
      const response = await serviceService.getJson({ q: query });
      const items = response.items || response.data || [];
      set({
        serviceSearchResults: items.map((s) => ({
          id: s.id,
          code: s.code || '',
          name: s.name,
          price: typeof s.price === 'object' && s.price !== null ? (s.price as any).value || 0 : s.price || 0,
          parameter: s.parameter,
          method: s.method,
        })),
        loadingServiceSearch: false,
      });
    } catch (error) {
      console.error('Failed to search services:', error);
      set({ serviceSearchResults: [], loadingServiceSearch: false });
    }
  },

  searchPackages: async (query) => {
    if (query.length < 2) {
      set({ packageSearchResults: [] });
      return;
    }

    set({ loadingPackageSearch: true });

    try {
      const response = await packageService.getJson({ q: query });
      const items = response.items || response.data || [];
      set({
        packageSearchResults: items.map((p) => ({
          id: p.id,
          code: p.code || '',
          name: p.name,
          price: p.price?.value || 0,
          services: p.services,
        })),
        loadingPackageSearch: false,
      });
    } catch (error) {
      console.error('Failed to search packages:', error);
      set({ packageSearchResults: [], loadingPackageSearch: false });
    }
  },

  clearSampleSearch: (sampleId) =>
    set((state) => {
      const { [sampleId]: _, ...restServiceQueries } = state.serviceSearchQueries;
      const { [sampleId]: __, ...restPackageQueries } = state.packageSearchQueries;
      return {
        serviceSearchQueries: restServiceQueries,
        packageSearchQueries: restPackageQueries,
      };
    }),

  reset: () => set(initialState),
}));
