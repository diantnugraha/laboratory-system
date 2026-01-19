import { PrismaClient } from '@prisma/client';
import {
  IQuotationRepository,
  QuotationFilter,
  CreateQuotationDTO,
  UpdateQuotationDTO,
  QuotationWithRelations,
  QuotationListItem,
  FetchJsonResponse,
  FetchJsonItem,
  ReportRowData,
  QuotationDetailData,
  SampleArrayStructure,
  LabType,
} from '../contracts/IQuotationRepository.js';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult.js';
import { buildMultiFieldSearchCondition } from '../../utils/searchHelper.js';
import {
  QUOTATION_CONFIG,
  QUOTATION_CODE_PREFIX,
  SKIP_SEARCH_DOMAINS,
} from '../../config/quotation.js';

/**
 * Quotation Repository Implementation
 * Concrete implementation of quotation data access operations
 */
export class QuotationRepository implements IQuotationRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Format date to DD-MM-YYYY
   */
  private formatDateDMY(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Calculate valid date (quo_date + 1 month)
   */
  private calculateValidDate(quoDate: Date): Date {
    const validDate = new Date(quoDate);
    validDate.setMonth(validDate.getMonth() + QUOTATION_CONFIG.VALID_DATE_MONTHS);
    return validDate;
  }

  /**
   * Format number with thousand separator
   */
  private formatNumber(num: number): string {
    return num.toLocaleString('id-ID');
  }

  /**
   * Get contact full name
   */
  private getContactFullName(contact: {
    first_name: string;
    middle_name?: string | null;
    surname: string;
  } | null): string {
    if (!contact) return '';
    return [contact.first_name, contact.middle_name, contact.surname]
      .filter(Boolean)
      .join(' ');
  }

  async findAll(filter: QuotationFilter): Promise<RepositoryResult<PaginatedData<QuotationWithRelations>>> {
    try {
      const { search, qCode, customerId, contactId, lab, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = { trash: null };

      // Multi-field search on code
      if (search) {
        Object.assign(where, buildMultiFieldSearchCondition(['code'], search));
      }

      // Search by quotation code
      if (qCode) {
        where.code = { contains: qCode };
      }

      // Filter by customer
      if (customerId) {
        where.customer_id = customerId;
      }

      // Filter by contact
      if (contactId) {
        where.contact_id = contactId;
      }

      // Filter by lab type
      if (lab) {
        where.lab = lab;
      }

      // Customer role filter
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.customer_id = filter.userCustomerId;
      }

      const [data, total] = await Promise.all([
        this.prisma.quotation.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                code: true,
                customer_name: true,
                special_customer: true,
                top: true,
              },
            },
            contact: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                surname: true,
                email: true,
                phone: true,
                department: true,
              },
            },
            address: {
              select: {
                id: true,
                address: true,
                city: true,
                state: true,
                country: true,
              },
            },
            orders: {
              where: { trash: null },
              take: 1,
              select: {
                id: true,
                code: true,
                order_status: true,
              },
            },
          },
        }),
        this.prisma.quotation.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: data as unknown as QuotationWithRelations[],
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch quotations: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<QuotationWithRelations | null>> {
    try {
      const quotation = await this.prisma.quotation.findFirst({
        where: { id, trash: null },
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
              special_customer: true,
              top: true,
            },
          },
          contact: {
            select: {
              id: true,
              first_name: true,
              middle_name: true,
              surname: true,
              email: true,
              phone: true,
              department: true,
            },
          },
          address: {
            select: {
              id: true,
              address: true,
              city: true,
              state: true,
              country: true,
            },
          },
          quotation_detail: {
            orderBy: [{ index_sample: 'asc' }, { index_array: 'asc' }],
          },
          orders: {
            where: { trash: null },
            take: 1,
            select: {
              id: true,
              code: true,
              order_status: true,
            },
          },
        },
      });

      if (!quotation) {
        return RepositoryResult.fail('Quotation not found');
      }

      return RepositoryResult.ok(quotation as unknown as QuotationWithRelations);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch quotation: ${error.message}`);
    }
  }

  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<QuotationWithRelations | null>> {
    try {
      const where: any = {
        code: { equals: code, mode: 'insensitive' },
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const quotation = await this.prisma.quotation.findFirst({
        where,
        include: {
          customer: {
            select: {
              id: true,
              code: true,
              customer_name: true,
            },
          },
          contact: {
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
      });

      return RepositoryResult.ok(quotation as unknown as QuotationWithRelations | null);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to find quotation by code: ${error.message}`);
    }
  }

  async findForAutocomplete(
    search?: string,
    customerId?: number,
    isDataTable?: boolean
  ): Promise<RepositoryResult<QuotationListItem[]>> {
    try {
      const where: any = { trash: null };

      if (search) {
        // Skip domain-like search terms
        if (!SKIP_SEARCH_DOMAINS.includes(search as typeof SKIP_SEARCH_DOMAINS[number])) {
          Object.assign(where, {
            OR: [{ code: { contains: search } }, { customer: { customer_name: { contains: search } } }],
          });
        }
      }

      if (customerId) {
        where.customer_id = customerId;
      }

      const quotations = await this.prisma.quotation.findMany({
        where,
        select: {
          id: true,
          code: true,
          quo_status: true,
          quo_date: true,
          sampling_date: true,
          customer: {
            select: {
              id: true,
              customer_name: true,
            },
          },
          contact: {
            select: {
              id: true,
              first_name: true,
              middle_name: true,
              surname: true,
            },
          },
          orders: {
            where: { trash: null },
            take: 1,
            select: {
              id: true,
              code: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        take: isDataTable ? QUOTATION_CONFIG.DATATABLE_MAX_LIMIT : 20,
      });

      // Also check for pre-orders
      const quotationIds = quotations.map(q => q.id);
      const preOrders = await this.prisma.preOrder.findMany({
        where: {
          quotation_id: { in: quotationIds },
          trash: null,
        },
        select: {
          id: true,
          code: true,
          quotation_id: true,
        },
      });

      const preOrderMap = new Map(preOrders.map(po => [po.quotation_id, po]));

      const items: QuotationListItem[] = quotations.map(q => {
        const order = q.orders[0];
        const preOrder = preOrderMap.get(q.id);
        const validDate = q.quo_date ? this.calculateValidDate(new Date(q.quo_date)) : null;

        return {
          id: q.id,
          code: q.code,
          customer: {
            id: q.customer?.id || 0,
            name: q.customer?.customer_name || '',
          },
          contact: {
            id: q.contact?.id || 0,
            name: this.getContactFullName(q.contact),
          },
          status: order ? 'Order' : 'Created',
          date: this.formatDateDMY(q.quo_date),
          validDate: validDate ? this.formatDateDMY(validDate) : '',
          samplingDate: this.formatDateDMY(q.sampling_date),
          order: {
            id: order?.id || null,
            code: order?.code || null,
          },
          preOrder: {
            id: preOrder?.id || null,
            code: preOrder?.code || null,
          },
        };
      });

      return RepositoryResult.ok(items);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch quotations for autocomplete: ${error.message}`);
    }
  }

  async findForFetchJson(filter: QuotationFilter): Promise<RepositoryResult<FetchJsonResponse>> {
    try {
      const { qCode, customerId, status, salesId, dateStart, dateEnd, sortSubtotal, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        lab: LabType.STANDARD,
      };

      if (qCode) {
        where.code = { contains: qCode };
      }

      if (customerId) {
        where.customer_id = customerId;
      }

      if (salesId) {
        where.created_by = salesId;
      }

      if (dateStart) {
        where.created_at = { ...where.created_at, gte: dateStart };
      }

      if (dateEnd) {
        where.created_at = { ...where.created_at, lte: dateEnd };
      }

      // Handle status filter
      if (status && status !== '0') {
        if (status === 'Created') {
          where.orders = { none: { trash: null } };
        } else {
          where.orders = { some: { trash: null } };
        }
      }

      let orderBy: any = { id: 'desc' };
      if (sortSubtotal) {
        orderBy = { sub_total: sortSubtotal.toLowerCase() };
      }

      const [quotations, totalCount] = await Promise.all([
        this.prisma.quotation.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            customer: {
              select: {
                id: true,
                customer_name: true,
              },
            },
            contact: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                surname: true,
              },
            },
            orders: {
              where: { trash: null },
              take: 1,
              select: {
                id: true,
                order_status: true,
              },
            },
          },
        }),
        this.prisma.quotation.count({ where }),
      ]);

      // Get creator info (guard against empty array)
      const creatorIds = [...new Set(quotations.map(q => q.created_by).filter(Boolean))] as number[];
      const creators =
        creatorIds.length > 0
          ? await this.prisma.users.findMany({
              where: { id: { in: creatorIds } },
              select: { id: true, display_name: true },
            })
          : [];
      const creatorMap = new Map(creators.map(c => [c.id, c.display_name]));

      // Calculate sub_total_sum
      const subTotalSum = quotations.reduce((sum, q) => {
        const percentVat = q.percent_vat || 0;
        const subTotal = q.sub_total || 0;
        return sum + Math.round((subTotal * 100) / (100 + percentVat));
      }, 0);

      const items: FetchJsonItem[] = quotations.map(q => {
        const percentVat = q.percent_vat || 0;
        const order = q.orders[0];
        const validDate = q.quo_date ? this.calculateValidDate(new Date(q.quo_date)) : null;

        return {
          id: q.id,
          code: q.code,
          created: q.created_at.toISOString().replace('T', ' ').slice(0, 19),
          total: this.formatNumber(q.sub_total || 0),
          subTotal: this.formatNumber(Math.round(((q.sub_total || 0) * 100) / (percentVat + 100))),
          validDate: validDate ? this.formatDateDMY(validDate) : '',
          customer: {
            id: q.customer?.id || 0,
            name: q.customer?.customer_name || '',
          },
          contact: {
            id: q.contact?.id || 0,
            name: this.getContactFullName(q.contact),
          },
          creator: {
            id: q.created_by || 0,
            name: creatorMap.get(q.created_by) || '',
          },
          status: order ? `Order ${order.order_status || ''}` : 'Created',
        };
      });

      return RepositoryResult.ok({
        totalCount,
        stats: {
          itemCount: totalCount,
          subTotalSum,
        },
        items,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch quotations: ${error.message}`);
    }
  }

  async findForFetchJsonEnv(filter: QuotationFilter): Promise<RepositoryResult<FetchJsonResponse>> {
    try {
      const { qCode, customerId, status, dateStart, dateEnd, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = {
        trash: null,
        lab: LabType.ENVIRONMENTAL,
      };

      if (qCode) {
        where.code = { contains: qCode };
      }

      if (customerId) {
        where.customer_id = customerId;
      }

      if (dateStart) {
        where.created_at = { ...where.created_at, gte: dateStart };
      }

      if (dateEnd) {
        where.created_at = { ...where.created_at, lte: dateEnd };
      }

      // Handle status filter
      if (status && status !== '0') {
        if (status === 'Created') {
          where.orders = { none: { trash: null } };
        } else {
          where.orders = { some: { trash: null } };
        }
      }

      const [quotations, totalCount] = await Promise.all([
        this.prisma.quotation.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                customer_name: true,
              },
            },
            contact: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                surname: true,
              },
            },
            orders: {
              where: { trash: null },
              take: 1,
              select: {
                id: true,
                order_status: true,
              },
            },
          },
        }),
        this.prisma.quotation.count({ where }),
      ]);

      // Get creator info (guard against empty array)
      const creatorIds = [...new Set(quotations.map(q => q.created_by).filter(Boolean))] as number[];
      const creators =
        creatorIds.length > 0
          ? await this.prisma.users.findMany({
              where: { id: { in: creatorIds } },
              select: { id: true, display_name: true },
            })
          : [];
      const creatorMap = new Map(creators.map(c => [c.id, c.display_name]));

      const items: FetchJsonItem[] = quotations.map(q => {
        const percentVat = q.percent_vat || 0;
        const order = q.orders[0];
        const validDate = q.quo_date ? this.calculateValidDate(new Date(q.quo_date)) : null;

        return {
          id: q.id,
          code: q.code,
          created: q.created_at.toISOString().replace('T', ' ').slice(0, 19),
          total: this.formatNumber(q.sub_total || 0),
          subTotal: this.formatNumber(Math.round(((q.sub_total || 0) * 100) / (percentVat + 100))),
          validDate: validDate ? this.formatDateDMY(validDate) : '',
          customer: {
            id: q.customer?.id || 0,
            name: q.customer?.customer_name || '',
          },
          contact: {
            id: q.contact?.id || 0,
            name: this.getContactFullName(q.contact),
          },
          creator: {
            id: q.created_by || 0,
            name: creatorMap.get(q.created_by) || '',
          },
          status: order ? `Order ${order.order_status || ''}` : 'Created',
        };
      });

      return RepositoryResult.ok({
        totalCount,
        stats: {
          itemCount: totalCount,
          subTotalSum: 0, // Not calculated for env
        },
        items,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch environmental quotations: ${error.message}`);
    }
  }

  async findForCustomerPortal(
    filter: QuotationFilter,
    userDepartments?: string[]
  ): Promise<RepositoryResult<PaginatedData<QuotationListItem>>> {
    try {
      const { qCode, customerId, page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = { trash: null };

      if (qCode) {
        where.code = { contains: qCode };
      }

      if (customerId) {
        where.customer_id = customerId;
      }

      // Department filtering for customer users
      if (userDepartments && userDepartments.length > 0) {
        where.contact = {
          OR: [
            { department: { in: userDepartments } },
            { department: { equals: 'All Departement', mode: 'insensitive' } },
          ],
        };
      }

      const [quotations, totalCount] = await Promise.all([
        this.prisma.quotation.findMany({
          where,
          skip,
          take: limit,
          orderBy: { code: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                customer_name: true,
              },
            },
            contact: {
              select: {
                id: true,
                first_name: true,
                middle_name: true,
                surname: true,
                department: true,
              },
            },
            orders: {
              where: { trash: null },
              take: 1,
              select: {
                id: true,
                code: true,
              },
            },
          },
        }),
        this.prisma.quotation.count({ where }),
      ]);

      // Get pre-orders
      const quotationIds = quotations.map(q => q.id);
      const preOrders = await this.prisma.preOrder.findMany({
        where: {
          quotation_id: { in: quotationIds },
          trash: null,
        },
        select: {
          id: true,
          code: true,
          quotation_id: true,
        },
      });
      const preOrderMap = new Map(preOrders.map(po => [po.quotation_id, po]));

      const items: QuotationListItem[] = quotations.map(q => {
        const order = q.orders[0];
        const preOrder = preOrderMap.get(q.id);
        const validDate = q.quo_date ? this.calculateValidDate(new Date(q.quo_date)) : null;

        return {
          id: q.id,
          code: q.code,
          customer: {
            id: q.customer?.id || 0,
            name: q.customer?.customer_name || '',
          },
          contact: {
            id: q.contact?.id || 0,
            name: this.getContactFullName(q.contact),
          },
          status: order ? 'Order' : 'Created',
          date: this.formatDateDMY(q.quo_date),
          validDate: validDate ? this.formatDateDMY(validDate) : '',
          samplingDate: this.formatDateDMY(q.sampling_date),
          order: {
            id: order?.id || null,
            code: order?.code || null,
          },
          preOrder: {
            id: preOrder?.id || null,
            code: preOrder?.code || null,
          },
        };
      });

      return RepositoryResult.ok({
        data: items,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch customer portal quotations: ${error.message}`);
    }
  }

  async getReportData(
    startDate?: Date,
    endDate?: Date,
    includeTrash?: boolean
  ): Promise<RepositoryResult<ReportRowData[]>> {
    try {
      const where: any = {};

      if (!includeTrash) {
        where.trash = null;
      }

      if (startDate) {
        where.created_at = { ...where.created_at, gte: startDate };
      }

      if (endDate) {
        where.created_at = { ...where.created_at, lte: endDate };
      }

      const quotations = await this.prisma.quotation.findMany({
        where,
        include: {
          customer: {
            select: { customer_name: true },
          },
          contact: {
            select: {
              first_name: true,
              middle_name: true,
              surname: true,
            },
          },
          orders: {
            where: { trash: null },
            take: 1,
            select: { order_status: true },
            orderBy: { id: 'asc' },
          },
        },
        orderBy: { id: 'asc' },
      });

      // Get creators (guard against empty array)
      const creatorIds = [...new Set(quotations.map(q => q.created_by).filter(Boolean))] as number[];
      const creators =
        creatorIds.length > 0
          ? await this.prisma.users.findMany({
              where: { id: { in: creatorIds } },
              select: { id: true, display_name: true },
            })
          : [];
      const creatorMap = new Map(creators.map(c => [c.id, c.display_name]));

      const rows: ReportRowData[] = quotations.map(q => {
        const percentVat = q.percent_vat || 0;
        return {
          quotationCode: q.code,
          customerName: q.customer?.customer_name || '',
          contactName: this.getContactFullName(q.contact),
          status: q.quo_status,
          orderStatus: q.orders[0]?.order_status || null,
          quotationDate: this.formatDateDMY(q.quo_date),
          creator: creatorMap.get(q.created_by) || '',
          subTotal: Math.round(((q.sub_total || 0) * 100) / (100 + percentVat)),
          total: q.total || 0,
        };
      });

      return RepositoryResult.ok(rows);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get report data: ${error.message}`);
    }
  }

  async create(data: CreateQuotationDTO): Promise<RepositoryResult<QuotationWithRelations>> {
    try {
      // Enforce minimum total
      let total = data.total;
      if (total < QUOTATION_CONFIG.MIN_TOTAL) {
        total = QUOTATION_CONFIG.MIN_TOTAL;
      }

      const quotation = await this.prisma.$transaction(async tx => {
        // Create quotation
        const created = await tx.quotation.create({
          data: {
            code: data.code,
            quo_status: data.quoStatus,
            quo_date: data.quoDate,
            sampling_request: data.samplingRequest,
            sampling_date: data.samplingDate,
            customer_id: data.customerId,
            contact_id: data.contactId,
            address_id: data.addressId,
            volume: data.volume,
            remarks: data.remarks,
            min_volume_sample: data.minVolumeSample || '',
            sub_total: data.subTotal,
            percent_discount: data.percentDiscount || 0,
            percent_vat: data.percentVat || QUOTATION_CONFIG.DEFAULT_VAT_PERCENT,
            percent_pc: data.percentPc,
            price_group: data.priceGroup,
            priority: data.priority || 'normal',
            total,
            lab: data.lab || LabType.STANDARD,
            created_by: data.createdBy,
            created_at: new Date(),
          },
        });

        // Create product details
        if (data.products && data.products.length > 0) {
          // Get first service as fallback
          const firstService = await tx.service.findFirst({
            where: { trash: null },
            orderBy: { id: 'asc' },
            select: { id: true },
          });

          const serviceIdFallback = firstService?.id || 1;

          for (let i = 0; i < data.products.length; i++) {
            const product = data.products[i];
            await tx.quotation_detail.create({
              data: {
                sample_name: product.name,
                sample_description: '-',
                volume: '-',
                priority: 'normal',
                quotation_id: created.id,
                service_id: serviceIdFallback,
                quantity: product.quantity,
                price: product.price,
                percent_discount: product.discount,
                index_array: 0,
                index_sample: i,
                product: 1,
              },
            });
          }
        }

        // Create sample details (services and packages)
        if (data.samples && data.samples.length > 0) {
          // Batch load all packages to avoid N+1 queries
          const packageIds = data.samples
            .flatMap((s: { packages?: { packageId: number }[] }) => s.packages?.map((p: { packageId: number }) => p.packageId) || [])
            .filter((id: number | undefined): id is number => !!id);

          const packagesData =
            packageIds.length > 0
              ? await tx.package.findMany({
                  where: { id: { in: packageIds } },
                  select: { id: true, listService: true },
                })
              : [];

          const packageServiceMap = new Map<number, number[]>();
          for (const pkg of packagesData) {
            if (pkg.listService) {
              const serviceIds = pkg.listService
                .trim()
                .split(',')
                .filter(Boolean)
                .map((id: string) => parseInt(id, 10))
                .filter((id: number) => !isNaN(id));
              packageServiceMap.set(pkg.id, serviceIds);
            }
          }

          let sampleIndex = data.products?.length || 0;

          for (const sample of data.samples) {
            let arrayIndex = 0;

            // Create service details
            if (sample.services && sample.services.length > 0) {
              for (const service of sample.services) {
                await tx.quotation_detail.create({
                  data: {
                    sample_name: sample.name,
                    sample_description: '-',
                    volume: '-',
                    priority: sample.priority || 'normal',
                    quotation_id: created.id,
                    service_id: service.serviceId,
                    quantity: service.quantity,
                    percent_discount: service.discount,
                    index_array: arrayIndex,
                    index_sample: sampleIndex,
                  },
                });
                arrayIndex++;
              }
            }

            // Create package details (expand package to services using pre-loaded map)
            if (sample.packages && sample.packages.length > 0) {
              for (const pkg of sample.packages) {
                const serviceIds = packageServiceMap.get(pkg.packageId) || [];

                for (const serviceId of serviceIds) {
                  await tx.quotation_detail.create({
                    data: {
                      sample_name: sample.name,
                      sample_description: '-',
                      volume: '-',
                      priority: sample.priority || 'normal',
                      quotation_id: created.id,
                      service_id: serviceId,
                      package_id: pkg.packageId,
                      quantity: pkg.quantity,
                      percent_discount: pkg.discount,
                      index_array: arrayIndex,
                      index_sample: sampleIndex,
                    },
                  });
                }
                arrayIndex++;
              }
            }

            sampleIndex++;
          }
        }

        return created;
      });

      // Fetch the complete quotation with relations
      const result = await this.findById(quotation.id);
      if (result.isFailure()) {
        return RepositoryResult.fail(result.error || 'Failed to fetch created quotation');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return RepositoryResult.fail('Quotation code already exists');
      }
      return RepositoryResult.fail(`Failed to create quotation: ${error.message}`);
    }
  }

  async update(id: number, data: UpdateQuotationDTO): Promise<RepositoryResult<QuotationWithRelations>> {
    try {
      // Build update data
      const updateData: any = {
        updated_by: data.updatedBy,
        updated_at: new Date(),
      };

      if (data.quoStatus !== undefined) updateData.quo_status = data.quoStatus;
      if (data.quoDate !== undefined) updateData.quo_date = data.quoDate;
      if (data.samplingRequest !== undefined) updateData.sampling_request = data.samplingRequest;
      if (data.samplingDate !== undefined) updateData.sampling_date = data.samplingDate;
      if (data.customerId !== undefined) updateData.customer_id = data.customerId;
      if (data.contactId !== undefined) updateData.contact_id = data.contactId;
      if (data.addressId !== undefined) updateData.address_id = data.addressId;
      if (data.volume !== undefined) updateData.volume = data.volume;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;
      if (data.minVolumeSample !== undefined) updateData.min_volume_sample = data.minVolumeSample;
      if (data.subTotal !== undefined) updateData.sub_total = data.subTotal;
      if (data.percentDiscount !== undefined) updateData.percent_discount = data.percentDiscount;
      if (data.percentVat !== undefined) updateData.percent_vat = data.percentVat;
      if (data.percentPc !== undefined) updateData.percent_pc = data.percentPc;
      if (data.priceGroup !== undefined) updateData.price_group = data.priceGroup;
      if (data.priority !== undefined) updateData.priority = data.priority;
      if (data.lab !== undefined) updateData.lab = data.lab;

      // Enforce minimum total
      if (data.total !== undefined) {
        updateData.total = data.total < QUOTATION_CONFIG.MIN_TOTAL ? QUOTATION_CONFIG.MIN_TOTAL : data.total;
      }

      await this.prisma.$transaction(async tx => {
        // Update quotation
        await tx.quotation.update({
          where: { id },
          data: updateData,
        });

        // If samples or products provided, update details
        if (data.samples || data.products) {
          // Get existing details
          const existingDetails = await tx.quotation_detail.findMany({
            where: { quotation_id: id },
          });

          const existingServiceDetailIds = existingDetails
            .filter(d => d.package_id === null && d.product === null)
            .map(d => d.id);

          const existingPackageDetails = existingDetails.filter(d => d.package_id !== null);

          const existingProductDetailIds = existingDetails.filter(d => d.product === 1).map(d => d.id);

          const usedServiceDetailIds: number[] = [];
          const usedPackageKeys: string[] = [];
          const usedProductDetailIds: number[] = [];

          // Process products
          if (data.products) {
            const firstService = await tx.service.findFirst({
              where: { trash: null },
              orderBy: { id: 'asc' },
              select: { id: true },
            });
            const serviceIdFallback = firstService?.id || 1;

            for (let i = 0; i < data.products.length; i++) {
              const product = data.products[i];

              if (product.idDetail) {
                // Update existing
                usedProductDetailIds.push(product.idDetail);
                await tx.quotation_detail.update({
                  where: { id: product.idDetail },
                  data: {
                    sample_name: product.name,
                    quantity: product.quantity,
                    price: product.price,
                    percent_discount: product.discount,
                    index_sample: i,
                  },
                });
              } else {
                // Create new
                await tx.quotation_detail.create({
                  data: {
                    sample_name: product.name,
                    sample_description: '-',
                    volume: '-',
                    priority: 'normal',
                    quotation_id: id,
                    service_id: serviceIdFallback,
                    quantity: product.quantity,
                    price: product.price,
                    percent_discount: product.discount,
                    index_array: 0,
                    index_sample: i,
                    product: 1,
                  },
                });
              }
            }
          }

          // Process samples
          if (data.samples) {
            // Batch load all packages to avoid N+1 queries (for new packages only)
            const newPackageIds = data.samples
              .flatMap((s: { packages?: { idDetail?: string; packageId: number }[] }) =>
                s.packages?.filter((p: { idDetail?: string }) => !p.idDetail).map((p: { packageId: number }) => p.packageId) || []
              )
              .filter((pkgId: number | undefined): pkgId is number => !!pkgId);

            const packagesData =
              newPackageIds.length > 0
                ? await tx.package.findMany({
                    where: { id: { in: newPackageIds } },
                    select: { id: true, listService: true },
                  })
                : [];

            const packageServiceMap = new Map<number, number[]>();
            for (const pkg of packagesData) {
              if (pkg.listService) {
                const serviceIds = pkg.listService
                  .trim()
                  .split(',')
                  .filter(Boolean)
                  .map((sid: string) => parseInt(sid, 10))
                  .filter((sid: number) => !isNaN(sid));
                packageServiceMap.set(pkg.id, serviceIds);
              }
            }

            let sampleIndex = data.products?.length || 0;

            for (const sample of data.samples) {
              let arrayIndex = 0;

              // Process services
              if (sample.services) {
                for (const service of sample.services) {
                  if (service.idDetail) {
                    // Update existing
                    usedServiceDetailIds.push(service.idDetail);
                    await tx.quotation_detail.update({
                      where: { id: service.idDetail },
                      data: {
                        sample_name: sample.name,
                        priority: sample.priority || 'normal',
                        service_id: service.serviceId,
                        quantity: service.quantity,
                        percent_discount: service.discount,
                        index_array: arrayIndex,
                        index_sample: sampleIndex,
                      },
                    });
                  } else {
                    // Create new
                    await tx.quotation_detail.create({
                      data: {
                        sample_name: sample.name,
                        sample_description: '-',
                        volume: '-',
                        priority: sample.priority || 'normal',
                        quotation_id: id,
                        service_id: service.serviceId,
                        quantity: service.quantity,
                        percent_discount: service.discount,
                        index_array: arrayIndex,
                        index_sample: sampleIndex,
                      },
                    });
                  }
                  arrayIndex++;
                }
              }

              // Process packages
              if (sample.packages) {
                for (const pkg of sample.packages) {
                  if (pkg.idDetail) {
                    // Update existing package details
                    usedPackageKeys.push(pkg.idDetail);
                    await tx.quotation_detail.updateMany({
                      where: {
                        package_id: pkg.packageId,
                        quotation_id: id,
                        index_sample: sampleIndex,
                      },
                      data: {
                        sample_name: sample.name,
                        priority: sample.priority || 'normal',
                        quantity: pkg.quantity,
                        percent_discount: pkg.discount,
                        index_array: arrayIndex,
                      },
                    });
                  } else {
                    // Create new package details using pre-loaded map
                    const serviceIds = packageServiceMap.get(pkg.packageId) || [];

                    for (const serviceId of serviceIds) {
                      await tx.quotation_detail.create({
                        data: {
                          sample_name: sample.name,
                          sample_description: '-',
                          volume: '-',
                          priority: sample.priority || 'normal',
                          quotation_id: id,
                          service_id: serviceId,
                          package_id: pkg.packageId,
                          quantity: pkg.quantity,
                          percent_discount: pkg.discount,
                          index_array: arrayIndex,
                          index_sample: sampleIndex,
                        },
                      });
                    }
                  }
                  arrayIndex++;
                }
              }

              sampleIndex++;
            }
          }

          // Delete orphaned service details
          const orphanedServiceIds = existingServiceDetailIds.filter(
            detailId => !usedServiceDetailIds.includes(detailId)
          );
          if (orphanedServiceIds.length > 0) {
            await tx.quotation_detail.deleteMany({
              where: { id: { in: orphanedServiceIds } },
            });
          }

          // Delete orphaned product details
          const orphanedProductIds = existingProductDetailIds.filter(
            detailId => !usedProductDetailIds.includes(detailId)
          );
          if (orphanedProductIds.length > 0) {
            await tx.quotation_detail.deleteMany({
              where: { id: { in: orphanedProductIds } },
            });
          }

          // Delete orphaned package details
          for (const pkgDetail of existingPackageDetails) {
            const key = `${pkgDetail.package_id}__${pkgDetail.index_sample}`;
            if (!usedPackageKeys.includes(key)) {
              await tx.quotation_detail.deleteMany({
                where: {
                  package_id: pkgDetail.package_id,
                  index_sample: pkgDetail.index_sample,
                  quotation_id: id,
                },
              });
            }
          }
        }
      });

      // Fetch updated quotation
      const result = await this.findById(id);
      if (result.isFailure()) {
        return RepositoryResult.fail(result.error || 'Failed to fetch updated quotation');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update quotation: ${error.message}`);
    }
  }

  async delete(id: number, userId: number): Promise<RepositoryResult<boolean>> {
    try {
      // Check if quotation has linked orders
      const orderCount = await this.prisma.order.count({
        where: { quotation_id: id, trash: null },
      });

      if (orderCount > 0) {
        return RepositoryResult.fail(`Cannot delete quotation with ${orderCount} linked order(s)`);
      }

      await this.prisma.quotation.update({
        where: { id },
        data: {
          trash: userId,
          updated_by: userId,
          updated_at: new Date(),
        },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete quotation: ${error.message}`);
    }
  }

  async generateCode(labType?: string): Promise<RepositoryResult<string>> {
    try {
      // Use transaction with serializable isolation to prevent race conditions
      const code = await this.prisma.$transaction(
        async tx => {
          const now = new Date();
          const yearMonth = now.toISOString().slice(2, 4) + (now.getMonth() + 1).toString().padStart(2, '0');

          const isEnvironmental = labType === LabType.ENVIRONMENTAL;
          const prefix = isEnvironmental ? QUOTATION_CODE_PREFIX.ENVIRONMENTAL : QUOTATION_CODE_PREFIX.STANDARD;
          const fullPrefix = `${prefix}${yearMonth}`;

          // Find the latest code for this pattern with row-level lock
          const lastQuotation = await tx.quotation.findFirst({
            where: {
              code: { startsWith: fullPrefix },
              trash: null,
            },
            orderBy: { code: 'desc' },
            select: { code: true },
          });

          let sequence = 1;
          if (lastQuotation?.code) {
            const sequencePart = lastQuotation.code.substring(fullPrefix.length);
            const lastSequence = parseInt(sequencePart, 10);
            if (!isNaN(lastSequence)) {
              sequence = lastSequence + 1;
            }
          }

          // Pad sequence to 4 digits
          return `${fullPrefix}${sequence.toString().padStart(4, '0')}`;
        },
        {
          isolationLevel: 'Serializable',
          timeout: 10000,
        }
      );

      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate quotation code: ${error.message}`);
    }
  }

  async getForDuplication(
    id: number
  ): Promise<RepositoryResult<{ quotation: QuotationWithRelations; sampleArray: SampleArrayStructure } | null>> {
    try {
      const quotationResult = await this.findById(id);
      if (quotationResult.isFailure()) {
        return RepositoryResult.fail(quotationResult.error || 'Quotation not found');
      }

      const quotation = quotationResult.getValue();
      if (!quotation) {
        return RepositoryResult.ok(null);
      }

      // Parse details into sample array structure
      const sampleArray = this.parseSampleArray(quotation.quotation_detail || []);

      return RepositoryResult.ok({ quotation, sampleArray });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get quotation for duplication: ${error.message}`);
    }
  }

  private parseSampleArray(details: QuotationDetailData[]): SampleArrayStructure {
    const arr: SampleArrayStructure = {};
    let checkPackage: string | null = null;
    let checkSampleIndex: number | null = null;

    for (const detail of details) {
      const indexSample = detail.indexSample?.toString() || '0';
      const indexArray = detail.indexArray?.toString() || '0';

      if (checkSampleIndex !== detail.indexSample) {
        checkSampleIndex = detail.indexSample;
        arr[indexSample] = {
          name: detail.sampleName,
          quantity: detail.quantity,
          priority: detail.priority,
          service: {},
        };
      }

      if (detail.packageId) {
        const packageKey = `${detail.packageId}__${indexSample}`;
        if (checkPackage !== packageKey) {
          checkPackage = packageKey;
          if (!arr[indexSample].service) arr[indexSample].service = {};
          arr[indexSample].service![indexArray] = {
            id: detail.packageId,
            quantity: detail.quantity,
            discount: detail.percentDiscount,
            packageStatus: 'yes',
          };
        }
      } else if (detail.product === 1) {
        arr[indexSample].product = 'yes';
        arr[indexSample].price = detail.price || 0;
        arr[indexSample].discount = detail.percentDiscount;
        arr[indexSample].idDetail = detail.id;
      } else {
        if (!arr[indexSample].service) arr[indexSample].service = {};
        arr[indexSample].service![indexArray] = {
          id: detail.serviceId,
          quantity: detail.quantity,
          discount: detail.percentDiscount,
        };
      }
    }

    return arr;
  }

  async getDetails(quotationId: number): Promise<RepositoryResult<QuotationDetailData[]>> {
    try {
      const details = await this.prisma.quotation_detail.findMany({
        where: { quotation_id: quotationId },
        orderBy: [{ index_sample: 'asc' }, { index_array: 'asc' }],
        include: {
          service: {
            select: {
              id: true,
              code: true,
              name: true,
              price: true,
              parameter: { select: { id: true, name: true } },
              method: { select: { id: true, name: true } },
            },
          },
          Renamedpackage: {
            select: {
              id: true,
              code: true,
              name: true,
              totalPrice: true,
              listService: true,
            },
          },
        },
      });

      // Collect all service IDs from packages
      const packageServiceIds = new Set<number>();
      details.forEach(d => {
        if (d.Renamedpackage?.listService) {
          const ids = d.Renamedpackage.listService
            .split(',')
            .map(id => parseInt(id.trim(), 10))
            .filter(id => !isNaN(id));
          ids.forEach(id => packageServiceIds.add(id));
        }
      });

      // Fetch all package services in one query
      const packageServices =
        packageServiceIds.size > 0
          ? await this.prisma.service.findMany({
              where: { id: { in: Array.from(packageServiceIds) } },
              select: {
                id: true,
                name: true,
                price: true,
                parameter: { select: { id: true, name: true } },
                method: { select: { id: true, name: true } },
              },
            })
          : [];

      // Create a map for quick lookup
      const serviceMap = new Map(packageServices.map(s => [s.id, s]));

      return RepositoryResult.ok(
        details.map(d => {
          // Parse package services
          let packageServices: Array<{
            id: number;
            name: string;
            price: number;
            parameter?: { id: number; name: string };
            method?: { id: number; name: string };
          }> = [];

          if (d.Renamedpackage?.listService) {
            const serviceIds = d.Renamedpackage.listService
              .split(',')
              .map(id => parseInt(id.trim(), 10))
              .filter(id => !isNaN(id));

            packageServices = serviceIds
              .map(id => serviceMap.get(id))
              .filter((s): s is NonNullable<typeof s> => s !== undefined)
              .map(s => ({
                id: s.id,
                name: s.name,
                price: s.price,
                parameter: s.parameter ? { id: s.parameter.id, name: s.parameter.name } : undefined,
                method: s.method ? { id: s.method.id, name: s.method.name } : undefined,
              }));
          }

          return {
            id: d.id,
            sampleName: d.sample_name,
            quotationId: d.quotation_id,
            serviceId: d.service_id,
            sampleDescription: d.sample_description,
            volume: d.volume,
            priority: d.priority,
            quantity: d.quantity,
            percentDiscount: d.percent_discount,
            packageId: d.package_id,
            indexArray: d.index_array,
            indexSample: d.index_sample,
            price: d.price,
            product: d.product,
            serviceMatrix: d.service_matrix,
            service: d.service
              ? {
                  id: d.service.id,
                  code: d.service.code,
                  name: d.service.name,
                  price: d.service.price,
                  parameter: d.service.parameter
                    ? { id: d.service.parameter.id, name: d.service.parameter.name }
                    : undefined,
                  method: d.service.method
                    ? { id: d.service.method.id, name: d.service.method.name }
                    : undefined,
                }
              : undefined,
            package: d.Renamedpackage
              ? {
                  id: d.Renamedpackage.id,
                  code: d.Renamedpackage.code,
                  name: d.Renamedpackage.name,
                  totalPrice: d.Renamedpackage.totalPrice,
                  services: packageServices,
                }
              : undefined,
          };
        })
      );
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to get quotation details: ${error.message}`);
    }
  }

  async hasLinkedOrder(
    quotationId: number
  ): Promise<RepositoryResult<{ hasOrder: boolean; orderId?: number; orderCode?: string }>> {
    try {
      const order = await this.prisma.order.findFirst({
        where: {
          quotation_id: quotationId,
          trash: null,
        },
        select: { id: true, code: true },
      });

      return RepositoryResult.ok({
        hasOrder: !!order,
        orderId: order?.id,
        orderCode: order?.code || undefined,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check linked order: ${error.message}`);
    }
  }

  async hasLinkedPreOrder(
    quotationId: number
  ): Promise<RepositoryResult<{ hasPreOrder: boolean; preOrderId?: number; preOrderCode?: string }>> {
    try {
      const preOrder = await this.prisma.preOrder.findFirst({
        where: {
          quotation_id: quotationId,
          trash: null,
        },
        select: { id: true, code: true },
      });

      return RepositoryResult.ok({
        hasPreOrder: !!preOrder,
        preOrderId: preOrder?.id,
        preOrderCode: preOrder?.code,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check linked pre-order: ${error.message}`);
    }
  }
}
