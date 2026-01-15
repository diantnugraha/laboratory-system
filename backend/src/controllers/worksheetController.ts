import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { WorksheetRepository } from '../repositories/implementations/WorksheetRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const worksheetRepo = new WorksheetRepository(prisma);

/**
 * GET /api/worksheets/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await worksheetRepo.generateCode();

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: { code: result.getValue() } });
  } catch (error) {
    console.error('generateCode error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate code',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/worksheets - List with search & pagination
 */
export const getAllWorksheets = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const sampleId = req.query.sample_id ? parseId(req.query.sample_id as string) : undefined;
    const orderId = req.query.order_id ? parseId(req.query.order_id as string) : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const isSubcontract = req.query.is_subcontract === 'true' || req.query.is_subcontract === '1';

    // Get analyst type IDs for analyst role
    let userAnalystTypeIds: number[] | undefined;
    if (req.user?.role_id === 5) {
      const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(req.user.id);
      if (analystTypesResult.isSuccess()) {
        userAnalystTypeIds = analystTypesResult.getValue();
      }
    }

    const result = await worksheetRepo.findAll({
      search,
      sampleId: sampleId || undefined,
      orderId: orderId || undefined,
      status,
      isSubcontract: req.query.is_subcontract ? isSubcontract : undefined,
      page,
      limit,
      userRole: req.user?.role_id,
      userCustomerId: req.user?.customer_id ?? undefined,
      userAnalystTypeIds,
      analystId: req.user?.role_id === 5 ? req.user.id : undefined,
    });

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    const data = result.getValue();
    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
    };

    res.json(response);
  } catch (error) {
    console.error('getAll worksheets error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksheets',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/worksheets/:id
 */
export const getWorksheetById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    // Check analyst authorization
    if (req.user?.role_id === 5) {
      const authResult = await worksheetRepo.checkAnalystAuthorization(id, req.user.id);
      if (authResult.isSuccess() && !authResult.getValue().isAuthorized) {
        res.status(403).json({ success: false, message: authResult.getValue().reason });
        return;
      }
    }

    const result = await worksheetRepo.findById(id);

    if (result.isFailure()) {
      res.status(404).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getById worksheet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksheet',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/worksheets/json - For autocomplete/dropdown
 */
export const getWorksheetsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const sampleId = req.query.sample_id ? parseId(req.query.sample_id as string) : undefined;

    const result = await worksheetRepo.findForAutocomplete(search, sampleId || undefined);

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getWorksheetsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksheets',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/worksheets/datatables - DataTables format for legacy compatibility
 */
export const getWorksheetsDataTables = async (req: Request, res: Response): Promise<void> => {
  try {
    const sEcho = parseQueryParam(req.query.sEcho, 1);
    const iDisplayStart = parseQueryParam(req.query.iDisplayStart, 0);
    const iDisplayLength = parseQueryParam(req.query.iDisplayLength, 20);
    const sSearch = typeof req.query.sSearch === 'string' ? req.query.sSearch : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const isSubcontract = req.query.is_subcontract === 'true' || req.query.is_subcontract === '1';

    // Get analyst type IDs for analyst role
    let userAnalystTypeIds: number[] | undefined;
    if (req.user?.role_id === 5) {
      const analystTypesResult = await worksheetRepo.getUserAnalystTypeIds(req.user.id);
      if (analystTypesResult.isSuccess()) {
        userAnalystTypeIds = analystTypesResult.getValue();
      }
    }

    const result = await worksheetRepo.findForDataTables(
      {
        status,
        isSubcontract: req.query.is_subcontract ? isSubcontract : undefined,
        userRole: req.user?.role_id,
        userCustomerId: req.user?.customer_id ?? undefined,
        userAnalystTypeIds,
      },
      sEcho,
      iDisplayStart,
      iDisplayLength,
      sSearch
    );

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json(result.getValue());
  } catch (error) {
    console.error('getWorksheetsDataTables error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksheets',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/worksheets/by-sample/:sampleId - Get worksheets by sample
 */
export const getWorksheetsBySample = async (req: Request, res: Response): Promise<void> => {
  try {
    const sampleId = parseId(req.params.sampleId);
    if (!sampleId) {
      res.status(400).json({ success: false, message: 'Invalid Sample ID' });
      return;
    }

    const result = await worksheetRepo.findBySampleId(sampleId);

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getWorksheetsBySample error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch worksheets',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets
 */
export const createWorksheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const { sample_id, service_id, package_id, standart_id, discount, index_array } = req.body;

    // Generate code
    const codeResult = await worksheetRepo.generateCode();
    if (codeResult.isFailure()) {
      res.status(500).json({ success: false, message: codeResult.error });
      return;
    }

    const result = await worksheetRepo.create({
      code: codeResult.getValue(),
      sampleId: sample_id,
      serviceId: service_id,
      packageId: package_id,
      standartId: standart_id,
      discount,
      indexArray: index_array,
      createdBy: req.user!.id,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('create worksheet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create worksheet',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PATCH /api/worksheets/:id - Update worksheet result (Analyst action)
 */
export const updateWorksheetResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    // Check analyst authorization
    if (req.user?.role_id === 5) {
      const authResult = await worksheetRepo.checkAnalystAuthorization(id, req.user.id);
      if (authResult.isSuccess() && !authResult.getValue().isAuthorized) {
        res.status(403).json({ success: false, message: authResult.getValue().reason });
        return;
      }
    }

    // Check order status
    const orderCheckResult = await worksheetRepo.checkOrderStatusForUpdate(id);
    if (orderCheckResult.isSuccess() && !orderCheckResult.getValue().canUpdate) {
      res.status(400).json({ success: false, message: orderCheckResult.getValue().reason });
      return;
    }

    const { result, n_result, unit, remarks, document } = req.body;

    const updateResult = await worksheetRepo.updateResult(
      id,
      {
        result,
        nResult: n_result,
        unit,
        remarks,
        document,
        updatedBy: req.user!.id,
      },
      req.user!.id,
      req.user!.role_id
    );

    if (updateResult.isFailure()) {
      res.status(400).json({ success: false, message: updateResult.error });
      return;
    }

    res.json({ success: true, data: updateResult.getValue() });
  } catch (error) {
    console.error('update worksheet result error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update worksheet result',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets/:id/verify - QC verify worksheet
 */
export const verifyWorksheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { message } = req.body;

    const result = await worksheetRepo.verify(id, {
      verifiedBy: req.user!.id,
      message,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('verify worksheet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to verify worksheet',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets/:id/approve - TM approve worksheet
 */
export const approveWorksheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { message } = req.body;

    const result = await worksheetRepo.approve(id, {
      approvedBy: req.user!.id,
      message,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('approve worksheet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to approve worksheet',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets/:id/revision - QC request revision
 */
export const requestRevision = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { message } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required for revision request' });
      return;
    }

    const result = await worksheetRepo.requestRevision(id, {
      requestedBy: req.user!.id,
      message,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('request revision error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to request revision',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets/:id/internal-retest - QC request internal retest
 */
export const requestInternalRetest = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { message } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required for internal retest request' });
      return;
    }

    const result = await worksheetRepo.requestInternalRetest(id, {
      requestedBy: req.user!.id,
      message,
      isCustomerRetest: false,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('request internal retest error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to request internal retest',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets/:id/customer-retest - Request customer retest
 */
export const requestCustomerRetest = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { message } = req.body;

    if (!message) {
      res.status(400).json({ success: false, message: 'Message is required for customer retest request' });
      return;
    }

    const result = await worksheetRepo.requestCustomerRetest(id, {
      requestedBy: req.user!.id,
      message,
      isCustomerRetest: true,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('request customer retest error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to request customer retest',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets/quick-submit - Quick result submission
 */
export const quickSubmitResult = async (req: Request, res: Response): Promise<void> => {
  try {
    const { worksheet_id, result, unit, n_result } = req.body;

    // Check analyst authorization
    if (req.user?.role_id === 5) {
      const authResult = await worksheetRepo.checkAnalystAuthorization(worksheet_id, req.user.id);
      if (authResult.isSuccess() && !authResult.getValue().isAuthorized) {
        res.status(403).json({ success: false, message: authResult.getValue().reason });
        return;
      }
    }

    // Check order status
    const orderCheckResult = await worksheetRepo.checkOrderStatusForUpdate(worksheet_id);
    if (orderCheckResult.isSuccess() && !orderCheckResult.getValue().canUpdate) {
      res.status(400).json({ success: false, message: orderCheckResult.getValue().reason });
      return;
    }

    const submitResult = await worksheetRepo.quickSubmit(
      worksheet_id,
      result,
      unit,
      n_result,
      req.user!.id,
      req.user!.role_id
    );

    if (submitResult.isFailure()) {
      res.status(400).json({ success: false, message: submitResult.error });
      return;
    }

    res.json({ success: true, data: submitResult.getValue() });
  } catch (error) {
    console.error('quick submit result error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to submit result',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PATCH /api/worksheets/:id/subcontract - Update subcontract info
 */
export const updateSubcontract = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { air_way_bill, subcon_send_date, subcon_received_date, subcon_end_date } = req.body;

    const result = await worksheetRepo.updateSubcontract(id, {
      airWayBill: air_way_bill,
      subconSendDate: subcon_send_date ? new Date(subcon_send_date) : undefined,
      subconReceivedDate: subcon_received_date ? new Date(subcon_received_date) : undefined,
      subconEndDate: subcon_end_date ? new Date(subcon_end_date) : undefined,
      updatedBy: req.user!.id,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('update subcontract error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update subcontract info',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/worksheets/:id/cancel - Cancel worksheet
 */
export const cancelWorksheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { reason } = req.body;

    const result = await worksheetRepo.cancel(id, req.user!.id, reason);

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('cancel worksheet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to cancel worksheet',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * DELETE /api/worksheets/:id
 */
export const deleteWorksheet = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const result = await worksheetRepo.delete(id, req.user!.id);

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: 'Worksheet deleted successfully' });
  } catch (error) {
    console.error('delete worksheet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete worksheet',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};
