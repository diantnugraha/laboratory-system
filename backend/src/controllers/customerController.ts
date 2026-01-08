import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, buildMultiFieldSearchCondition, sanitizeSearchQuery, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/customers - List customers with search, pagination, and filters (12 months optional)
 */
export const getCustomers = async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(parseQueryParam(req.query.limit, 30), 1000);
    const offset = parseQueryParam(req.query.offset, 0);
    const searchQuery = sanitizeSearchQuery((req.query.search || req.query.q) as string | undefined);
    const lastMonths = (() => {
      const raw = typeof req.query.months === 'string' ? parseInt(req.query.months, 10) : 12;
      return Number.isFinite(raw) ? Math.max(0, raw) : 12;
    })();

    // Optional last X months filter (default 12). When months=0, no filter applied
    const twoYearAgo = new Date();
    twoYearAgo.setMonth(twoYearAgo.getMonth() - lastMonths);

    // Build where condition with spread operators
    const where: any = {
      trash: null,
      ...(lastMonths > 0 ? { created_at: { gte: twoYearAgo } } : {}),
      ...buildMultiFieldSearchCondition(
        ['customer_name', 'code', 'business', 'email'],
        searchQuery
      )
    };

    // BR-010: Customer role restrictions: if current user is a Customer, restrict to their customer_id
    if ((req as any).user?.role_id === 16 && (req as any).user?.customer_id) {
      where.id = (req as any).user.customer_id;
    }

    const [customers, total, totalAll] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: {
          id: 'desc'
        },
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
              country: true
            }
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
              phone: true
            }
          }
        }
      }),
      prisma.customer.count({
        where
      }),
      prisma.customer.count({
        where: { trash: null }
      })
    ]);

    const response: ApiResponse = {
      success: true,
      data: customers,
      message: `Showing ${total} customers from last 6 months (Total: ${totalAll} customers)`,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get customers error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/:id - Get customer detail by ID with related data
 */
export const getCustomerDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id,
        trash: null
      },
      select: {
        id: true,
        code: true,
        zahir_id: true,
        customer_name: true,
        business: true,
        npwp: true,
        legal_document: true,
        email: true,
        website: true,
        bank_name: true,
        account_name: true,
        account_number: true,
        bank_branch: true,
        bank_address: true,
        supplier_of: true,
        supplier_code: true,
        remarks: true,
        created_at: true,
        updated_at: true,
        created_by: true,
        updated_by: true,
        special_customer: true,
        top: true,
        payment_middle: true,
        sales_incharge: true,
        ecoa: true,
        feeder: true,
        feeder_fee: true,
        agency: true,
        sales_feeder: true,
        sales_id: true,
        central_cust_id: true,
        is_corporate: true,
        addresses: {
          where: { trash: null },
          select: {
            id: true,
            address_type: true,
            address: true,
            phone: true,
            fax: true,
            city: true,
            state: true,
            country: true,
            postal_code: true,
            npwp: true,
            status: true,
            created_at: true,
            updated_at: true
          }
        },
        contacts: {
          where: { trash: null },
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
            updated_at: true,
            address: {
              select: {
                id: true,
                address_type: true,
                address: true,
                city: true,
                state: true,
                country: true
              }
            }
          }
        },
        users: {
          where: { trash: null },
          select: {
            id: true,
            username: true,
            email: true,
            display_name: true,
            role_id: true
          }
        }
      }
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    res.json({
      success: true,
      data: customer
    });
  } catch (error) {
    console.error('Get customer detail error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer detail',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/contacts - Get contacts for a specific customer with search and pagination
 */
export const getContacts = async (req: Request, res: Response): Promise<void> => {
  try {
    const customerId = parseId(req.query.customer_id as string | undefined);
    const searchQuery = sanitizeSearchQuery((req.query.search || req.query.q) as string | undefined);
    const limit = Math.min(parseQueryParam(req.query.limit, 20), 100);
    const offset = parseQueryParam(req.query.offset, 0);

    if (!customerId) {
      res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
      return;
    }

    // Check if customer exists
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, trash: null },
      select: { id: true }
    });

    if (!customer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Build where condition with spread operators
    const where = {
      customer_id: customerId,
      trash: null,
      ...buildMultiFieldSearchCondition(
        ['first_name', 'middle_name', 'surname', 'email'],
        searchQuery
      )
    };

    const [contacts, total] = await Promise.all([
      prisma.contact.findMany({
        where,
        orderBy: {
          id: 'desc'
        },
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
              country: true
            }
          }
        }
      }),
      prisma.contact.count({
        where
      })
    ]);

    const response: ApiResponse = {
      success: true,
      data: contacts,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get contacts error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/regions - Get distinct region values (city, state, or country)
 */
export const getRegions = async (req: Request, res: Response): Promise<void> => {
  try {
    const type = (req.query.type as string) || 'city';
    const searchQuery = sanitizeSearchQuery((req.query.search || req.query.q) as string | undefined);

    if (!['city', 'state', 'country'].includes(type)) {
      res.status(400).json({
        success: false,
        message: 'Type must be city, state, or country'
      });
      return;
    }

    // Build where condition with spread operators
    const baseWhere: any = {
      trash: null,
      [type]: {
        not: null
      }
    };

    const searchCondition = buildSearchCondition(type, searchQuery);
    // Merge search condition with base where, ensuring [type] conditions are combined
    const where = Object.keys(searchCondition).length > 0 && searchCondition[type]
      ? {
          ...baseWhere,
          [type]: {
            ...baseWhere[type],
            ...searchCondition[type]
          }
        }
      : baseWhere;

    // Use groupBy for better performance with distinct values
    // Note: Prisma's groupBy requires aggregation, so we'll use findMany with distinct
    const addresses = await prisma.address.findMany({
      where,
      select: {
        [type]: true
      },
      distinct: [type as 'city' | 'state' | 'country'],
      orderBy: {
        [type]: 'asc'
      }
    });

    // Extract and filter out null/undefined values, then sort
    const regions: string[] = [];
    for (const addr of addresses) {
      const value = (addr as any)[type] as string | null | undefined;
      if (value && typeof value === 'string' && value.trim() !== '') {
        regions.push(value);
      }
    }
    regions.sort((a, b) => a.localeCompare(b));

    res.json({
      success: true,
      data: regions
    });
  } catch (error) {
    console.error('Get regions error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regions',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/customers - Create new customer with optional address and contact
 */
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      code,
      customer_name,
      business,
      npwp,
      legal_document,
      email,
      website,
      bank_name,
      account_name,
      account_number,
      bank_branch,
      bank_address,
      supplier_of,
      supplier_code,
      remarks,
      special_customer,
      top,
      payment_middle,
      sales_incharge,
      ecoa,
      feeder,
      feeder_fee,
      agency,
      sales_feeder,
      sales_id,
      central_cust_id,
      is_corporate,
      address,
      contact
    } = req.body;

    // Validate required fields
    if (!code || !customer_name || !business) {
      res.status(400).json({
        success: false,
        message: 'Code, customer_name, and business are required'
      });
      return;
    }

    // Check if code already exists
    const existingCode = await checkDuplicateCaseInsensitive(
      prisma.customer,
      'code',
      code
    );
    if (existingCode) {
      res.status(409).json({
        success: false,
        message: 'Code already exists'
      });
      return;
    }

    // Check if customer_name already exists
    const existingName = await checkDuplicateCaseInsensitive(
      prisma.customer,
      'customer_name',
      customer_name
    );
    if (existingName) {
      res.status(409).json({
        success: false,
        message: 'Customer name already exists'
      });
      return;
    }

    // If contact is provided, address must also be provided
    if (contact && !address) {
      res.status(400).json({
        success: false,
        message: 'Address is required when contact is provided'
      });
      return;
    }

    const createdBy = req.user?.id || 1;

    // Use transaction with nested writes to create customer, address, and contact atomically
    const result = await prisma.$transaction(async (tx) => {
      // Prepare nested writes data
      const customerData: any = {
        code,
        customer_name,
        business,
        npwp: npwp || null,
        legal_document: legal_document || null,
        email: email || null,
        website: website || null,
        bank_name: bank_name || null,
        account_name: account_name || null,
        account_number: account_number || null,
        bank_branch: bank_branch || null,
        bank_address: bank_address || null,
        supplier_of: supplier_of || null,
        supplier_code: supplier_code || null,
        remarks: remarks || null,
        special_customer: special_customer ? 1 : 0,
        top: top || 0,
        payment_middle: payment_middle ? 1 : 0,
        sales_incharge: sales_incharge || null,
        ecoa: ecoa || 0,
        feeder: feeder || null,
        feeder_fee: feeder_fee || 0,
        agency: agency || 0,
        sales_feeder: sales_feeder || 0,
        sales_id: sales_id || null,
        central_cust_id: central_cust_id || null,
        is_corporate: is_corporate || 0,
        created_by: createdBy
      };

      // Add nested address creation if provided
      if (address) {
        // BR-003: Address type uniqueness validation
        // Note: For new customer creation, uniqueness check is not needed since
        // no addresses exist yet. Uniqueness is enforced in manageAddress for existing customers.
        const addressType = address.address_type || 'Main Office';
        
        customerData.addresses = {
          create: {
            address_type: addressType,
            address: address.address,
            phone: address.phone,
            fax: address.fax || null,
            city: normalizeLocation(String(address.city)),
            state: normalizeLocation(String(address.state)),
            country: normalizeLocation(String(address.country)),
            postal_code: address.postal_code || null,
            npwp: address.npwp || null,
            status: address.status || 'Active',
            created_by: createdBy
          }
        };
      }

      // Create customer with nested writes
      const customer = await tx.customer.create({
        data: customerData,
        include: {
          addresses: true
        }
      });

      // Create contact if provided (requires address)
      if (contact && address && customer.addresses && customer.addresses.length > 0) {
        const createdAddress = customer.addresses[0];
        await tx.contact.create({
          data: {
            customer_id: customer.id,
            address_id: createdAddress.id,
            title: contact.title || '',
            first_name: contact.first_name,
            middle_name: contact.middle_name || null,
            surname: contact.surname,
            // BR-004: Username generation from first-middle-surname if email not provided
            username: contact.email || generateUsername(contact.first_name, contact.middle_name, contact.surname),
            job_title: contact.job_title || null,
            department: contact.department || null,
            email: contact.email,
            phone: contact.phone,
            fax: contact.fax || null,
            mobile_phone: contact.mobile_phone || null,
            status: contact.status || 'Active',
            created_by: createdBy
          }
        });
      }

      // Return customer with all relations
      return await tx.customer.findFirst({
        where: { id: customer.id },
        select: {
          id: true,
          code: true,
          customer_name: true,
          business: true,
          npwp: true,
          legal_document: true,
          email: true,
          website: true,
          bank_name: true,
          account_name: true,
          account_number: true,
          bank_branch: true,
          bank_address: true,
          supplier_of: true,
          supplier_code: true,
          remarks: true,
          special_customer: true,
          top: true,
          payment_middle: true,
          sales_incharge: true,
          ecoa: true,
          feeder: true,
          feeder_fee: true,
          agency: true,
          sales_feeder: true,
          sales_id: true,
          central_cust_id: true,
          is_corporate: true,
          created_at: true,
          addresses: {
            where: { trash: null },
            select: {
              id: true,
              address_type: true,
              address: true,
              phone: true,
              fax: true,
              city: true,
              state: true,
              country: true,
              postal_code: true,
              npwp: true,
              status: true
            }
          },
          contacts: {
            where: { trash: null },
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
              address: {
                select: {
                  id: true,
                  address_type: true,
                  address: true,
                  city: true,
                  state: true,
                  country: true
                }
              }
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: result
    });
  } catch (error) {
    console.error('Create customer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/customers/:id - Update customer
 */
export const updateCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        trash: null
      }
    });

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Update customer
    const {
      code,
      customer_name,
      business,
      npwp,
      legal_document,
      legal_document_add,
      legal_document_remove,
      email,
      website,
      bank_name,
      account_name,
      account_number,
      bank_branch,
      bank_address,
      supplier_of,
      supplier_code,
      remarks,
      special_customer,
      top,
      payment_middle,
      sales_incharge,
      ecoa,
      feeder,
      feeder_fee,
      agency,
      sales_feeder,
      sales_id,
      central_cust_id,
      is_corporate
    } = req.body;

    // Code uniqueness validation if changed
    if (code && code !== existingCustomer.code) {
      const codeExists = await checkDuplicateCaseInsensitive(
        prisma.customer,
        'code',
        code,
        id
      );
      if (codeExists) {
        res.status(409).json({
          success: false,
          message: 'Code already exists'
        });
        return;
      }
    }

    // Check if customer_name is being changed and if it already exists
    if (customer_name && customer_name !== existingCustomer.customer_name) {
      const nameExists = await checkDuplicateCaseInsensitive(
        prisma.customer,
        'customer_name',
        customer_name,
        id
      );
      if (nameExists) {
        res.status(409).json({
          success: false,
          message: 'Customer name already exists'
        });
        return;
      }
    }

    // Build update data
    const updateData: any = {};
    
    if (code !== undefined) updateData.code = code;
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (business !== undefined) updateData.business = business;
    if (npwp !== undefined) updateData.npwp = npwp;
    // BR-006: File handling for legal_document. Support append/remove via ';;' delimiter
    if (legal_document !== undefined || legal_document_add !== undefined || legal_document_remove !== undefined) {
      updateData.legal_document = handleLegalDocument(
        existingCustomer.legal_document || '',
        typeof legal_document_add === 'string' ? legal_document_add : undefined,
        Array.isArray(legal_document_remove) ? legal_document_remove as string[] : undefined,
        typeof legal_document === 'string' ? legal_document : undefined
      );
    }
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (account_name !== undefined) updateData.account_name = account_name;
    if (account_number !== undefined) updateData.account_number = account_number;
    if (bank_branch !== undefined) updateData.bank_branch = bank_branch;
    if (bank_address !== undefined) updateData.bank_address = bank_address;
    if (supplier_of !== undefined) updateData.supplier_of = supplier_of;
    if (supplier_code !== undefined) updateData.supplier_code = supplier_code;
    if (remarks !== undefined) updateData.remarks = remarks;
    if (special_customer !== undefined) updateData.special_customer = special_customer ? 1 : 0;
    if (top !== undefined) updateData.top = top;
    if (payment_middle !== undefined) updateData.payment_middle = payment_middle ? 1 : 0;
    if (sales_incharge !== undefined) updateData.sales_incharge = sales_incharge;
    if (ecoa !== undefined) updateData.ecoa = ecoa;
    if (feeder !== undefined) updateData.feeder = feeder;
    if (feeder_fee !== undefined) updateData.feeder_fee = feeder_fee;
    if (agency !== undefined) updateData.agency = agency;
    if (sales_feeder !== undefined) updateData.sales_feeder = sales_feeder;
    if (sales_id !== undefined) updateData.sales_id = sales_id;
    if (central_cust_id !== undefined) updateData.central_cust_id = central_cust_id;
    if (is_corporate !== undefined) updateData.is_corporate = is_corporate;

    // Set updated_by if user is authenticated
    if (req.user?.id) {
      updateData.updated_by = req.user.id;
    }

    // Update customer with optimized select
    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        code: true,
        customer_name: true,
        business: true,
        npwp: true,
        legal_document: true,
        email: true,
        website: true,
        bank_name: true,
        account_name: true,
        account_number: true,
        bank_branch: true,
        bank_address: true,
        supplier_of: true,
        supplier_code: true,
        remarks: true,
        special_customer: true,
        top: true,
        payment_middle: true,
        sales_incharge: true,
        ecoa: true,
        feeder: true,
        feeder_fee: true,
        agency: true,
        sales_feeder: true,
        sales_id: true,
        central_cust_id: true,
        is_corporate: true,
        created_at: true,
        updated_at: true,
        addresses: {
          where: { trash: null },
          select: {
            id: true,
            address_type: true,
            address: true,
            phone: true,
            fax: true,
            city: true,
            state: true,
            country: true,
            postal_code: true,
            npwp: true,
            status: true
          }
        },
        contacts: {
          where: { trash: null },
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
            address: {
              select: {
                id: true,
                address_type: true,
                address: true,
                city: true,
                state: true,
                country: true
              }
            }
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: updatedCustomer
    });
  } catch (error) {
    console.error('Update customer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/json - JSON search endpoint with nested data
 */
export const getCustomersJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = sanitizeSearchQuery(typeof req.query.q === 'string' ? req.query.q : undefined);
    const isDataTable = req.query.dataTable !== undefined;
    const take = isDataTable ? 1000 : 20;

    const where: any = {
      trash: null,
      ...(q && buildSearchCondition('customer_name', q))
    };

    // Role-based filter: customer role sees only their own record
    if ((req as any).user?.role_id === 16 && (req as any).user?.customer_id) {
      where.id = (req as any).user.customer_id;
    }

    const customers = await prisma.customer.findMany({
      where,
      take,
      orderBy: { id: 'desc' },
      include: {
        addresses: { where: { trash: null } },
        contacts: { where: { trash: null } }
      }
    });

    // Get active contracts for all customers (if Contract model exists)
    const items = await Promise.all(customers.map(async (c) => {
      const activeContract = await getActiveContract(c.id);
      return {
        id: c.id,
        customer_name: c.customer_name,
        code: c.code,
        addresses: c.addresses,
        contacts: c.contacts,
        contract: activeContract,
        ...getCustomFields(c.customer_name)
      };
    }));

    const response: any = {
      total_count: items.length,
      incomplete_results: false
    };
    if (isDataTable) response.data = items;
    else response.items = items;

    res.json(response);
  } catch (error) {
    console.error('getCustomersJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers JSON',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/json-top - Top revenue stats (fallback to pre-order counts if revenue data unavailable)
 */
export const getTopRevenue = async (req: Request, res: Response): Promise<void> => {
  try {
    const year = typeof req.query.year === 'string' ? parseInt(req.query.year, 10) : new Date().getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31, 23, 59, 59, 999);

    // Fallback metric: number of preOrders per customer (since revenue model not present)
    const grouped = await prisma.preOrder.groupBy({
      by: ['customer_id'],
      _count: { _all: true },
      where: {
        trash: null,
        created_at: { gte: start, lte: end }
      }
    });

    // Map with customer names
    const customerIds = grouped.map(g => g.customer_id);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, customer_name: true }
    });
    const idToName = new Map(customers.map(c => [c.id, c.customer_name]));

    const sorted = grouped
      .map(g => ({ label: idToName.get(g.customer_id) || `Customer #${g.customer_id}`, value: g._count._all }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const total = sorted.reduce((sum, x) => sum + x.value, 0) || 1;
    const labels = sorted.map(s => s.label);
    const datasets = [{
      label: `Top Customers ${year}`,
      data: sorted.map(s => Math.round((s.value / total) * 100)),
    }];

    res.json({
      success: true,
      data: { labels, datasets }
    });
  } catch (error) {
    console.error('getTopRevenue error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to compute top revenue',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/contacts/json - Contact autocomplete
 */
export const getContactsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = sanitizeSearchQuery(typeof req.query.q === 'string' ? req.query.q : undefined);
    const customerId = parseId(String(req.query.customer_id || ''));
    const isDataTable = req.query.dataTable !== undefined;
    const take = isDataTable ? 1000 : 20;

    if (!customerId) {
      res.status(400).json({ success: false, message: 'customer_id is required' });
      return;
    }

    const where = {
      trash: null as any,
      customer_id: customerId,
      ...(q ? buildMultiFieldSearchCondition(['first_name', 'middle_name', 'surname', 'email'], q) : {})
    };

    const contacts = await prisma.contact.findMany({
      where,
      take,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        first_name: true,
        middle_name: true,
        surname: true,
        email: true
      }
    });

    const items = contacts.map(c => ({
      id: c.id,
      text: [c.first_name, c.middle_name, c.surname].filter(Boolean).join(' '),
      email: c.email
    }));

    const response: any = {
      total_count: items.length,
      incomplete_results: false
    };
    if (isDataTable) response.data = items;
    else response.items = items;

    res.json(response);
  } catch (error) {
    console.error('getContactsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/customers/fetch-json - Paginated list with advanced filters
 */
export const getFetchJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const per_page = parseQueryParam(req.query.per_page, 20);
    const skip = (page - 1) * per_page;

    const customerId = typeof req.query.customer_id === 'string' ? parseId(req.query.customer_id) : undefined;
    const priority = typeof req.query.priority === 'string' ? parseInt(req.query.priority, 10) : undefined; // maps to special_customer
    const payment = typeof req.query.payment === 'string' ? parseInt(req.query.payment, 10) : undefined; // maps to payment_middle
    const sales = typeof req.query.sales === 'string' ? String(req.query.sales) : undefined; // maps to sales_incharge
    const order_by = typeof req.query.order_by === 'string' ? String(req.query.order_by) : 'id:desc';

    const where: any = { trash: null };
    if (customerId) where.id = customerId;
    if (priority !== undefined) where.special_customer = priority ? 1 : 0;
    if (payment !== undefined) where.payment_middle = payment ? 1 : 0;
    if (sales) where.sales_incharge = sales;

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        take: per_page,
        skip,
        orderBy: (() => {
          const [field, dir] = order_by.split(':');
          return { [field || 'id']: (dir === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' };
        })(),
        select: {
          id: true,
          code: true,
          customer_name: true,
          special_customer: true,
          payment_middle: true,
          sales_incharge: true
        }
      }),
      prisma.customer.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        total_count: total,
        items
      },
      pagination: {
        page,
        limit: per_page,
        total,
        totalPages: Math.ceil(total / per_page)
      }
    });
  } catch (error) {
    console.error('getFetchJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customers',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST/PUT/DELETE /api/customers/addresses - Manage Address
 * Body: { action: 'create'|'update'|'delete', ...fields }
 */
export const manageAddress = async (req: Request, res: Response): Promise<void> => {
  try {
    const action = typeof req.body.action === 'string' ? req.body.action.toLowerCase() : (req.method === 'DELETE' ? 'delete' : req.method === 'PUT' ? 'update' : 'create');
    const userId = (req as any).user?.id || 1;

    if (action === 'create') {
      const customer_id = parseId(String(req.body.customer_id));
      if (!customer_id) {
        res.status(400).json({ success: false, message: 'customer_id is required' });
        return;
      }
      const {
        address_type, address, phone, fax, city, state, country, postal_code, npwp, status
      } = req.body;

      // BR-003: Address type uniqueness per customer
      const incomingType = String(address_type || '').trim().toLowerCase();
      if (incomingType) {
        const existing = await prisma.address.findMany({
          where: { customer_id, trash: null },
          select: { id: true, address_type: true }
        });
        const dup = existing.some(a => String(a.address_type).trim().toLowerCase() === incomingType);
        if (dup) {
          res.status(409).json({ success: false, message: 'Address type already exists for this customer' });
          return;
        }
      }

      const created = await prisma.address.create({
        data: {
          customer_id,
          address_type: address_type || 'Main Office',
          address,
          phone,
          fax: fax || null,
          city: normalizeLocation(String(city)),
          state: normalizeLocation(String(state)),
          country: normalizeLocation(String(country)),
          postal_code: postal_code ? parseInt(String(postal_code), 10) || null : null,
          npwp: npwp || null,
          status: status || 'Active',
          created_by: userId
        }
      });
      res.status(201).json({ success: true, message: 'Address created', data: created });
      return;
    }

    if (action === 'update') {
      const id = parseId(String(req.body.id));
      if (!id) {
        res.status(400).json({ success: false, message: 'id is required' });
        return;
      }
      const address = await prisma.address.findFirst({ where: { id, trash: null } });
      if (!address) {
        res.status(404).json({ success: false, message: 'Address not found' });
        return;
      }
      const {
        address_type, address: addr, phone, fax, city, state, country, postal_code, npwp, status
      } = req.body;

      // BR-003: Address type uniqueness (exclude self)
      if (address_type && address_type !== address.address_type) {
        const incomingType = String(address_type).trim().toLowerCase();
        const existing = await prisma.address.findMany({
          where: {
            customer_id: address.customer_id,
            trash: null,
            id: { not: id }
          },
          select: { id: true, address_type: true }
        });
        const dup = existing.some(a => String(a.address_type).trim().toLowerCase() === incomingType);
        if (dup) {
          res.status(409).json({ success: false, message: 'Address type already exists for this customer' });
          return;
        }
      }

      const updated = await prisma.address.update({
        where: { id },
        data: {
          ...(address_type !== undefined ? { address_type } : {}),
          ...(addr !== undefined ? { address: addr } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(fax !== undefined ? { fax } : {}),
          ...(city !== undefined ? { city: normalizeLocation(String(city)) } : {}),
          ...(state !== undefined ? { state: normalizeLocation(String(state)) } : {}),
          ...(country !== undefined ? { country: normalizeLocation(String(country)) } : {}),
          ...(postal_code !== undefined ? { postal_code: postal_code ? parseInt(String(postal_code), 10) || null : null } : {}),
          ...(npwp !== undefined ? { npwp } : {}),
          ...(status !== undefined ? { status } : {}),
          updated_by: userId
        }
      });
      res.json({ success: true, message: 'Address updated', data: updated });
      return;
    }

    if (action === 'delete') {
      const id = parseId(String(req.body.id || req.query.id || ''));
      if (!id) {
        res.status(400).json({ success: false, message: 'id is required' });
        return;
      }
      const address = await prisma.address.findFirst({ where: { id, trash: null } });
      if (!address) {
        res.status(404).json({ success: false, message: 'Address not found' });
        return;
      }
      await prisma.address.update({ where: { id }, data: { trash: 1, updated_by: userId } });
      res.json({ success: true, message: 'Address deleted' });
      return;
    }

    res.status(400).json({ success: false, message: 'Unsupported action' });
  } catch (error) {
    console.error('manageAddress error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to manage address',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST/PUT/DELETE /api/customers/contacts - Manage Contact
 * Body: { action: 'create'|'update'|'delete', ...fields }
 */
export const manageContact = async (req: Request, res: Response): Promise<void> => {
  try {
    const action = typeof req.body.action === 'string' ? req.body.action.toLowerCase() : (req.method === 'DELETE' ? 'delete' : req.method === 'PUT' ? 'update' : 'create');
    const userId = (req as any).user?.id || 1;

    if (action === 'create') {
      const customer_id = parseId(String(req.body.customer_id));
      const address_id = parseId(String(req.body.address_id));
      if (!customer_id || !address_id) {
        res.status(400).json({ success: false, message: 'customer_id and address_id are required' });
        return;
      }

      // Validate address belongs to customer
      const address = await prisma.address.findFirst({ where: { id: address_id, customer_id, trash: null } });
      if (!address) {
        res.status(400).json({ success: false, message: 'address_id does not belong to the specified customer' });
        return;
      }

      const {
        title, first_name, middle_name, surname, job_title, department, email, phone, fax, mobile_phone, status
      } = req.body;

      const created = await prisma.contact.create({
        data: {
          customer_id,
          address_id,
          title: title || '',
          first_name,
          middle_name: middle_name || null,
          surname,
          username: email || generateUsername(first_name, middle_name, surname),
          job_title: job_title || null,
          department: department || null,
          email,
          phone,
          fax: fax || null,
          mobile_phone: mobile_phone || null,
          status: status || 'Active',
          created_by: userId
        }
      });
      res.status(201).json({ success: true, message: 'Contact created', data: created });
      return;
    }

    if (action === 'update') {
      const id = parseId(String(req.body.id));
      if (!id) {
        res.status(400).json({ success: false, message: 'id is required' });
        return;
      }
      const existing = await prisma.contact.findFirst({ where: { id, trash: null } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Contact not found' });
        return;
      }

      const {
        title, first_name, middle_name, surname, job_title, department, email, phone, fax, mobile_phone, status
      } = req.body;

      const updated = await prisma.contact.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(first_name !== undefined ? { first_name } : {}),
          ...(middle_name !== undefined ? { middle_name } : {}),
          ...(surname !== undefined ? { surname } : {}),
          // Regenerate username when name changes and email not provided
          ...(first_name !== undefined || middle_name !== undefined || surname !== undefined
            ? { username: email || generateUsername(first_name ?? existing.first_name, middle_name ?? existing.middle_name ?? undefined, surname ?? existing.surname) }
            : {}),
          ...(job_title !== undefined ? { job_title } : {}),
          ...(department !== undefined ? { department } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(fax !== undefined ? { fax } : {}),
          ...(mobile_phone !== undefined ? { mobile_phone } : {}),
          ...(status !== undefined ? { status } : {}),
          updated_by: userId
        }
      });
      res.json({ success: true, message: 'Contact updated', data: updated });
      return;
    }

    if (action === 'delete') {
      const id = parseId(String(req.body.id || req.query.id || ''));
      if (!id) {
        res.status(400).json({ success: false, message: 'id is required' });
        return;
      }
      const existing = await prisma.contact.findFirst({ where: { id, trash: null } });
      if (!existing) {
        res.status(404).json({ success: false, message: 'Contact not found' });
        return;
      }
      await prisma.contact.update({ where: { id }, data: { trash: 1, updated_by: userId } });
      res.json({ success: true, message: 'Contact deleted' });
      return;
    }

    res.status(400).json({ success: false, message: 'Unsupported action' });
  } catch (error) {
    console.error('manageContact error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to manage contact',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/customers/:id - Soft delete customer
 */
export const deleteCustomer = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check user role - only SuperAdmin and Admin can delete
    if (!req.user || (req.user.role_id !== 1 && req.user.role_id !== 2)) {
      res.status(403).json({
        success: false,
        message: 'Only SuperAdmin and Admin can delete customers'
      });
      return;
    }

    // Check if customer exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        id,
        trash: null
      }
    });

    if (!existingCustomer) {
      res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
      return;
    }

    // Soft delete
    await prisma.customer.update({
      where: { id },
      data: { trash: 1 }
    });

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

// ===== Helper Functions =====
function normalizeLocation(value: string): string {
  if (!value) return '';
  return value
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function generateUsername(first: string, middle?: string | null, surname?: string): string {
  const parts = [first, middle ?? undefined, surname].filter(Boolean).map(p => String(p).toLowerCase());
  return parts.join('-').replace(/--+/g, '-');
}

function getCustomFields(customerName: string): any {
  const name = (customerName || '').toLowerCase();
  if (name.includes('hero')) {
    return { custom_fields: { brand: 'Hero', priority: 'A' } };
  }
  if (name.includes('coca cola')) {
    return { custom_fields: { brand: 'Coca-Cola', priority: 'A' } };
  }
  return {};
}

/**
 * Get active contract for customer (if Contract model exists)
 * Returns null if model doesn't exist or no active contract found
 */
async function getActiveContract(customerId: number): Promise<any | null> {
  try {
    // Check if Contract model exists in Prisma schema
    // If Contract model doesn't exist, this will fail gracefully
    if (!('contract' in prisma)) {
      return null;
    }
    
    const now = new Date();
    // @ts-ignore - Contract model may not exist in type definitions
    const contract = await prisma.contract.findFirst({
      where: {
        customerId: customerId,
        deletedAt: null,
        periodFrom: { lte: now },
        periodTo: { gte: now }
      },
      orderBy: { periodFrom: 'desc' },
      take: 1
    });
    
    return contract || null;
  } catch (error) {
    // Contract model doesn't exist or error occurred
    return null;
  }
}

/**
 * Handle legal_document delimited string with ';;'
 * - If override is provided, use it directly
 * - Else append newFile (if provided) and remove any listed in removeFiles
 */
function handleLegalDocument(
  existing: string,
  newFile?: string,
  removeFiles?: string[],
  override?: string
): string {
  if (override !== undefined) {
    return override;
  }
  const parts = (existing || '')
    .split(';;')
    .map(s => s.trim())
    .filter(Boolean);
  const toRemove = new Set((removeFiles || []).map(s => s.trim()).filter(Boolean));
  const filtered = parts.filter(p => !toRemove.has(p));
  if (newFile && newFile.trim()) {
    filtered.push(newFile.trim());
  }
  return filtered.join(';;');
}

