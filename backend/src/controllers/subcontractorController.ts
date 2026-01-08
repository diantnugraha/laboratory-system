import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { buildSearchCondition, checkDuplicateCaseInsensitive } from '../utils/searchHelper';
import { parseId, parseQueryParam, ApiResponse } from '../types';

/**
 * GET /api/subcontractors - List dengan search & pagination
 */
export const getAllSubcontractors = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseQueryParam(req.query.page, 1);
    const limit = parseQueryParam(req.query.limit, 20);
    const skip = (page - 1) * limit;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;

    const where = {
      trash: null,
      ...buildSearchCondition('lab_name', search),
    };

    const [data, total] = await Promise.all([
      prisma.subcontractor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' }
      }),
      prisma.subcontractor.count({ where })
    ]);

    const response: ApiResponse = {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    res.json(response);
  } catch (error) {
    console.error('getAll subcontractors error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcontractors',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/subcontractors/:id
 */
export const getSubcontractorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const data = await prisma.subcontractor.findFirst({
      where: { id, trash: null }
    });

    if (!data) {
      res.status(404).json({
        success: false,
        message: 'Subcontractor not found'
      });
      return;
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('getById subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/subcontractors
 */
export const createSubcontractor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { lab_name, address_name, phone, fax, contact, email } = req.body;

    // Validate lab_name (required, max 255)
    if (!lab_name || typeof lab_name !== 'string' || lab_name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Lab name is required'
      });
      return;
    }
    if (lab_name.trim().length > 255) {
      res.status(400).json({
        success: false,
        message: 'Lab name must not exceed 255 characters'
      });
      return;
    }

    // Validate address_name (required, max 255)
    if (!address_name || typeof address_name !== 'string' || address_name.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Address name is required'
      });
      return;
    }
    if (address_name.trim().length > 255) {
      res.status(400).json({
        success: false,
        message: 'Address name must not exceed 255 characters'
      });
      return;
    }

    // Validate phone (required, max 255)
    if (!phone || typeof phone !== 'string' || phone.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Phone is required'
      });
      return;
    }
    if (phone.trim().length > 255) {
      res.status(400).json({
        success: false,
        message: 'Phone must not exceed 255 characters'
      });
      return;
    }

    // Validate fax (required, max 255)
    if (!fax || typeof fax !== 'string' || fax.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Fax is required'
      });
      return;
    }
    if (fax.trim().length > 255) {
      res.status(400).json({
        success: false,
        message: 'Fax must not exceed 255 characters'
      });
      return;
    }

    // Validate contact (required, max 255)
    if (!contact || typeof contact !== 'string' || contact.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Contact is required'
      });
      return;
    }
    if (contact.trim().length > 255) {
      res.status(400).json({
        success: false,
        message: 'Contact must not exceed 255 characters'
      });
      return;
    }

    // Validate email (required, max 255, format)
    if (!email || typeof email !== 'string' || email.trim() === '') {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }
    if (email.trim().length > 255) {
      res.status(400).json({
        success: false,
        message: 'Email must not exceed 255 characters'
      });
      return;
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
      return;
    }

    // Check duplicate
    const existing = await checkDuplicateCaseInsensitive(
      prisma.subcontractor,
      'lab_name',
      lab_name.trim()
    );
    if (existing) {
      res.status(409).json({
        success: false,
        message: 'Lab name already exists'
      });
      return;
    }

    const data = await prisma.subcontractor.create({
      data: {
        lab_name: lab_name.trim(),
        address_name: address_name.trim(),
        phone: phone.trim(),
        fax: fax.trim(),
        contact: contact.trim(),
        email: email.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: 'Subcontractor created successfully',
      data
    });
  } catch (error) {
    console.error('create subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to create subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * PUT /api/subcontractors/:id
 */
export const updateSubcontractor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);
    const { lab_name, address_name, phone, fax, contact, email } = req.body;

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    // Check exists
    const existing = await prisma.subcontractor.findFirst({
      where: { id, trash: null }
    });
    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Subcontractor not found'
      });
      return;
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
        res.status(400).json({
          success: false,
          message: 'Lab name cannot be empty'
        });
        return;
      }
      if (lab_name.trim().length > 255) {
        res.status(400).json({
          success: false,
          message: 'Lab name must not exceed 255 characters'
        });
        return;
      }
      updateData.lab_name = lab_name.trim();
    }

    if (address_name !== undefined) {
      if (address_name !== null && address_name !== undefined) {
        if (typeof address_name !== 'string' || address_name.trim() === '') {
          res.status(400).json({
            success: false,
            message: 'Address name cannot be empty'
          });
          return;
        }
        if (address_name.trim().length > 255) {
          res.status(400).json({
            success: false,
            message: 'Address name must not exceed 255 characters'
          });
          return;
        }
        updateData.address_name = address_name.trim();
      } else {
        updateData.address_name = null;
      }
    }
    if (phone !== undefined) {
      if (phone !== null && phone !== undefined) {
        if (typeof phone !== 'string' || phone.trim() === '') {
          res.status(400).json({
            success: false,
            message: 'Phone cannot be empty'
          });
          return;
        }
        if (phone.trim().length > 255) {
          res.status(400).json({
            success: false,
            message: 'Phone must not exceed 255 characters'
          });
          return;
        }
        updateData.phone = phone.trim();
      } else {
        updateData.phone = null;
      }
    }
    if (fax !== undefined) {
      if (fax !== null && fax !== undefined) {
        if (typeof fax !== 'string' || fax.trim() === '') {
          res.status(400).json({
            success: false,
            message: 'Fax cannot be empty'
          });
          return;
        }
        if (fax.trim().length > 255) {
          res.status(400).json({
            success: false,
            message: 'Fax must not exceed 255 characters'
          });
          return;
        }
        updateData.fax = fax.trim();
      } else {
        updateData.fax = null;
      }
    }
    if (contact !== undefined) {
      if (contact !== null && contact !== undefined) {
        if (typeof contact !== 'string' || contact.trim() === '') {
          res.status(400).json({
            success: false,
            message: 'Contact cannot be empty'
          });
          return;
        }
        if (contact.trim().length > 255) {
          res.status(400).json({
            success: false,
            message: 'Contact must not exceed 255 characters'
          });
          return;
        }
        updateData.contact = contact.trim();
      } else {
        updateData.contact = null;
      }
    }
    if (email !== undefined) {
      if (email !== null && email !== undefined) {
        if (typeof email !== 'string' || email.trim() === '') {
          res.status(400).json({
            success: false,
            message: 'Email cannot be empty'
          });
          return;
        }
        if (email.trim().length > 255) {
          res.status(400).json({
            success: false,
            message: 'Email must not exceed 255 characters'
          });
          return;
        }
        // Email format validation
        if (!emailRegex.test(email.trim())) {
          res.status(400).json({
            success: false,
            message: 'Invalid email format'
          });
          return;
        }
        updateData.email = email.trim();
      } else {
        updateData.email = null;
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No valid data to update'
      });
      return;
    }

    // Check duplicate
    if (updateData.lab_name) {
      const duplicate = await checkDuplicateCaseInsensitive(
        prisma.subcontractor, 'lab_name', updateData.lab_name, id
      );
      if (duplicate) {
        res.status(409).json({
          success: false,
          message: 'Lab name already exists'
        });
        return;
      }
    }

    const data = await prisma.subcontractor.update({
      where: { id },
      data: updateData
    });

    res.json({
      success: true,
      message: 'Subcontractor updated successfully',
      data
    });
  } catch (error) {
    console.error('update subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to update subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * DELETE /api/subcontractors/:id
 */
export const deleteSubcontractor = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        success: false,
        message: 'Invalid ID'
      });
      return;
    }

    const existing = await prisma.subcontractor.findFirst({
      where: { id, trash: null }
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        message: 'Subcontractor not found'
      });
      return;
    }

    await prisma.subcontractor.update({
      where: { id },
      data: { trash: 1 }
    });

    res.json({
      success: true,
      message: 'Subcontractor deleted successfully'
    });
  } catch (error) {
    console.error('delete subcontractor error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to delete subcontractor',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/subcontractors/json - JSON API for autocomplete/select2
 */
export const getSubcontractorsJson = async (req: Request, res: Response): Promise<void> => {
  try {
    const searchTerm = typeof req.query.q === 'string' ? req.query.q : undefined;
    
    // Filter out specific domains if needed (per spec note, optional workaround)
    // For now, we'll just use the search term as-is
    const where = {
      trash: null,
      ...buildSearchCondition('lab_name', searchTerm),
    };

    const [items, total] = await Promise.all([
      prisma.subcontractor.findMany({
        where,
        select: {
          id: true,
          lab_name: true
        },
        take: 20,
        orderBy: { lab_name: 'asc' }
      }),
      prisma.subcontractor.count({ where })
    ]);

    // JSON API Response Format
    const response = {
      total_count: total,
      incomplete_results: total > 20,
      items: items.map(item => ({
        id: item.id,
        name: item.lab_name
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('getSubcontractorsJson error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to fetch subcontractors',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};













