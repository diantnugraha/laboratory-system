import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';

/**
 * Customer Filter Options
 */
export interface CustomerFilter {
  search?: string;
  months?: number;
  offset?: number;
  limit?: number;
  userId?: number;
  userRole?: number;
  userCustomerId?: number;
}

/**
 * Create Customer DTO
 */
export interface CreateCustomerDTO {
  code: string;
  customer_name: string;
  business: string;
  special_customer?: number;
  top?: number;
  npwp?: string;
  legal_document?: string;
  email?: string;
  website?: string;
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  bank_branch?: string;
  bank_address?: string;
  supplier_of?: string;
  supplier_code?: string;
  remarks?: string;
  payment_middle?: number;
  sales_incharge?: string;
  ecoa?: number;
  feeder?: string;
  feeder_fee?: number;
  agency?: number;
  sales_feeder?: number;
  sales_id?: string;
  central_cust_id?: string;
  is_corporate?: number;
}

/**
 * Update Customer DTO
 */
export interface UpdateCustomerDTO extends Partial<CreateCustomerDTO> {}

/**
 * Address Management DTO
 */
export interface AddressDTO {
  id?: number;
  customer_id?: number;
  address_type?: string;
  address?: string;
  phone?: string;
  fax?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  npwp?: string;
  status?: string;
}

/**
 * Contact Management DTO
 */
export interface ContactDTO {
  id?: number;
  customer_id?: number;
  address_id?: number;
  title?: string;
  first_name?: string;
  middle_name?: string;
  surname?: string;
  job_title?: string;
  department?: string;
  email?: string;
  phone?: string;
  fax?: string;
  mobile_phone?: string;
  status?: string;
}

/**
 * Customer Repository Interface (The Contract)
 * Defines all data access operations for Customer entity
 */
export interface ICustomerRepository {
  // ===== Read Operations =====

  /**
   * Get all customers with pagination and filters
   */
  findAll(filter: CustomerFilter): Promise<RepositoryResult<PaginatedData<any>>>;

  /**
   * Get customer by ID with addresses and contacts
   */
  findById(id: number): Promise<RepositoryResult<any>>;

  /**
   * Find customer by code (for duplicate check)
   */
  findByCode(code: string): Promise<RepositoryResult<any | null>>;

  /**
   * Get customers for autocomplete/dropdown (JSON format)
   */
  findForAutocomplete(search?: string): Promise<RepositoryResult<any[]>>;

  // ===== Write Operations =====

  /**
   * Create new customer
   */
  create(data: CreateCustomerDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing customer
   */
  update(id: number, data: UpdateCustomerDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete customer
   */
  delete(id: number): Promise<RepositoryResult<boolean>>;

  // ===== Address Management =====

  /**
   * Create new address for customer
   */
  createAddress(customerId: number, data: AddressDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing address
   */
  updateAddress(id: number, data: AddressDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete address
   */
  deleteAddress(id: number): Promise<RepositoryResult<boolean>>;

  /**
   * Check if address type already exists for customer
   */
  hasAddressType(customerId: number, addressType: string, excludeId?: number): Promise<RepositoryResult<boolean>>;

  // ===== Contact Management =====

  /**
   * Create new contact for customer
   */
  createContact(customerId: number, data: ContactDTO): Promise<RepositoryResult<any>>;

  /**
   * Update existing contact
   */
  updateContact(id: number, data: ContactDTO): Promise<RepositoryResult<any>>;

  /**
   * Soft delete contact
   */
  deleteContact(id: number): Promise<RepositoryResult<boolean>>;

  /**
   * Validate that address belongs to customer
   */
  validateAddressBelongsToCustomer(addressId: number, customerId: number): Promise<RepositoryResult<boolean>>;
}
