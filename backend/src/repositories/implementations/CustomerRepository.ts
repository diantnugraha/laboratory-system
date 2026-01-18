import { PrismaClient } from '@prisma/client';
import {
  ICustomerRepository,
  CustomerFilter,
  ContactFilter,
  CustomerAdvancedFilter,
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
        months, // No default - fetch all data by default
        offset = 0,
        limit = 30,
        userRole,
        userCustomerId,
      } = filter;

      // Build where condition
      const where: any = {
        trash: null,
        ...buildMultiFieldSearchCondition(
          ['customer_name', 'code', 'business', 'email'],
          sanitizeSearchQuery(search)
        ),
      };

      // Only apply date filter if months is explicitly provided and > 0
      if (months && months > 0) {
        const monthsAgo = new Date();
        monthsAgo.setMonth(monthsAgo.getMonth() - months);
        where.created_at = { gte: monthsAgo };
      }

      // BR-010: Customer role restrictions
      if (userRole === 16 && userCustomerId) {
        where.id = userCustomerId;
      }

      // OPTIMIZED: Removed redundant totalAll count (was 3 queries, now 2)
      const [customers, total] = await Promise.all([
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
          message: months && months > 0
            ? `Showing ${total} customers from last ${months / 12} years`
            : `Showing ${total} customers`,
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
          code: { equals: code },
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
        // MySQL default collation is case-insensitive, no need for mode option
        where.OR = [
          { code: { contains: search } },
          { customer_name: { contains: search } },
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

      const address = await this.prisma.address.create({
        data: {
          customer_id: customerId,
          address_type: data.address_type!,
          address: data.address!,
          phone: data.phone!,
          fax: data.fax,
          city: data.city!,
          state: data.state!,
          country: data.country!,
          postal_code: data.postal_code ? parseInt(data.postal_code) : null,
          npwp: data.npwp,
          status: data.status || 'Active',
          created_by: data.created_by || 0,
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
      if (data.updated_by) updateData.updated_by = data.updated_by;

      const address = await this.prisma.address.update({
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
      await this.prisma.address.update({
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

      const existing = await this.prisma.address.findFirst({ where });

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

      const contact = await this.prisma.contact.create({
        data: {
          customer_id: customerId,
          address_id: data.address_id!,
          title: data.title!,
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
          created_by: data.created_by || 0,
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
      if (data.updated_by) updateData.updated_by = data.updated_by;

      // OPTIMIZED: Only update username if BOTH names are provided
      // This avoids an extra DB fetch just to get the current name
      // If only one name is updated, username stays unchanged (acceptable trade-off)
      if (data.first_name && data.surname) {
        updateData.username = `${data.first_name.toLowerCase()}.${data.surname.toLowerCase()}`;
      }

      const contact = await this.prisma.contact.update({
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
      await this.prisma.contact.update({
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
      const address = await this.prisma.address.findFirst({
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

  // ===== Additional Read Operations =====

  async findContacts(filter: ContactFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { customerId, search, offset = 0, limit = 20 } = filter;

      // Build where condition
      const where: any = {
        customer_id: customerId,
        trash: null,
        ...buildMultiFieldSearchCondition(
          ['first_name', 'middle_name', 'surname', 'email'],
          sanitizeSearchQuery(search)
        ),
      };

      const [contacts, total] = await Promise.all([
        this.prisma.contact.findMany({
          where,
          orderBy: { id: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            title: true,
            first_name: true,
            middle_name: true,
            surname: true,
            username: true,
            job_title: true,
            department: true,
            email: true,
            phone: true,
            fax: true,
            mobile_phone: true,
            status: true,
            created_at: true,
            address: {
              select: {
                id: true,
                address_type: true,
                address: true,
                city: true,
                state: true,
                country: true,
              },
            },
          },
        }),
        this.prisma.contact.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: contacts,
        pagination: {
          page: Math.floor(offset / limit) + 1,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch contacts: ${error.message}`);
    }
  }

  async findRegions(
    type: 'city' | 'state' | 'country',
    search?: string
  ): Promise<RepositoryResult<string[]>> {
    try {
      const sanitizedSearch = sanitizeSearchQuery(search);

      // Build where condition
      const where: any = {
        trash: null,
        [type]: { not: null },
      };

      // Add search condition if provided
      if (sanitizedSearch) {
        where[type] = {
          ...where[type],
          contains: sanitizedSearch,
        };
      }

      // OPTIMIZED: Added limit to prevent loading 50k+ rows
      const addresses = await this.prisma.address.findMany({
        where,
        select: { [type]: true },
        distinct: [type],
        orderBy: { [type]: 'asc' },
        take: 100, // Cap results to prevent memory issues
      });

      // Extract and filter values (already sorted by DB, no need to sort again)
      const regions: string[] = [];
      for (const addr of addresses) {
        const value = (addr as any)[type] as string | null | undefined;
        if (value && typeof value === 'string' && value.trim() !== '') {
          regions.push(value);
        }
      }

      return RepositoryResult.ok(regions);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch regions: ${error.message}`);
    }
  }

  async getTopCustomersByOrders(
    year: number
  ): Promise<RepositoryResult<{ labels: string[]; datasets: any[] }>> {
    try {
      // OPTIMIZED: Single query with JOIN instead of N+1 pattern
      const topCustomers = await this.prisma.$queryRaw<
        Array<{ customer_id: number; customer_name: string; order_count: bigint }>
      >`
        SELECT
          c.id as customer_id,
          c.customer_name,
          COUNT(po.id) as order_count
        FROM pre_order po
        INNER JOIN customer c ON po.customer_id = c.id
        WHERE po.trash IS NULL
          AND c.trash IS NULL
          AND YEAR(po.created_at) = ${year}
        GROUP BY c.id, c.customer_name
        ORDER BY order_count DESC
        LIMIT 5
      `;

      // Calculate total for percentage
      const total = topCustomers.reduce((sum, x) => sum + Number(x.order_count), 0) || 1;

      const labels = topCustomers.map((c) => c.customer_name);
      const datasets = [
        {
          label: `Top Customers ${year}`,
          data: topCustomers.map((c) => Math.round((Number(c.order_count) / total) * 100)),
        },
      ];

      return RepositoryResult.ok({ labels, datasets });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to compute top customers: ${error.message}`);
    }
  }

  async findContactsForAutocomplete(
    customerId: number,
    search?: string,
    isDataTable?: boolean
  ): Promise<RepositoryResult<any[]>> {
    try {
      const sanitizedSearch = sanitizeSearchQuery(search);
      // OPTIMIZED: Reduced max limit from 1000 to 200 to prevent memory issues
      const take = isDataTable ? 200 : 20;

      const where: any = {
        trash: null,
        customer_id: customerId,
        ...(sanitizedSearch
          ? buildMultiFieldSearchCondition(['first_name', 'middle_name', 'surname', 'email'], sanitizedSearch)
          : {}),
      };

      const contacts = await this.prisma.contact.findMany({
        where,
        take,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          first_name: true,
          middle_name: true,
          surname: true,
          email: true,
        },
      });

      const items = contacts.map((c) => ({
        id: c.id,
        text: [c.first_name, c.middle_name, c.surname].filter(Boolean).join(' '),
        email: c.email,
      }));

      return RepositoryResult.ok(items);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch contacts for autocomplete: ${error.message}`);
    }
  }

  async findWithAdvancedFilters(
    filter: CustomerAdvancedFilter
  ): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const {
        customerId,
        priority,
        payment,
        sales,
        page = 1,
        perPage = 20,
        orderBy = 'id:desc',
      } = filter;

      const skip = (page - 1) * perPage;

      // Build where condition
      const where: any = { trash: null };
      if (customerId) where.id = customerId;
      if (priority !== undefined) where.special_customer = priority ? 1 : 0;
      if (payment !== undefined) where.payment_middle = payment ? 1 : 0;
      if (sales) where.sales_incharge = sales;

      // Parse orderBy
      const [field, dir] = orderBy.split(':');
      const orderByClause = { [field || 'id']: (dir === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' };

      const [items, total] = await Promise.all([
        this.prisma.customer.findMany({
          where,
          take: perPage,
          skip,
          orderBy: orderByClause,
          select: {
            id: true,
            code: true,
            customer_name: true,
            special_customer: true,
            payment_middle: true,
            sales_incharge: true,
          },
        }),
        this.prisma.customer.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: items,
        pagination: {
          page,
          limit: perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch customers: ${error.message}`);
    }
  }
}
