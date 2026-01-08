import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { generatePassword6Letters } from '../utils/otpGenerator';
import { parseId } from '../types';

/**
 * POST /api/auth/register
 * Register new user - password will be auto-generated
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, username, display_name, role_id } = req.body;

    if (!email || !username || !display_name || !role_id) {
      res.status(400).json({
        success: false,
        message: 'Email, username, display_name, and role_id are required'
      });
      return;
    }

    // Check if email already exists
    const existingEmail = await prisma.users.findFirst({
      where: { email, trash: null }
    });
    if (existingEmail) {
      res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
      return;
    }

    // Check if username already exists
    const existingUsername = await prisma.users.findFirst({
      where: { username, trash: null }
    });
    if (existingUsername) {
      res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
      return;
    }

    // Check if role exists
    const role = await prisma.roles.findFirst({
      where: { id: role_id }
    });
    if (!role) {
      res.status(404).json({
        success: false,
        message: 'Role not found'
      });
      return;
    }

    // Generate password (6 letters)
    const generatedPassword = generatePassword6Letters();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    // Create user
    // Note: created_by is required in schema, but we'll use a default value (1) or from req.user if available
    const createdBy = req.user?.id || 1;
    
    const user = await prisma.users.create({
      data: {
        email,
        username,
        display_name,
        role_id,
        password: hashedPassword,
        created_by: createdBy
      },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        role_id: true,
        created_at: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        password: generatedPassword // Return generated password
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to register user',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/auth/login
 * Login user and get JWT token
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
      return;
    }

    // Find user by email
    const user = await prisma.users.findFirst({
      where: {
        email,
        trash: null
      },
      include: {
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Check JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id
    };

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    } as jwt.SignOptions);

    // Update last_login
    await prisma.users.update({
      where: { id: user.id },
      data: { last_login: new Date() }
    });

    // Prepare user data (exclude password)
    const { password: _, ...userData } = user;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * GET /api/auth/profile
 * Get current user profile (requires authentication)
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Get full user data from database
    const user = await prisma.users.findFirst({
      where: {
        id: req.user.id,
        trash: null
      },
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        role_id: true,
        customer_id: true,
        contact_id: true,
        profile_picture: true,
        department: true,
        created_at: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/auth/logout
 * Logout user (requires authentication)
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    // Clear token in database (optional - depends on your implementation)
    // For now, just return success
    // If you store tokens in database, clear it here

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/auth/generate-password
 * Generate new password for a user (6 letters) - requires authentication
 */
export const generatePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
      return;
    }

    const userId = parseId(String(user_id));
    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
      return;
    }

    // Check if user exists
    const user = await prisma.users.findFirst({
      where: { id: userId, trash: null }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate new password (6 letters)
    const newPassword = generatePassword6Letters();
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    await prisma.users.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password generated successfully',
      data: {
        user_id: userId,
        password: newPassword
      }
    });
  } catch (error) {
    console.error('Generate password error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to generate password',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
      return;
    }

    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      res.status(400).json({
        success: false,
        message: 'Old password and new password are required'
      });
      return;
    }

    // Get current user with password
    const user = await prisma.users.findFirst({
      where: {
        id: req.user.id,
        trash: null
      }
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(old_password, user.password);
    if (!isOldPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid old password'
      });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

/**
 * POST /api/auth/forgot-password
 * Reset password with email (public endpoint)
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, new_password, retype_new_password } = req.body;

    if (!email || !new_password || !retype_new_password) {
      res.status(400).json({
        success: false,
        message: 'Email, new password, and retype new password are required'
      });
      return;
    }

    if (new_password !== retype_new_password) {
      res.status(400).json({
        success: false,
        message: 'New password and retype new password do not match'
      });
      return;
    }

    // Find user by email
    const user = await prisma.users.findFirst({
      where: {
        email,
        trash: null
      }
    });

    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      res.json({
        success: true,
        message: 'If the email exists, password has been reset'
      });
      return;
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(new_password, salt);

    // Update password
    await prisma.users.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      message: 'Failed to reset password',
      ...(process.env.NODE_ENV === 'development' && { error: errorMessage })
    });
  }
};

