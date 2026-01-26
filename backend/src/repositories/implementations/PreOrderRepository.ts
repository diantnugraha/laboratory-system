import { PrismaClient, Prisma } from '@prisma/client';
import {
  IPreOrderRepository,
  PreOrderFilter,
  CreatePreOrderDTO,
  UpdatePreOrderDTO,
  PreOrderWithRelations,
  PreSampleWithRelations,
  PreSampleInput,
  OutstandingInfo,
  CanCreateOrderInfo,
  PreOrderAutocompleteItem,
  LabType,
} from '../contracts/IPreOrderRepository.js';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult.js';
import {
  PREORDER_CONFIG,
  PREORDER_CODE_PREFIX,
  PRESAMPLE_CODE_PREFIX,
} from '../../config/preOrder.js';

/**
 * PreOrder Repository Implementation
 * Concrete implementation of pre-order data access operations
 */
export class PreOrderRepository implements IPreOrderRepository {
  constructor(private prisma: PrismaClient) {}

  /**
   * Standard include for pre-order queries
   */
  private readonly standardInclude = {
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
        surname: true,
        email: true,
        phone: true,
        department: true,
      },
    },
    driver: {
      select: {
        id: true,
        name: true,
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
    _count: {
      select: {
        pre_sample: true,
        orders: true,
      },
    },
  };

  /**
   * Get all pre-orders with pagination and filters
   */
  async findAll(filter: PreOrderFilter): Promise<RepositoryResult<PaginatedData<PreOrderWithRelations>>> {
    try {
      const { page = 1, limit = 20 } = filter;
      const skip = (page - 1) * limit;

      const where: any = { trash: null };

      // Filter by code (contains search)
      if (filter.qCode) {
        where.code = { contains: filter.qCode };
      }

      // Filter by customer
      if (filter.customerId) {
        where.customer_id = filter.customerId;
      }

      // Filter by creator - using created_by field (no relation)
      // Note: Creator filter by name would require joining User table
      // For now, we skip this filter as PreOrder doesn't have a creator relation

      // Filter by order status
      if (filter.orderId === 'null') {
        where.OR = [
          { order_id: null },
          { order_id: 0 },
        ];
      } else if (filter.orderId === 'notnull') {
        where.order_id = { not: null, gt: 0 };
      } else if (typeof filter.orderId === 'number') {
        where.order_id = filter.orderId;
      }

      // Filter by priority
      if (filter.priority) {
        where.priority = filter.priority;
      }

      // Filter by received date range
      if (filter.receivedDateStart || filter.receivedDateEnd) {
        where.received_date = {};
        if (filter.receivedDateStart) {
          where.received_date.gte = filter.receivedDateStart;
        }
        if (filter.receivedDateEnd) {
          where.received_date.lte = filter.receivedDateEnd;
        }
      }

      // Filter by characteristic
      if (filter.characteristic) {
        where.characteristic = filter.characteristic;
      }

      // Filter by complete date status
      if (filter.completeDateStatus === 'null') {
        where.complete_date = null;
      } else if (filter.completeDateStatus === 'notnull') {
        where.complete_date = { not: null };
      }

      // Filter by lab type
      if (filter.lab) {
        where.lab = filter.lab;
      }

      // Customer role filter - only see own pre-orders
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.customer_id = filter.userCustomerId;
      }

      // Build orderBy
      let orderBy: any = { id: 'desc' };
      if (filter.orderBy) {
        const [field, direction] = filter.orderBy.split(' ');
        const allowedFields = ['id', 'code', 'received_date', 'created_at', 'complete_date'];
        if (allowedFields.includes(field)) {
          orderBy = { [field]: direction?.toLowerCase() === 'asc' ? 'asc' : 'desc' };
        }
      }

      const [data, total] = await Promise.all([
        this.prisma.preOrder.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: this.standardInclude,
        }),
        this.prisma.preOrder.count({ where }),
      ]);

      return RepositoryResult.ok({
        data: this.mapPreOrdersToResponse(data),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch pre-orders: ${error.message}`);
    }
  }

  /**
   * Get pre-order by ID with all relations
   */
  async findById(id: number): Promise<RepositoryResult<PreOrderWithRelations | null>> {
    try {
      const preOrder = await this.prisma.preOrder.findFirst({
        where: { id, trash: null },
        include: {
          ...this.standardInclude,
          pre_sample: {
            where: { trash: null },
            orderBy: { index_sample: 'asc' },
            include: {
              standart: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!preOrder) {
        return RepositoryResult.fail('Pre-order not found');
      }

      return RepositoryResult.ok(this.mapPreOrderToResponse(preOrder));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch pre-order: ${error.message}`);
    }
  }

  /**
   * Get pre-order by code
   */
  async findByCode(code: string, excludeId?: number): Promise<RepositoryResult<PreOrderWithRelations | null>> {
    try {
      const where: any = {
        trash: null,
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      // Fetch all matching pre-orders and filter in memory for case-insensitive match
      const preOrders = await this.prisma.preOrder.findMany({
        where,
        include: this.standardInclude,
      });

      const preOrder = preOrders.find(
        (p) => p.code.toLowerCase() === code.toLowerCase()
      );

      if (!preOrder) {
        return RepositoryResult.ok(null);
      }

      return RepositoryResult.ok(this.mapPreOrderToResponse(preOrder));
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch pre-order by code: ${error.message}`);
    }
  }

  /**
   * Get pre-orders for autocomplete/dropdown
   */
  async findForAutocomplete(search?: string, customerId?: number): Promise<RepositoryResult<PreOrderAutocompleteItem[]>> {
    try {
      const where: any = { trash: null };

      if (search) {
        where.code = { contains: search };
      }

      if (customerId) {
        where.customer_id = customerId;
      }

      const preOrders = await this.prisma.preOrder.findMany({
        where,
        take: 20,
        orderBy: { id: 'desc' },
        select: {
          id: true,
          code: true,
          received_date: true,
          sample_quantity: true,
          order_id: true,
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
              surname: true,
            },
          },
        },
      });

      const result: PreOrderAutocompleteItem[] = preOrders.map((p) => ({
        id: p.id,
        code: p.code,
        receivedDate: p.received_date,
        sampleQuantity: p.sample_quantity,
        customer: {
          id: p.customer.id,
          name: p.customer.customer_name,
        },
        contact: {
          id: p.contact.id,
          name: `${p.contact.first_name} ${p.contact.surname}`.trim(),
        },
        hasOrder: p.order_id !== null && p.order_id > 0,
      }));

      return RepositoryResult.ok(result);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch pre-orders for autocomplete: ${error.message}`);
    }
  }

  /**
   * Get pre-orders in DataTables format
   */
  async findForDataTables(
    filter: PreOrderFilter,
    sEcho: number,
    iDisplayStart: number,
    iDisplayLength: number,
    sSearch?: string
  ): Promise<RepositoryResult<any>> {
    try {
      const where: any = { trash: null };

      // Apply search
      if (sSearch) {
        where.OR = [
          { code: { contains: sSearch } },
          { customer: { customer_name: { contains: sSearch } } },
        ];
      }

      // Apply lab filter
      if (filter.lab) {
        where.lab = filter.lab;
      }

      // Customer role filter
      if (filter.userRole === 8 && filter.userCustomerId) {
        where.customer_id = filter.userCustomerId;
      }

      const [data, total] = await Promise.all([
        this.prisma.preOrder.findMany({
          where,
          skip: iDisplayStart,
          take: Math.min(iDisplayLength, PREORDER_CONFIG.DATATABLE_MAX_LIMIT),
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
                surname: true,
              },
            },
          },
        }),
        this.prisma.preOrder.count({ where }),
      ]);

      return RepositoryResult.ok({
        sEcho,
        iTotalRecords: total,
        iTotalDisplayRecords: total,
        aaData: data.map((p) => ({
          id: p.id,
          code: p.code,
          customer_name: p.customer.customer_name,
          contact_name: `${p.contact.first_name} ${p.contact.surname}`.trim(),
          received_date: p.received_date,
          sample_quantity: p.sample_quantity,
          priority: p.priority,
          complete_date: p.complete_date,
          order_id: p.order_id,
        })),
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch pre-orders for DataTables: ${error.message}`);
    }
  }

  /**
   * Get all samples for a pre-order
   */
  async getSamples(preOrderId: number): Promise<RepositoryResult<PreSampleWithRelations[]>> {
    try {
      const samples = await this.prisma.pre_sample.findMany({
        where: {
          pre_order_id: preOrderId,
          trash: null,
        },
        orderBy: { index_sample: 'asc' },
        include: {
          standart: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(
        samples.map((s) => ({
          id: s.id,
          preOrderId: s.pre_order_id,
          standartId: s.standart_id,
          code: s.code,
          name: s.name,
          description: s.description,
          volume: s.volume,
          sampleStorage: s.sample_storage,
          priority: s.priority,
          customFields: s.custom_fields,
          indexSample: s.index_sample,
          indexArray: s.index_array,
          createdAt: s.created_at,
          updatedAt: s.updated_at,
          standart: s.standart
            ? {
                id: s.standart.id,
                code: s.standart.code,
                name: s.standart.name,
              }
            : null,
        }))
      );
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch samples: ${error.message}`);
    }
  }

  /**
   * Create new pre-order with samples
   */
  async create(data: CreatePreOrderDTO): Promise<RepositoryResult<PreOrderWithRelations>> {
    try {
      const preOrder = await this.prisma.$transaction(async (tx) => {
        // Generate code
        const code = await this.generateCodeInternal(tx, data.lab);

        // Check document completeness
        const isDocumentComplete = !!(
          data.document &&
          data.coveringLetter &&
          data.testingParameters
        );

        // Create pre-order
        const created = await tx.preOrder.create({
          data: {
            code,
            customer_id: data.customerId,
            contact_id: data.contactId,
            quotation_id: data.quotationId ?? null,
            received_date: data.receivedDate ?? null,
            delivery: data.delivery ?? null,
            receipt_number: data.receiptNumber ?? null,
            driver_id: data.driverId ?? null,
            submited_by: data.submitedBy,
            sample_quantity: data.sampleQuantity ?? 1,
            priority: data.priority ?? null,
            document: data.document ?? null,
            covering_letter: data.coveringLetter ?? null,
            testing_parameters: data.testingParameters ?? null,
            complete_date: isDocumentComplete ? new Date() : null,
            order_id: isDocumentComplete ? 0 : null,
            remarks: data.remarks ?? null,
            characteristic: data.characteristic ?? null,
            lab: data.lab,
            subcon: data.subcon ?? null,
            subcon_id: data.subconId ?? null,
            subcon_due: data.subconDue ?? null,
            notes_customer: data.notesCustomer ?? null,
            created_by: data.createdBy,
            created_at: new Date(),
          },
        });

        // Create samples if provided
        if (data.samples && data.samples.length > 0) {
          for (let i = 0; i < data.samples.length; i++) {
            const sample = data.samples[i];
            const sampleCode = sample.code || (await this.generateSampleCodeInternal(tx));

            await tx.pre_sample.create({
              data: {
                pre_order_id: created.id,
                standart_id: sample.standartId ?? null,
                code: sampleCode,
                name: sample.name,
                description: sample.description ?? null,
                volume: sample.volume ?? null,
                sample_storage: sample.sampleStorage ?? null,
                priority: sample.priority ?? null,
                custom_fields: sample.customFields ?? null,
                index_sample: sample.indexSample ?? i,
                index_array: sample.indexArray ?? 0,
                created_at: new Date(),
                created_by: data.createdBy,
              },
            });
          }
        }

        return created;
      });

      // Fetch complete data with relations
      const result = await this.findById(preOrder.id);
      if (result.isFailure()) {
        return RepositoryResult.fail(result.error || 'Failed to fetch created pre-order');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return RepositoryResult.fail('Pre-order code already exists');
      }
      return RepositoryResult.fail(`Failed to create pre-order: ${error.message}`);
    }
  }

  /**
   * Create pre-order from existing quotation
   */
  async createFromQuotation(
    quotationId: number,
    data: Partial<CreatePreOrderDTO>
  ): Promise<RepositoryResult<PreOrderWithRelations>> {
    try {
      // Fetch quotation with details
      const quotation = await this.prisma.quotation.findFirst({
        where: { id: quotationId, trash: null },
        include: {
          quotation_detail: {
            orderBy: { index_sample: 'asc' },
          },
        },
      });

      if (!quotation) {
        return RepositoryResult.fail('Quotation not found');
      }

      // Check if quotation already has a pre-order
      const existingPreOrder = await this.prisma.preOrder.findFirst({
        where: { quotation_id: quotationId, trash: null },
      });

      if (existingPreOrder) {
        return RepositoryResult.fail('Quotation already has a pre-order');
      }

      // Validate required quotation fields
      if (!quotation.customer_id) {
        return RepositoryResult.fail('Quotation has no customer');
      }
      if (!quotation.contact_id) {
        return RepositoryResult.fail('Quotation has no contact');
      }

      // Build samples from quotation details
      const sampleMap = new Map<number, PreSampleInput>();
      for (const detail of quotation.quotation_detail) {
        const indexSample = detail.index_sample ?? 0;
        if (!sampleMap.has(indexSample)) {
          sampleMap.set(indexSample, {
            name: detail.sample_name || `Sample ${indexSample + 1}`,
            description: detail.sample_description ?? null,
            volume: detail.volume ?? null,
            priority: detail.priority ?? null,
            indexSample,
            indexArray: 0,
          });
        }
      }

      const samples = Array.from(sampleMap.values());

      // Parse lab from quotation (it's a string in Quotation but number in PreOrder)
      const labValue = quotation.lab ? parseInt(quotation.lab, 10) : 1;

      // Create pre-order with quotation data
      const createData: CreatePreOrderDTO = {
        customerId: quotation.customer_id,
        contactId: quotation.contact_id,
        quotationId: quotation.id,
        receivedDate: data.receivedDate ?? null,
        delivery: data.delivery ?? null,
        receiptNumber: data.receiptNumber ?? null,
        driverId: data.driverId ?? null,
        submitedBy: data.submitedBy || 'System',
        sampleQuantity: samples.length || 1,
        priority: data.priority ?? quotation.priority ?? null,
        document: data.document ?? null,
        coveringLetter: data.coveringLetter ?? null,
        testingParameters: data.testingParameters ?? null,
        remarks: data.remarks ?? quotation.remarks ?? null,
        characteristic: data.characteristic ?? null,
        lab: labValue,
        subcon: data.subcon ?? null,
        subconId: data.subconId ?? null,
        subconDue: data.subconDue ?? null,
        notesCustomer: data.notesCustomer ?? null,
        createdBy: data.createdBy!,
        samples,
      };

      return this.create(createData);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create pre-order from quotation: ${error.message}`);
    }
  }

  /**
   * Update existing pre-order with samples
   */
  async update(id: number, data: UpdatePreOrderDTO): Promise<RepositoryResult<PreOrderWithRelations>> {
    try {
      // Fetch existing pre-order
      const existing = await this.prisma.preOrder.findFirst({
        where: { id, trash: null },
      });

      if (!existing) {
        return RepositoryResult.fail('Pre-order not found');
      }

      await this.prisma.$transaction(async (tx) => {
        // Build update data
        const updateData: any = {
          updated_by: data.updatedBy,
          updated_at: new Date(),
        };

        if (data.customerId !== undefined) updateData.customer_id = data.customerId;
        if (data.contactId !== undefined) updateData.contact_id = data.contactId;
        if (data.quotationId !== undefined) updateData.quotation_id = data.quotationId;
        if (data.receivedDate !== undefined) updateData.received_date = data.receivedDate;
        if (data.delivery !== undefined) updateData.delivery = data.delivery;
        if (data.receiptNumber !== undefined) updateData.receipt_number = data.receiptNumber;
        if (data.driverId !== undefined) updateData.driver_id = data.driverId;
        if (data.submitedBy !== undefined) updateData.submited_by = data.submitedBy;
        if (data.sampleQuantity !== undefined) updateData.sample_quantity = data.sampleQuantity;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.document !== undefined) updateData.document = data.document;
        if (data.coveringLetter !== undefined) updateData.covering_letter = data.coveringLetter;
        if (data.testingParameters !== undefined) updateData.testing_parameters = data.testingParameters;
        if (data.remarks !== undefined) updateData.remarks = data.remarks;
        if (data.characteristic !== undefined) updateData.characteristic = data.characteristic;
        if (data.lab !== undefined) updateData.lab = data.lab;
        if (data.subcon !== undefined) updateData.subcon = data.subcon;
        if (data.subconId !== undefined) updateData.subcon_id = data.subconId;
        if (data.subconDue !== undefined) updateData.subcon_due = data.subconDue;
        if (data.notesCustomer !== undefined) updateData.notes_customer = data.notesCustomer;

        // Check if this update completes the documents
        const doc = data.document !== undefined ? data.document : existing.document;
        const cover = data.coveringLetter !== undefined ? data.coveringLetter : existing.covering_letter;
        const params = data.testingParameters !== undefined ? data.testingParameters : existing.testing_parameters;
        const willBeComplete = !!(doc && cover && params);

        if (willBeComplete && !existing.complete_date) {
          updateData.complete_date = new Date();
          updateData.order_id = 0;
        } else if (!willBeComplete && existing.complete_date) {
          updateData.complete_date = null;
          // Keep order_id if order was already created
          if (existing.order_id === 0) {
            updateData.order_id = null;
          }
        }

        // Update pre-order
        await tx.preOrder.update({
          where: { id },
          data: updateData,
        });

        // Update samples if provided
        if (data.samples !== undefined) {
          // Get existing sample IDs
          const existingSamples = await tx.pre_sample.findMany({
            where: { pre_order_id: id, trash: null },
            select: { id: true },
          });
          const existingSampleIds = new Set(existingSamples.map((s) => s.id));

          // Track which IDs are being updated
          const updatedIds = new Set<number>();

          for (let i = 0; i < data.samples.length; i++) {
            const sample = data.samples[i];

            if (sample.id && existingSampleIds.has(sample.id)) {
              // Update existing sample
              updatedIds.add(sample.id);
              await tx.pre_sample.update({
                where: { id: sample.id },
                data: {
                  standart_id: sample.standartId ?? null,
                  name: sample.name,
                  description: sample.description ?? null,
                  volume: sample.volume ?? null,
                  sample_storage: sample.sampleStorage ?? null,
                  priority: sample.priority ?? null,
                  custom_fields: sample.customFields ?? null,
                  index_sample: sample.indexSample ?? i,
                  index_array: sample.indexArray ?? 0,
                  updated_at: new Date(),
                  updated_by: data.updatedBy,
                },
              });
            } else {
              // Create new sample
              const sampleCode = sample.code || (await this.generateSampleCodeInternal(tx));
              await tx.pre_sample.create({
                data: {
                  pre_order_id: id,
                  standart_id: sample.standartId ?? null,
                  code: sampleCode,
                  name: sample.name,
                  description: sample.description ?? null,
                  volume: sample.volume ?? null,
                  sample_storage: sample.sampleStorage ?? null,
                  priority: sample.priority ?? null,
                  custom_fields: sample.customFields ?? null,
                  index_sample: sample.indexSample ?? i,
                  index_array: sample.indexArray ?? 0,
                  created_at: new Date(),
                  created_by: data.updatedBy,
                },
              });
            }
          }

          // Soft delete samples that were removed
          const idsToDelete = [...existingSampleIds].filter((id) => !updatedIds.has(id));
          if (idsToDelete.length > 0) {
            await tx.pre_sample.updateMany({
              where: { id: { in: idsToDelete } },
              data: {
                trash: 1,
                updated_at: new Date(),
                updated_by: data.updatedBy,
              },
            });
          }
        }
      });

      // Fetch updated data
      const result = await this.findById(id);
      if (result.isFailure()) {
        return RepositoryResult.fail(result.error || 'Failed to fetch updated pre-order');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update pre-order: ${error.message}`);
    }
  }

  /**
   * Soft delete pre-order and its samples
   */
  async delete(id: number, userId: number): Promise<RepositoryResult<boolean>> {
    try {
      const preOrder = await this.prisma.preOrder.findFirst({
        where: { id, trash: null },
      });

      if (!preOrder) {
        return RepositoryResult.fail('Pre-order not found');
      }

      // Check if has linked orders
      if (preOrder.order_id && preOrder.order_id > 0) {
        return RepositoryResult.fail('Cannot delete pre-order that has linked orders');
      }

      await this.prisma.$transaction(async (tx) => {
        // Soft delete pre-order
        await tx.preOrder.update({
          where: { id },
          data: {
            trash: 1,
            updated_by: userId,
            updated_at: new Date(),
          },
        });

        // Soft delete all samples
        await tx.pre_sample.updateMany({
          where: { pre_order_id: id },
          data: {
            trash: 1,
            updated_by: userId,
            updated_at: new Date(),
          },
        });
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to delete pre-order: ${error.message}`);
    }
  }

  /**
   * Generate next pre-order code
   */
  async generateCode(labType?: number): Promise<RepositoryResult<string>> {
    try {
      const code = await this.prisma.$transaction(async (tx) => {
        return this.generateCodeInternal(tx, labType ?? LabType.STANDARD);
      });

      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate code: ${error.message}`);
    }
  }

  /**
   * Generate next pre-sample code
   */
  async generateSampleCode(): Promise<RepositoryResult<string>> {
    try {
      const code = await this.prisma.$transaction(async (tx) => {
        return this.generateSampleCodeInternal(tx);
      });

      return RepositoryResult.ok(code);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to generate sample code: ${error.message}`);
    }
  }

  /**
   * Internal code generation with transaction
   */
  private async generateCodeInternal(tx: Prisma.TransactionClient, labType: number): Promise<string> {
    const now = new Date();
    const yearMonth = now.toISOString().slice(2, 4) + (now.getMonth() + 1).toString().padStart(2, '0');

    const isEnvironmental = labType === LabType.ENVIRONMENTAL;
    const prefix = isEnvironmental ? PREORDER_CODE_PREFIX.ENVIRONMENTAL : PREORDER_CODE_PREFIX.STANDARD;
    const fullPrefix = `${prefix}${yearMonth}`;

    // Use FOR UPDATE to prevent race conditions
    const result = await tx.$queryRaw<[{ max_code: string | null }]>`
      SELECT MAX(code) as max_code
      FROM pre_order
      WHERE code LIKE ${fullPrefix + '%'} AND trash IS NULL
      FOR UPDATE
    `;

    let nextNumber = 1;
    const maxCode = result[0]?.max_code;

    if (maxCode) {
      const sequencePart = maxCode.substring(fullPrefix.length);
      const lastNumber = parseInt(sequencePart, 10);
      if (!isNaN(lastNumber)) {
        nextNumber = lastNumber + 1;
      }
    }

    return `${fullPrefix}${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Internal sample code generation with transaction
   */
  private async generateSampleCodeInternal(tx: Prisma.TransactionClient): Promise<string> {
    const result = await tx.$queryRaw<[{ max_code: string | null }]>`
      SELECT MAX(code) as max_code
      FROM pre_sample
      WHERE code LIKE ${PRESAMPLE_CODE_PREFIX + '%'} AND trash IS NULL
      FOR UPDATE
    `;

    let nextNumber = 1;
    const maxCode = result[0]?.max_code;

    if (maxCode) {
      const match = maxCode.match(/PSC\.(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    return `${PRESAMPLE_CODE_PREFIX}${String(nextNumber).padStart(5, '0')}`;
  }

  /**
   * Check if pre-order documents are complete
   */
  async checkDocumentComplete(id: number): Promise<RepositoryResult<boolean>> {
    try {
      const preOrder = await this.prisma.preOrder.findFirst({
        where: { id, trash: null },
        select: {
          document: true,
          covering_letter: true,
          testing_parameters: true,
        },
      });

      if (!preOrder) {
        return RepositoryResult.fail('Pre-order not found');
      }

      const isComplete = !!(
        preOrder.document &&
        preOrder.covering_letter &&
        preOrder.testing_parameters
      );

      return RepositoryResult.ok(isComplete);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check document completeness: ${error.message}`);
    }
  }

  /**
   * Check outstanding invoices for customer
   */
  async checkOutstanding(customerId: number): Promise<RepositoryResult<OutstandingInfo>> {
    try {
      // Get customer to check if whitelist
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, trash: null },
        select: {
          id: true,
          special_customer: true,
          top: true,
        },
      });

      if (!customer) {
        return RepositoryResult.fail('Customer not found');
      }

      const isWhitelist = customer.special_customer === 1;

      // Calculate threshold based on customer type
      const threshold = isWhitelist
        ? (customer.top || 30) + PREORDER_CONFIG.WHITELIST_EXTRA_DAYS
        : PREORDER_CONFIG.STANDARD_OUTSTANDING_DAYS;

      // Calculate outstanding amount from unpaid invoices
      const result = await this.prisma.$queryRaw<[{ total: number | bigint | null }]>`
        SELECT COALESCE(SUM(sub_total), 0) as total
        FROM invoice
        WHERE trash IS NULL
          AND code IS NOT NULL
          AND status != 'PAID'
          AND customer_id = ${customerId}
          AND DATEDIFF(NOW(), invoice_send_date) >= ${threshold}
      `;

      const outstandingAmount = Number(result[0]?.total || 0);

      return RepositoryResult.ok({
        hasOutstanding: outstandingAmount > 0,
        amount: outstandingAmount,
        daysPastDue: threshold,
        isWhitelist,
        threshold,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check outstanding: ${error.message}`);
    }
  }

  /**
   * Check if pre-order can create an order
   */
  async canCreateOrder(id: number): Promise<RepositoryResult<CanCreateOrderInfo>> {
    try {
      const preOrder = await this.prisma.preOrder.findFirst({
        where: { id, trash: null },
        include: {
          customer: {
            select: {
              id: true,
              special_customer: true,
              top: true,
            },
          },
        },
      });

      if (!preOrder) {
        return RepositoryResult.fail('Pre-order not found');
      }

      const reasons: string[] = [];

      // Check document completeness
      const isDocumentComplete = !!(
        preOrder.document &&
        preOrder.covering_letter &&
        preOrder.testing_parameters
      );
      if (!isDocumentComplete) {
        reasons.push('Documents incomplete (document, covering letter, or testing parameters missing)');
      }

      // Check if already has order
      const hasOrder = preOrder.order_id !== null && preOrder.order_id > 0;
      if (hasOrder) {
        reasons.push('Pre-order already has an associated order');
      }

      // Check outstanding (unless unlocked)
      const isUnlocked = preOrder.unlock === 1;
      let hasOutstanding = false;
      let outstandingAmount = 0;

      if (!isUnlocked && preOrder.customer) {
        const outstandingResult = await this.checkOutstanding(preOrder.customer.id);
        if (outstandingResult.isSuccess()) {
          const outstandingInfo = outstandingResult.getValue();
          hasOutstanding = outstandingInfo.hasOutstanding;
          outstandingAmount = outstandingInfo.amount;
          if (hasOutstanding) {
            reasons.push(`Customer has outstanding invoices: ${outstandingAmount.toLocaleString()}`);
          }
        }
      }

      const canCreate = isDocumentComplete && !hasOrder && (!hasOutstanding || isUnlocked);

      return RepositoryResult.ok({
        canCreate,
        isDocumentComplete,
        hasOrder,
        hasOutstanding,
        isUnlocked,
        outstandingAmount,
        reasons,
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to check create order eligibility: ${error.message}`);
    }
  }

  /**
   * Unlock pre-order to bypass outstanding check
   */
  async unlock(id: number, userId: number): Promise<RepositoryResult<PreOrderWithRelations>> {
    try {
      const preOrder = await this.prisma.preOrder.findFirst({
        where: { id, trash: null },
      });

      if (!preOrder) {
        return RepositoryResult.fail('Pre-order not found');
      }

      await this.prisma.preOrder.update({
        where: { id },
        data: {
          unlock: 1,
          updated_by: userId,
          updated_at: new Date(),
        },
      });

      const result = await this.findById(id);
      if (result.isFailure()) {
        return RepositoryResult.fail(result.error || 'Failed to fetch unlocked pre-order');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to unlock pre-order: ${error.message}`);
    }
  }

  /**
   * Mark pre-order as complete when all documents are filled
   */
  async markComplete(id: number, userId: number): Promise<RepositoryResult<PreOrderWithRelations>> {
    try {
      const preOrder = await this.prisma.preOrder.findFirst({
        where: { id, trash: null },
      });

      if (!preOrder) {
        return RepositoryResult.fail('Pre-order not found');
      }

      // Check if documents are complete
      if (!preOrder.document || !preOrder.covering_letter || !preOrder.testing_parameters) {
        return RepositoryResult.fail('Documents are not complete');
      }

      // Check if already complete
      if (preOrder.complete_date) {
        return RepositoryResult.fail('Pre-order is already marked as complete');
      }

      await this.prisma.preOrder.update({
        where: { id },
        data: {
          complete_date: new Date(),
          order_id: 0,
          updated_by: userId,
          updated_at: new Date(),
        },
      });

      const result = await this.findById(id);
      if (result.isFailure()) {
        return RepositoryResult.fail(result.error || 'Failed to fetch marked complete pre-order');
      }

      return RepositoryResult.ok(result.getValue()!);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to mark pre-order as complete: ${error.message}`);
    }
  }

  /**
   * Map database result to response format
   */
  private mapPreOrderToResponse(preOrder: any): PreOrderWithRelations {
    return {
      id: preOrder.id,
      code: preOrder.code,
      customerId: preOrder.customer_id,
      quotationId: preOrder.quotation_id,
      contactId: preOrder.contact_id,
      receivedDate: preOrder.received_date,
      delivery: preOrder.delivery,
      receiptNumber: preOrder.receipt_number,
      driverId: preOrder.driver_id,
      orderId: preOrder.order_id,
      submitedBy: preOrder.submited_by,
      sampleQuantity: preOrder.sample_quantity,
      priority: preOrder.priority,
      document: preOrder.document,
      coveringLetter: preOrder.covering_letter,
      testingParameters: preOrder.testing_parameters,
      completeDate: preOrder.complete_date,
      remarks: preOrder.remarks,
      unlock: preOrder.unlock,
      characteristic: preOrder.characteristic,
      lab: preOrder.lab,
      subcon: preOrder.subcon,
      subconId: preOrder.subcon_id,
      subconDue: preOrder.subcon_due,
      notesCustomer: preOrder.notes_customer,
      createdAt: preOrder.created_at,
      updatedAt: preOrder.updated_at,
      createdBy: preOrder.created_by,
      updatedBy: preOrder.updated_by,
      trash: preOrder.trash,
      customer: preOrder.customer,
      contact: preOrder.contact,
      quotation: preOrder.quotation,
      driver: preOrder.driver,
      orders: preOrder.orders,
      pre_sample: preOrder.pre_sample?.map((s: any) => ({
        id: s.id,
        preOrderId: s.pre_order_id,
        standartId: s.standart_id,
        code: s.code,
        name: s.name,
        description: s.description,
        volume: s.volume,
        sampleStorage: s.sample_storage,
        priority: s.priority,
        customFields: s.custom_fields,
        indexSample: s.index_sample,
        indexArray: s.index_array,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        standart: s.standart,
      })),
      creator: preOrder.creator,
      _count: preOrder._count,
    };
  }

  /**
   * Map multiple database results to response format
   */
  private mapPreOrdersToResponse(preOrders: any[]): PreOrderWithRelations[] {
    return preOrders.map((p) => this.mapPreOrderToResponse(p));
  }
}
