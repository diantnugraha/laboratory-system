import { create } from 'zustand';
import { customerService, Contact, Address } from '@/services/customerService';

interface CustomerOption {
  id: number;
  code: string;
  customer_name: string;
  contacts: Contact[];
  addresses: Address[];
}

interface CustomerState {
  // Search state
  searchQuery: string;
  searchResults: CustomerOption[];
  isSearching: boolean;
  popoverOpen: boolean;

  // Selection state
  selectedCustomer: CustomerOption | null;
  selectedContact: Contact | null;
  selectedAddress: Address | null;
  contacts: Contact[];
  addresses: Address[];

  // Loading state
  loadingDetails: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setPopoverOpen: (open: boolean) => void;
  searchCustomers: (query: string) => Promise<void>;
  selectCustomer: (customer: CustomerOption, formSetValue: (field: string, value: number) => void) => Promise<void>;
  selectContact: (contact: Contact, formSetValue: (field: string, value: number) => void) => void;
  selectAddress: (address: Address, formSetValue: (field: string, value: number) => void) => void;
  loadCustomerWithContact: (customerId: number, contact: Contact | null, address?: Address | null) => Promise<void>;
  reset: () => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  // Initial state
  searchQuery: '',
  searchResults: [],
  isSearching: false,
  popoverOpen: false,
  selectedCustomer: null,
  selectedContact: null,
  selectedAddress: null,
  contacts: [],
  addresses: [],
  loadingDetails: false,

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setPopoverOpen: (open) => set({ popoverOpen: open }),

  searchCustomers: async (query) => {
    if (query.length < 2) {
      set({ searchResults: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const response = await customerService.getJson({ q: query });
      const items = response.items || response.data || [];
      set({ searchResults: items as CustomerOption[] });
    } catch (error) {
      console.error('Failed to search customers:', error);
      set({ searchResults: [] });
    } finally {
      set({ isSearching: false });
    }
  },

  selectCustomer: async (customer, formSetValue) => {
    set({
      popoverOpen: false,
      searchQuery: '',
      selectedContact: null,
      selectedAddress: null,
      loadingDetails: true
    });
    formSetValue('customerId', customer.id);
    formSetValue('contactId', 0);

    try {
      const [customerResponse, contactsResponse] = await Promise.all([
        customerService.getById(customer.id),
        customerService.getContacts({ customer_id: customer.id })
      ]);

      if (customerResponse.success && customerResponse.data) {
        const customerContacts = contactsResponse.success ? (contactsResponse.data || []) : [];
        const customerAddresses = customerResponse.data.addresses || [];
        set({
          selectedCustomer: {
            id: customerResponse.data.id,
            code: customerResponse.data.code,
            customer_name: customerResponse.data.customer_name,
            contacts: customerContacts,
            addresses: customerAddresses,
          },
          contacts: customerContacts,
          addresses: customerAddresses,
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      set({ loadingDetails: false });
    }
  },

  selectContact: (contact, formSetValue) => {
    set({ selectedContact: contact });
    formSetValue('contactId', contact.id);
  },

  selectAddress: (address, formSetValue) => {
    set({ selectedAddress: address });
    formSetValue('addressId', address.id);
  },

  loadCustomerWithContact: async (customerId, contact, address) => {
    set({ loadingDetails: true });

    // Set contact and address immediately if provided
    if (contact) {
      set({
        selectedContact: contact,
        contacts: [contact]
      });
    }
    if (address) {
      set({
        selectedAddress: address,
        addresses: [address]
      });
    }

    try {
      const [customerResponse, contactsResponse] = await Promise.all([
        customerService.getById(customerId),
        customerService.getContacts({ customer_id: customerId })
      ]);

      if (customerResponse.success && customerResponse.data) {
        let allContacts = contactsResponse.success ? (contactsResponse.data || []) : [];
        let allAddresses = customerResponse.data.addresses || [];

        // Merge current contact if not in list
        if (contact && !allContacts.some(c => c.id === contact.id)) {
          allContacts = [contact, ...allContacts];
        }

        // Merge current address if not in list
        if (address && !allAddresses.some(a => a.id === address.id)) {
          allAddresses = [address, ...allAddresses];
        }

        set({
          selectedCustomer: {
            id: customerResponse.data.id,
            code: customerResponse.data.code,
            customer_name: customerResponse.data.customer_name,
            contacts: allContacts,
            addresses: allAddresses,
          },
          contacts: allContacts,
          addresses: allAddresses,
          selectedContact: contact,
          selectedAddress: address,
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      set({ loadingDetails: false });
    }
  },

  reset: () => set({
    searchQuery: '',
    searchResults: [],
    isSearching: false,
    popoverOpen: false,
    selectedCustomer: null,
    selectedContact: null,
    selectedAddress: null,
    contacts: [],
    addresses: [],
    loadingDetails: false,
  }),
}));
