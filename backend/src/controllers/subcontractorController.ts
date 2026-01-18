import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../config/database.js';
import { SubcontractorRepository } from '../repositories/implementations/SubcontractorRepository.js';
import { parseId, parseQueryParam, ApiResponse } from '../types/index.js';

// Initialize repository
const subcontractorRepo = new SubcontractorRepository(prisma);

/**
 * GET /api/subcontractors - List dengan search & pagination
 */
export const getAllSubcontractors = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const page = parseQueryParam((request.query as any).page, 1);
    const limit = parseQueryParam((request.query as any).limit, 20);
    const search = typeof (request.query as any).search === 'string' ? (request.query as any).search : undefined;

    // Call repository
    const result = await subcontractorRepo.findAll({ search, page, limit });

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    const data = result.getValue();

    const response: ApiResponse = {
      success: true,
      data: data.data,
      pagination: data.pagination,
    };

    return reply.send(response);
  } catch (error) {
    console.error('getAll subcontractors error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch subcontractors',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/subcontractors/:id
 */
export const getSubcontractorById = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Call repository
    const result = await subcontractorRepo.findById(id);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({ success: true, data: result.getValue() });
  } catch (error) {
    console.error('getById subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/subcontractors
 */
export const createSubcontractor = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const { lab_name, address_name, phone, fax, contact, email } = request.body as any;

    // Validate lab_name (required, max 255)
    if (!lab_name || typeof lab_name !== 'string' || lab_name.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Lab name is required'
      });
    }
    if (lab_name.trim().length > 255) {
      return reply.code(400).send({
        success: false,
        message: 'Lab name must not exceed 255 characters'
      });
    }

    // Validate address_name (required, max 255)
    if (!address_name || typeof address_name !== 'string' || address_name.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Address name is required'
      });
    }
    if (address_name.trim().length > 255) {
      return reply.code(400).send({
        success: false,
        message: 'Address name must not exceed 255 characters'
      });
    }

    // Validate phone (required, max 255)
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Phone is required'
      });
    }
    if (phone.trim().length > 255) {
      return reply.code(400).send({
        success: false,
        message: 'Phone must not exceed 255 characters'
      });
    }

    // Validate fax (required, max 255)
    if (!fax || typeof fax !== 'string' || fax.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Fax is required'
      });
    }
    if (fax.trim().length > 255) {
      return reply.code(400).send({
        success: false,
        message: 'Fax must not exceed 255 characters'
      });
    }

    // Validate contact (required, max 255)
    if (!contact || typeof contact !== 'string' || contact.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Contact is required'
      });
    }
    if (contact.trim().length > 255) {
      return reply.code(400).send({
        success: false,
        message: 'Contact must not exceed 255 characters'
      });
    }

    // Validate email (required, max 255, format)
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return reply.code(400).send({
        success: false,
        message: 'Email is required'
      });
    }
    if (email.trim().length > 255) {
      return reply.code(400).send({
        success: false,
        message: 'Email must not exceed 255 characters'
      });
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check duplicate via repository
    const duplicateResult = await subcontractorRepo.findByLabName(lab_name.trim());
    if (duplicateResult.isSuccess() && duplicateResult.getValue() === true) {
      return reply.code(409).send({
        success: false,
        message: 'Lab name already exists'
      });
    }

    // Create subcontractor via repository
    const result = await subcontractorRepo.create({
      lab_name: lab_name.trim(),
      address_name: address_name.trim(),
      phone: phone.trim(),
      fax: fax.trim(),
      contact: contact.trim(),
      email: email.trim(),
    });

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.code(201).send({
      success: true,
      message: 'Subcontractor created successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('create subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to create subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/subcontractors/:id
 */
export const updateSubcontractor = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);
    const { lab_name, address_name, phone, fax, contact, email } = request.body as any;

    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check exists via repository
    const existingResult = await subcontractorRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Subcontractor not found',
      });
    }

    const updateData: {
      lab_name?: string;
      address_name?: string | null;
      phone?: string | null;
      fax?: string | null;
      contact?: string | null;
      email?: string | null;
    } = {};

    // Email regex for validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (lab_name !== undefined) {
      if (!lab_name || typeof lab_name !== 'string' || lab_name.trim() === '') {
        return reply.code(400).send({
          success: false,
          message: 'Lab name cannot be empty'
        });
      }
      if (lab_name.trim().length > 255) {
        return reply.code(400).send({
          success: false,
          message: 'Lab name must not exceed 255 characters'
        });
      }
      updateData.lab_name = lab_name.trim();
    }

    if (address_name !== undefined) {
      if (address_name !== null && address_name !== undefined) {
        if (typeof address_name !== 'string' || address_name.trim() === '') {
          return reply.code(400).send({
            success: false,
            message: 'Address name cannot be empty'
          });
        }
        if (address_name.trim().length > 255) {
          return reply.code(400).send({
            success: false,
            message: 'Address name must not exceed 255 characters'
          });
        }
        updateData.address_name = address_name.trim();
      } else {
        updateData.address_name = null;
      }
    }
    if (phone !== undefined) {
      if (phone !== null && phone !== undefined) {
        if (typeof phone !== 'string' || phone.trim() === '') {
          return reply.code(400).send({
            success: false,
            message: 'Phone cannot be empty'
          });
        }
        if (phone.trim().length > 255) {
          return reply.code(400).send({
            success: false,
            message: 'Phone must not exceed 255 characters'
          });
        }
        updateData.phone = phone.trim();
      } else {
        updateData.phone = null;
      }
    }
    if (fax !== undefined) {
      if (fax !== null && fax !== undefined) {
        if (typeof fax !== 'string' || fax.trim() === '') {
          return reply.code(400).send({
            success: false,
            message: 'Fax cannot be empty'
          });
        }
        if (fax.trim().length > 255) {
          return reply.code(400).send({
            success: false,
            message: 'Fax must not exceed 255 characters'
          });
        }
        updateData.fax = fax.trim();
      } else {
        updateData.fax = null;
      }
    }
    if (contact !== undefined) {
      if (contact !== null && contact !== undefined) {
        if (typeof contact !== 'string' || contact.trim() === '') {
          return reply.code(400).send({
            success: false,
            message: 'Contact cannot be empty'
          });
        }
        if (contact.trim().length > 255) {
          return reply.code(400).send({
            success: false,
            message: 'Contact must not exceed 255 characters'
          });
        }
        updateData.contact = contact.trim();
      } else {
        updateData.contact = null;
      }
    }
    if (email !== undefined) {
      if (email !== null && email !== undefined) {
        if (typeof email !== 'string' || email.trim() === '') {
          return reply.code(400).send({
            success: false,
            message: 'Email cannot be empty'
          });
        }
        if (email.trim().length > 255) {
          return reply.code(400).send({
            success: false,
            message: 'Email must not exceed 255 characters'
          });
        }
        // Email format validation
        if (!emailRegex.test(email.trim())) {
          return reply.code(400).send({
            success: false,
            message: 'Invalid email format'
          });
        }
        updateData.email = email.trim();
      } else {
        updateData.email = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return reply.code(400).send({
        success: false,
        message: 'No valid data to update'
      });
    }

    // Check duplicate via repository
    if (updateData.lab_name) {
      const duplicateResult = await subcontractorRepo.findByLabName(updateData.lab_name, id);
      if (duplicateResult.isSuccess() && duplicateResult.getValue() === true) {
        return reply.code(409).send({
          success: false,
          message: 'Lab name already exists'
        });
      }
    }

    // Update via repository
    const result = await subcontractorRepo.update(id, updateData);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Subcontractor updated successfully',
      data: result.getValue(),
    });
  } catch (error) {
    console.error('update subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to update subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/subcontractors/:id
 */
export const deleteSubcontractor = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const id = parseId((request.params as any).id);

    if (!id) {
      return reply.code(400).send({
        success: false,
        message: 'Invalid ID'
      });
    }

    // Check exists via repository
    const existingResult = await subcontractorRepo.findById(id);
    if (existingResult.isFailure()) {
      return reply.code(404).send({
        success: false,
        message: 'Subcontractor not found',
      });
    }

    // Delete via repository
    const result = await subcontractorRepo.delete(id);

    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send({
      success: true,
      message: 'Subcontractor deleted successfully'
    });
  } catch (error) {
    console.error('delete subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to delete subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/subcontractors/json - JSON API for autocomplete/select2
 */
export const getSubcontractorsJson = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const searchTerm = typeof (request.query as any).q === 'string' ? (request.query as any).q : undefined;

    // Call repository
    const result = await subcontractorRepo.findForAutocomplete(searchTerm);

    // Handle repository result
    if (result.isFailure()) {
      return reply.code(500).send({
        success: false,
        message: result.error,
      });
    }

    return reply.send(result.getValue());
  } catch (error) {
    console.error('getSubcontractorsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return reply.code(500).send({
      success: false,
      message: 'Failed to fetch subcontractors',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};
