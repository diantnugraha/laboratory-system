import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';
import { AuthRepository } from '../repositories/implementations/AuthRepository';
import { generatePassword6Letters } from '../utils/otpGenerator';
import { parseId } from '../types';
import { emailService } from '../services/emailService';

// Initialize repository
const authRepo = new AuthRepository(prisma);

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

    // Check if email already exists via repository
    const emailResult = await authRepo.findByEmail(email);
    if (emailResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: emailResult.error
      });
      return;
    }
    if (emailResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
      return;
    }

    // Check if username already exists via repository
    const usernameResult = await authRepo.findByUsername(username);
    if (usernameResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: usernameResult.error
      });
      return;
    }
    if (usernameResult.getValue() !== null) {
      res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
      return;
    }

    // Check if role exists via repository
    const roleValid = await authRepo.validateRoleExists(role_id);
    if (roleValid.isFailure()) {
      res.status(500).json({
        success: false,
        message: roleValid.error
      });
      return;
    }
    if (!roleValid.getValue()) {
      res.status(404).json({
        success: false,
        message: 'Role not found'
      });
      return;
    }

    // Generate password (6 letters)
    const generatedPassword = generatePassword6Letters();

    // Hash password via repository
    const hashedPassword = await authRepo.hashPassword(generatedPassword);

    // Create user via repository
    const createdBy = req.user?.id || 1;
    const result = await authRepo.createUser({
      email,
      username,
      display_name,
      role_id,
      password: hashedPassword,
      created_by: createdBy
    });

    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.getValue(),
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

    // Find user by email via repository
    const userResult = await authRepo.findByEmail(email);
    if (userResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: userResult.error
      });
      return;
    }

    const user = userResult.getValue();
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
      return;
    }

    // Verify password via repository
    const isPasswordValid = await authRepo.comparePassword(password, user.password);
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

    // Generate JWT token (stays in controller - presentation layer)
    const tokenPayload = {
      userId: user.id
    };

    const token = jwt.sign(tokenPayload, jwtSecret, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    } as jwt.SignOptions);

    // Update last_login via repository
    const lastLoginResult = await authRepo.updateLastLogin(user.id);
    if (lastLoginResult.isFailure()) {
      console.error('Failed to update last login:', lastLoginResult.error);
      // Don't fail the login request, just log the error
    }

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

    // Get full user data from database via repository
    const result = await authRepo.findById(req.user.id);
    if (result.isFailure()) {
      res.status(500).json({
        success: false,
        message: result.error
      });
      return;
    }

    const user = result.getValue();
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

    // Check if user exists via repository
    const userResult = await authRepo.findById(userId);
    if (userResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: userResult.error
      });
      return;
    }

    if (!userResult.getValue()) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate new password (6 letters)
    const newPassword = generatePassword6Letters();

    // Hash password via repository
    const hashedPassword = await authRepo.hashPassword(newPassword);

    // Update password via repository
    const updateResult = await authRepo.updatePassword(userId, hashedPassword);
    if (updateResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: updateResult.error
      });
      return;
    }

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

    // Get current user with password via repository
    const userResult = await authRepo.findByIdWithPassword(req.user.id);
    if (userResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: userResult.error
      });
      return;
    }

    const user = userResult.getValue();
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Verify old password via repository
    const isOldPasswordValid = await authRepo.comparePassword(old_password, user.password);
    if (!isOldPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid old password'
      });
      return;
    }

    // Hash new password via repository
    const hashedPassword = await authRepo.hashPassword(new_password);

    // Update password via repository
    const updateResult = await authRepo.updatePassword(user.id, hashedPassword);
    if (updateResult.isFailure()) {
      res.status(500).json({
        success: false,
        message: updateResult.error
      });
      return;
    }

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
 * Send password reset email (public endpoint)
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    // Find user by email via repository
    const userResult = await authRepo.findByEmail(email);
    if (userResult.isFailure()) {
      // Don't reveal specific error (security best practice)
      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent.'
      });
      return;
    }

    const user = userResult.getValue();
    if (!user) {
      // Don't reveal if user exists or not (security best practice)
      res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent.'
      });
      return;
    }

    // Generate reset token
    const resetToken = uuidv4();
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to database
    await prisma.users.update({
      where: { id: user.id },
      data: {
        reset_password_token: resetToken,
        reset_token_expires_at: tokenExpiry,
      },
    });

    // Send password reset email
    await emailService.sendPasswordResetEmail(user.email, user.display_name, resetToken);

    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Don't reveal specific error (security best practice)
    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent.'
    });
  }
};

/**
 * GET /api/auth/validate-setup-token
 * Validate setup password token (public endpoint)
 */
export const validateSetupToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token is required'
      });
      return;
    }

    const user = await prisma.users.findFirst({
      where: {
        setup_password_token: token,
        setup_token_expires_at: { gt: new Date() },
        trash: null,
      },
      select: { id: true, email: true, display_name: true },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    res.json({
      success: true,
      data: { email: user.email, display_name: user.display_name }
    });
  } catch (error) {
    console.error('Validate setup token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate token'
    });
  }
};

/**
 * POST /api/auth/setup-password
 * Setup password for new user (public endpoint)
 */
export const setupPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password, confirm_password } = req.body;

    if (!token || !password || !confirm_password) {
      res.status(400).json({
        success: false,
        message: 'Token, password, and confirm password are required'
      });
      return;
    }

    if (password !== confirm_password) {
      res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
      return;
    }

    // Find user with valid token
    const user = await prisma.users.findFirst({
      where: {
        setup_password_token: token,
        setup_token_expires_at: { gt: new Date() },
        trash: null,
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Hash password
    const hashedPassword = await authRepo.hashPassword(password);

    // Update user password and clear token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        setup_password_token: null,
        setup_token_expires_at: null,
      },
    });

    res.json({
      success: true,
      message: 'Password setup successful. You can now login.'
    });
  } catch (error) {
    console.error('Setup password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup password'
    });
  }
};

/**
 * GET /api/auth/validate-reset-token
 * Validate password reset token (public endpoint)
 */
export const validateResetToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Token is required'
      });
      return;
    }

    const user = await prisma.users.findFirst({
      where: {
        reset_password_token: token,
        reset_token_expires_at: { gt: new Date() },
        trash: null,
      },
      select: { id: true, email: true },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    res.json({
      success: true,
      data: { email: user.email }
    });
  } catch (error) {
    console.error('Validate reset token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate token'
    });
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password with token (public endpoint)
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password, confirm_password } = req.body;

    if (!token || !password || !confirm_password) {
      res.status(400).json({
        success: false,
        message: 'Token, password, and confirm password are required'
      });
      return;
    }

    if (password !== confirm_password) {
      res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
      return;
    }

    // Find user with valid token
    const user = await prisma.users.findFirst({
      where: {
        reset_password_token: token,
        reset_token_expires_at: { gt: new Date() },
        trash: null,
      },
    });

    if (!user) {
      res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return;
    }

    // Hash password
    const hashedPassword = await authRepo.hashPassword(password);

    // Update user password and clear token
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        reset_password_token: null,
        reset_token_expires_at: null,
      },
    });

    res.json({
      success: true,
      message: 'Password reset successful. You can now login.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
};

