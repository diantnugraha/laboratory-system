import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { SampleRepository } from '../repositories/implementations/SampleRepository';
import { parseId, parseQueryParam, ApiResponse } from '../types';

// Initialize repository
const sampleRepo = new SampleRepository(prisma);

/**
 * GET /api/samples/generate-code - Get next auto-generated code
 */
export const getGeneratedCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await sampleRepo.generateCode();

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
 * GET /api/samples - List with search & pagination
 */
export const getAllSamples = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const orderId = req.query.order_id ? parseId(req.query.order_id as string) : undefined;
    const customerId = req.query.customer_id ? parseId(req.query.customer_id as string) : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;

    const result = await sampleRepo.findAll({
      search,
      orderId: orderId || undefined,
      customerId: customerId || undefined,
      status,
      page,
      limit,
      userRole: req.user?.role_id,
      userCustomerId: req.user?.customer_id ?? undefined,
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
    console.error('getAll samples error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch samples',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/samples/:id
 */
export const getSampleById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const result = await sampleRepo.findById(id);

    if (result.isFailure()) {
      res.status(404).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getById sample error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sample',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/samples/json - For autocomplete/dropdown
 */
export const getSamplesJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const search = typeof req.query.q === 'string' ? req.query.q : undefined;
    const orderId = req.query.order_id ? parseId(req.query.order_id as string) : undefined;

    const result = await sampleRepo.findForAutocomplete(search, orderId || undefined);

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getSamplesJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch samples',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * GET /api/samples/by-order/:orderId - Get samples by order
 */
export const getSamplesByOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderId = parseId(req.params.orderId);
    if (!orderId) {
      res.status(400).json({ success: false, message: 'Invalid Order ID' });
      return;
    }

    const result = await sampleRepo.findByOrderId(orderId);

    if (result.isFailure()) {
      res.status(500).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getSamplesByOrder error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch samples',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * POST /api/samples
 */
export const createSample = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      order_id,
      standart_id,
      name,
      description,
      sample_type,
      sample_condition,
      sampling_date,
      received_date,
      quantity,
      unit,
      status,
      due_date,
      coa_release_due_date,
    } = req.body;

    // Generate code
    const codeResult = await sampleRepo.generateCode();
    if (codeResult.isFailure()) {
      res.status(500).json({ success: false, message: codeResult.error });
      return;
    }

    const result = await sampleRepo.create({
      code: codeResult.getValue(),
      orderId: order_id,
      standartId: standart_id,
      name,
      description,
      sampleType: sample_type,
      sampleCondition: sample_condition,
      samplingDate: sampling_date ? new Date(sampling_date) : null,
      receivedDate: received_date ? new Date(received_date) : null,
      quantity,
      unit,
      status: status || 'Process',
      dueDate: due_date ? new Date(due_date) : null,
      coaReleaseDueDate: coa_release_due_date ? new Date(coa_release_due_date) : null,
      createdBy: req.user!.id,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('create sample error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create sample',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PUT /api/samples/:id
 */
export const updateSample = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    // Check if sample exists
    const existingResult = await sampleRepo.findById(id);
    if (existingResult.isFailure()) {
      res.status(404).json({ success: false, message: existingResult.error });
      return;
    }

    const {
      standart_id,
      name,
      description,
      sample_type,
      sample_condition,
      sampling_date,
      received_date,
      quantity,
      unit,
      status,
      due_date,
      coa_release_due_date,
      analysis_finished_date,
      lead_time,
    } = req.body;

    const result = await sampleRepo.update(id, {
      standartId: standart_id,
      name,
      description,
      sampleType: sample_type,
      sampleCondition: sample_condition,
      samplingDate: sampling_date !== undefined ? (sampling_date ? new Date(sampling_date) : null) : undefined,
      receivedDate: received_date !== undefined ? (received_date ? new Date(received_date) : null) : undefined,
      quantity,
      unit,
      status,
      dueDate: due_date !== undefined ? (due_date ? new Date(due_date) : null) : undefined,
      coaReleaseDueDate: coa_release_due_date !== undefined ? (coa_release_due_date ? new Date(coa_release_due_date) : null) : undefined,
      analysisFinishedDate: analysis_finished_date !== undefined ? (analysis_finished_date ? new Date(analysis_finished_date) : null) : undefined,
      leadTime: lead_time,
      updatedBy: req.user!.id,
    });

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('update sample error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update sample',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * PATCH /api/samples/:id/status - Update sample status
 */
export const updateSampleStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { status } = req.body;

    const result = await sampleRepo.updateStatus(id, status, req.user!.id);

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('updateSampleStatus error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update sample status',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};

/**
 * DELETE /api/samples/:id
 */
export const deleteSample = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const result = await sampleRepo.delete(id, req.user!.id);

    if (result.isFailure()) {
      res.status(400).json({ success: false, message: result.error });
      return;
    }

    res.json({ success: true, message: 'Sample deleted successfully' });
  } catch (error) {
    console.error('delete sample error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete sample',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage }),
    });
  }
};
