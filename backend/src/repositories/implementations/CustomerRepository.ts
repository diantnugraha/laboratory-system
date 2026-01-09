import { PrismaClient } from '@prisma/client';
import {
  ICustomerRepository,
  CustomerFilter,
  CreateCustomerDTO,
  UpdateCustomerDTO,
  AddressDTO,
  ContactDTO,
} from '../contracts/ICustomerRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildMultiFieldSearchCondition, sanitizeSearchQuery } from '../../utils/searchHelper';

/**
 * Customer Repository Implementation (The Worker)
 * Concrete implementation of customer data access operations
 */
export class CustomerRepository implements ICustomerRepository {
  constructor(private prisma: PrismaClient) {}

  // ===== Read Operations =====

  async findAll(filter: CustomerFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const {
        search,
        months = 60,
        offset = 0,
        limit = 30,
        userRole,
        userCustomerId,
      } = filter;

      // Calculate date filter
      const monthsAgo = new Date();
      if (months > 0) {
        monthsAgo.setMonth(monthsAgo.getMonth() - months);
      }

      // Build where condition
      const where: any = {
        trash: null,
        ...(months > 0 ? { created_at: { gte: monthsAgo } } : {}),
        ...buildMultiFieldSearchCondition(
          ['customer_name', 'code', 'business', 'email'],
          sanitizeSearchQuery(search)
        ),
      };

      // BR-010: Customer role restrictions
      if (userRole === 16 && userCustomerId) {
        where.id = userCustomerId;
      }

      // Execute queries in parallel
      const [customers, total, totalAll] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          orderBy: { id: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            code: true,
            customer_name: true,
            business: true,
            email: true,
            special_customer: true,
            payment_middle: true,
            sales_incharge: true,
            created_at: true,
            addresses: {
              where: { trash: null },
              take: 1,
              select: {
                id: true,
                address_type: true,
                city: true,
                state: true,
                country: true,
              },
            },
            contacts: {
              where: { trash: null },
              take: 1,
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                surname: true,
                email: true,
                phone: true,
              },
            },
          },
        }),
        this.prisma.customer.count({ where }),
        this.prisma.customer.count({ where: { trash: null } }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      return RepositoryResult.ok(
        {
          data: customers,
          pagination: {
            page: currentPage,
            limit,
            total,
            totalPages,
          },
        },
        {
          message: `Showing ${total} customers from last ${months / 12} years (Total: ${totalAll} customers)`,
        }
      );
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch customers: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: { id, trash: null },
        include: {
          addresses: {
            where: { trash: null },
            orderBy: { created_at: 'desc' },
          },
          contacts: {
            where: { trash: null },
            include: {
              address: {
                select: {
                  id: true,
                  address_type: true,
                },
              },
            },
            orderBy: { created_at: 'desc' },
          },
        },
      });

      if (!customer) {
        return RepositoryResult.fail('Customer not found');
      }

      return RepositoryResult.ok(customer);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch customer: ${error.message}`);
    }
  }

  async findByCode(code: string): Promise<RepositoryResult<any | null>> {
    try {
      const customer = await this.prisma.customer.findFirst({
        where: {
          code: { equals: code, mode: 'insensitive' },
          trash: null,
        },
      });

      return RepositoryResult.ok(customer);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check customer code: ${error.message}`);
    }
  }

  async findForAutocomplete(search?: string): Promise<RepositoryResult<any[]>> {
    try {
      const where: any = { trash: null };

      if (search) {
        where.OR = [
          { code: { contains: search, mode: 'insensitive' } },
          { customer_name: { contains: search, mode: 'insensitive' } },
        ];
      }

      const customers = await this.prisma.customer.findMany({
        where,
        take: 50,
        orderBy: { customer_name: 'asc' },
        select: {
          id: true,
          code: true,
          customer_name: true,
        },
      });

      return RepositoryResult.ok(customers);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch customers for autocomplete: ${error.message}`);
    }
  }

  // ===== Write Operations =====

  async create(data: CreateCustomerDTO): Promise<RepositoryResult<any>> {
    try {
      const customer = await this.prisma.customer.create({
        data: {
          ...data,
          trash: null,
        },
      });

      return RepositoryResult.ok(customer);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create customer: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateCustomerDTO): Promise<RepositoryResult<any>> {
    try {
      const customer = await this.prisma.customer.update({
        where: { id },
        data,
      });

      return RepositoryResult.ok(customer);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update customer: ${error.message}`);
    }
  }

  async delete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.customer.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete customer: ${error.message}`);
    }
  }

  // ===== Address Management =====

  async createAddress(customerId: number, data: AddressDTO): Promise<RepositoryResult<any>> {
    try {
      // Check for duplicate address type
      if (data.address_type) {
        const hasDuplicate = await this.hasAddressType(customerId, data.address_type);
        if (hasDuplicate.isSuccess() && hasDuplicate.getValue()) {
          return RepositoryResult.fail('Address type already exists for this customer');
        }
      }

      const address = await this.prisma.cust_address.create({
        data: {
          customer_id: customerId,
          address_type: data.address_type!,
          address: data.address!,
          phone: data.phone!,
          fax: data.fax,
          city: data.city!,
          state: data.state,
          country: data.country!,
          postal_code: data.postal_code ? parseInt(data.postal_code) : null,
          npwp: data.npwp,
          status: data.status || 'Active',
          trash: null,
        },
      });

      return RepositoryResult.ok(address);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create address: ${error.message}`);
    }
  }

  async updateAddress(id: number, data: AddressDTO): Promise<RepositoryResult<any>> {
    try {
      // If address_type is being changed, check for duplicates
      if (data.address_type && data.customer_id) {
        const hasDuplicate = await this.hasAddressType(
          data.customer_id,
          data.address_type,
          id
        );
        if (hasDuplicate.isSuccess() && hasDuplicate.getValue()) {
          return RepositoryResult.fail('Address type already exists for this customer');
        }
      }

      const updateData: any = {};
      if (data.address_type) updateData.address_type = data.address_type;
      if (data.address) updateData.address = data.address;
      if (data.phone) updateData.phone = data.phone;
      if (data.fax !== undefined) updateData.fax = data.fax;
      if (data.city) updateData.city = data.city;
      if (data.state !== undefined) updateData.state = data.state;
      if (data.country) updateData.country = data.country;
      if (data.postal_code !== undefined) {
        updateData.postal_code = data.postal_code ? parseInt(data.postal_code) : null;
      }
      if (data.npwp !== undefined) updateData.npwp = data.npwp;
      if (data.status) updateData.status = data.status;

      const address = await this.prisma.cust_address.update({
        where: { id },
        data: updateData,
      });

      return RepositoryResult.ok(address);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update address: ${error.message}`);
    }
  }

  async deleteAddress(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.cust_address.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete address: ${error.message}`);
    }
  }

  async hasAddressType(
    customerId: number,
    addressType: string,
    excludeId?: number
  ): Promise<RepositoryResult<boolean>> {
    try {
      const where: any = {
        customer_id: customerId,
        address_type: { equals: addressType, mode: 'insensitive' },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existing = await this.prisma.cust_address.findFirst({ where });

      return RepositoryResult.ok(!!existing);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check address type: ${error.message}`);
    }
  }

  // ===== Contact Management =====

  async createContact(customerId: number, data: ContactDTO): Promise<RepositoryResult<any>> {
    try {
      // Validate address belongs to customer
      if (data.address_id) {
        const isValid = await this.validateAddressBelongsToCustomer(
          data.address_id,
          customerId
        );
        if (isValid.isFailure() || !isValid.getValue()) {
          return RepositoryResult.fail('Address does not belong to this customer');
        }
      }

      const contact = await this.prisma.cust_contact.create({
        data: {
          customer_id: customerId,
          address_id: data.address_id!,
          title: data.title,
          first_name: data.first_name!,
          middle_name: data.middle_name,
          surname: data.surname!,
          username: `${data.first_name?.toLowerCase()}.${data.surname?.toLowerCase()}`,
          job_title: data.job_title,
          department: data.department,
          email: data.email!,
          phone: data.phone!,
          fax: data.fax,
          mobile_phone: data.mobile_phone,
          status: data.status || 'Active',
          trash: null,
        },
      });

      return RepositoryResult.ok(contact);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create contact: ${error.message}`);
    }
  }

  async updateContact(id: number, data: ContactDTO): Promise<RepositoryResult<any>> {
    try {
      // If address_id is being changed, validate it belongs to customer
      if (data.address_id && data.customer_id) {
        const isValid = await this.validateAddressBelongsToCustomer(
          data.address_id,
          data.customer_id
        );
        if (isValid.isFailure() || !isValid.getValue()) {
          return RepositoryResult.fail('Address does not belong to this customer');
        }
      }

      const updateData: any = {};
      if (data.address_id) updateData.address_id = data.address_id;
      if (data.title !== undefined) updateData.title = data.title;
      if (data.first_name) updateData.first_name = data.first_name;
      if (data.middle_name !== undefined) updateData.middle_name = data.middle_name;
      if (data.surname) updateData.surname = data.surname;
      if (data.job_title !== undefined) updateData.job_title = data.job_title;
      if (data.department !== undefined) updateData.department = data.department;
      if (data.email) updateData.email = data.email;
      if (data.phone) updateData.phone = data.phone;
      if (data.fax !== undefined) updateData.fax = data.fax;
      if (data.mobile_phone !== undefined) updateData.mobile_phone = data.mobile_phone;
      if (data.status) updateData.status = data.status;

      // Update username if name changed
      if (data.first_name || data.surname) {
        const contact = await this.prisma.cust_contact.findUnique({ where: { id } });
        if (contact) {
          const firstName = data.first_name || contact.first_name;
          const surname = data.surname || contact.surname;
          updateData.username = `${firstName.toLowerCase()}.${surname.toLowerCase()}`;
        }
      }

      const contact = await this.prisma.cust_contact.update({
        where: { id },
        data: updateData,
      });

      return RepositoryResult.ok(contact);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update contact: ${error.message}`);
    }
  }

  async deleteContact(id: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.cust_contact.update({
        where: { id },
        data: { trash: 1 },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete contact: ${error.message}`);
    }
  }

  async validateAddressBelongsToCustomer(
    addressId: number,
    customerId: number
  ): Promise<RepositoryResult<boolean>> {
    try {
      const address = await this.prisma.cust_address.findFirst({
        where: {
          id: addressId,
          customer_id: customerId,
          trash: null,
        },
      });

      return RepositoryResult.ok(!!address);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate address: ${error.message}`);
    }
  }
}
