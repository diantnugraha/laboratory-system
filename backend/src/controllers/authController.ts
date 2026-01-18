import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { AuthRepository } from '../repositories/implementations/AuthRepository.js';
import { generatePassword6Letters } from '../utils/otpGenerator.js';
import { parseId } from '../types/index.js';
import { emailService } from '../services/emailService.js';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  NotFoundError,
  ConflictError,
} from '../errors/AppError.js';
import {
  AUTH_ERRORS,
  VALIDATION_ERRORS,
  RESOURCE_ERRORS,
  SUCCESS_MESSAGES,
} from '../constants/errorMessages.js';

// Initialize repository
const authRepo = new AuthRepository(prisma);

/**
 * POST /api/auth/register
 * Register new user - password will be auto-generated
 */
export const register = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, username, display_name, role_id } = request.body as any;

  if (!email || !username || !display_name || !role_id) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Email, username, display_name, dan role_id'));
  }

  // Check if email already exists via repository
  const emailResult = await authRepo.findByEmail(email);
  if (emailResult.isFailure()) {
    throw new AppError(500, emailResult.error || RESOURCE_ERRORS.FETCH_FAILED('user'));
  }
  if (emailResult.getValue() !== null) {
    throw new ConflictError(RESOURCE_ERRORS.EMAIL_EXISTS);
  }

  // Check if username already exists via repository
  const usernameResult = await authRepo.findByUsername(username);
  if (usernameResult.isFailure()) {
    throw new AppError(500, usernameResult.error || RESOURCE_ERRORS.FETCH_FAILED('user'));
  }
  if (usernameResult.getValue() !== null) {
    throw new ConflictError(RESOURCE_ERRORS.USERNAME_EXISTS);
  }

  // Check if role exists via repository
  const roleValid = await authRepo.validateRoleExists(role_id);
  if (roleValid.isFailure()) {
    throw new AppError(500, roleValid.error || RESOURCE_ERRORS.FETCH_FAILED('role'));
  }
  if (!roleValid.getValue()) {
    throw new NotFoundError(RESOURCE_ERRORS.ROLE_NOT_FOUND);
  }

  // Generate password (6 letters)
  const generatedPassword = generatePassword6Letters();

  // Hash password via repository
  const hashedPassword = await authRepo.hashPassword(generatedPassword);

  // Create user via repository
  const createdBy = request.user?.id || 1;
  const result = await authRepo.createUser({
    email,
    username,
    display_name,
    role_id,
    password: hashedPassword,
    created_by: createdBy
  });

  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.CREATE_FAILED('user'));
  }

  return reply.code(201).send({
    success: true,
    message: SUCCESS_MESSAGES.CREATE_SUCCESS('User'),
    data: {
      user: result.getValue(),
      password: generatedPassword // Return generated password
    }
  });
};

/**
 * POST /api/auth/login
 * Login user and get JWT token
 */
export const login = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email, password } = request.body as any;

  if (!email || !password) {
    throw new ValidationError(AUTH_ERRORS.EMAIL_PASSWORD_REQUIRED);
  }

  // Find user by email via repository
  const userResult = await authRepo.findByEmail(email);
  if (userResult.isFailure()) {
    throw new AppError(500, userResult.error || RESOURCE_ERRORS.FETCH_FAILED('user'));
  }

  const user = userResult.getValue();
  if (!user) {
    throw new AuthenticationError(AUTH_ERRORS.INVALID_CREDENTIALS);
  }

  // Verify password via repository
  const isPasswordValid = await authRepo.comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new AuthenticationError(AUTH_ERRORS.INVALID_CREDENTIALS);
  }

  // Check JWT_SECRET
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new AppError(500, 'Server configuration error');
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

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
    data: {
      user: userData,
      token
    }
  });
};

/**
 * GET /api/auth/profile
 * Get current user profile (requires authentication)
 */
export const getProfile = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  // Get full user data from database via repository
  const result = await authRepo.findById(request.user.id);
  if (result.isFailure()) {
    throw new AppError(500, result.error || RESOURCE_ERRORS.FETCH_FAILED('user'));
  }

  const user = result.getValue();
  if (!user) {
    throw new NotFoundError(RESOURCE_ERRORS.USER_NOT_FOUND);
  }

  return reply.send({
    success: true,
    user
  });
};

/**
 * POST /api/auth/logout
 * Logout user (requires authentication)
 */
export const logout = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  // Clear token in database (optional - depends on your implementation)
  // For now, just return success
  // If you store tokens in database, clear it here

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.LOGOUT_SUCCESS
  });
};

/**
 * POST /api/auth/generate-password
 * Generate new password for a user (6 letters) - requires authentication
 */
export const generatePassword = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const { user_id } = request.body as any;

  if (!user_id) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('User ID'));
  }

  const userId = parseId(String(user_id));
  if (!userId) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ID);
  }

  // Check if user exists via repository
  const userResult = await authRepo.findById(userId);
  if (userResult.isFailure()) {
    throw new AppError(500, userResult.error || RESOURCE_ERRORS.FETCH_FAILED('user'));
  }

  if (!userResult.getValue()) {
    throw new NotFoundError(RESOURCE_ERRORS.USER_NOT_FOUND);
  }

  // Generate new password (6 letters)
  const newPassword = generatePassword6Letters();

  // Hash password via repository
  const hashedPassword = await authRepo.hashPassword(newPassword);

  // Update password via repository
  const updateResult = await authRepo.updatePassword(userId, hashedPassword);
  if (updateResult.isFailure()) {
    throw new AppError(500, updateResult.error || RESOURCE_ERRORS.UPDATE_FAILED('password'));
  }

  return reply.send({
    success: true,
    message: 'Password created successfully',
    data: {
      user_id: userId,
      password: newPassword
    }
  });
};

/**
 * POST /api/auth/change-password
 * Change user password (requires authentication)
 */
export const changePassword = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.user) {
    throw new AuthenticationError(AUTH_ERRORS.TOKEN_REQUIRED);
  }

  const { old_password, new_password } = request.body as any;

  if (!old_password || !new_password) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Old password and new password'));
  }

  // Get current user with password via repository
  const userResult = await authRepo.findByIdWithPassword(request.user.id);
  if (userResult.isFailure()) {
    throw new AppError(500, userResult.error || RESOURCE_ERRORS.FETCH_FAILED('user'));
  }

  const user = userResult.getValue();
  if (!user) {
    throw new NotFoundError(RESOURCE_ERRORS.USER_NOT_FOUND);
  }

  // Verify old password via repository
  const isOldPasswordValid = await authRepo.comparePassword(old_password, user.password);
  if (!isOldPasswordValid) {
    throw new AuthenticationError(AUTH_ERRORS.OLD_PASSWORD_INVALID);
  }

  // Hash new password via repository
  const hashedPassword = await authRepo.hashPassword(new_password);

  // Update password via repository
  const updateResult = await authRepo.updatePassword(user.id, hashedPassword);
  if (updateResult.isFailure()) {
    throw new AppError(500, updateResult.error || RESOURCE_ERRORS.UPDATE_FAILED('password'));
  }

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.PASSWORD_CHANGED
  });
};

/**
 * POST /api/auth/forgot-password
 * Send password reset email (public endpoint)
 */
export const forgotPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const { email } = request.body as any;

  if (!email) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Email'));
  }

  // Security: Always return same response regardless of user existence
  const securityMessage = SUCCESS_MESSAGES.PASSWORD_RESET_SENT;

  try {
    // Find user by email via repository
    const userResult = await authRepo.findByEmail(email);
    if (userResult.isFailure() || !userResult.getValue()) {
      // Don't reveal if user exists or not (security best practice)
      return reply.send({
        success: true,
        message: securityMessage
      });
    }

    const user = userResult.getValue()!;

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

    return reply.send({
      success: true,
      message: securityMessage
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    // Don't reveal specific error (security best practice)
    return reply.send({
      success: true,
      message: securityMessage
    });
  }
};

/**
 * GET /api/auth/validate-setup-token
 * Validate setup password token (public endpoint)
 */
export const validateSetupToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const { token } = request.query as any;
  const tokenStr = typeof token === 'string' ? token : undefined;

  if (!tokenStr) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Token'));
  }

  const user = await prisma.users.findFirst({
    where: {
      setup_password_token: tokenStr,
      setup_token_expires_at: { gt: new Date() },
      trash: null,
    },
    select: { id: true, email: true, display_name: true },
  });

  if (!user) {
    throw new ValidationError(AUTH_ERRORS.SETUP_TOKEN_INVALID);
  }

  return reply.send({
    success: true,
    data: { email: user.email, display_name: user.display_name }
  });
};

/**
 * POST /api/auth/setup-password
 * Setup password for new user (public endpoint)
 */
export const setupPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const { token, password, confirm_password } = request.body as any;

  if (!token || !password || !confirm_password) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Token, password, dan konfirmasi password'));
  }

  if (password !== confirm_password) {
    throw new ValidationError(AUTH_ERRORS.PASSWORD_MISMATCH);
  }

  if (password.length < 8) {
    throw new ValidationError(AUTH_ERRORS.PASSWORD_TOO_SHORT);
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
    throw new ValidationError(AUTH_ERRORS.SETUP_TOKEN_INVALID);
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

  return reply.send({
    success: true,
    message: SUCCESS_MESSAGES.PASSWORD_SETUP_SUCCESS
  });
};

/**
 * GET /api/auth/validate-reset-token
 * Validate password reset token (public endpoint)
 */
export const validateResetToken = async (request: FastifyRequest, reply: FastifyReply) => {
  const { token } = request.query as any;
  const tokenStr = typeof token === 'string' ? token : undefined;

  if (!tokenStr) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Token'));
  }

  const user = await prisma.users.findFirst({
    where: {
      reset_password_token: tokenStr,
      reset_token_expires_at: { gt: new Date() },
      trash: null,
    },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new ValidationError(AUTH_ERRORS.RESET_TOKEN_INVALID);
  }

  return reply.send({
    success: true,
    data: { email: user.email }
  });
};

/**
 * POST /api/auth/reset-password
 * Reset password with token (public endpoint)
 */
export const resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
  const { token, password, confirm_password } = request.body as any;

  if (!token || !password || !confirm_password) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Token, password, dan konfirmasi password'));
  }

  if (password !== confirm_password) {
    throw new ValidationError(AUTH_ERRORS.PASSWORD_MISMATCH);
  }

  if (password.length < 8) {
    throw new ValidationError(AUTH_ERRORS.PASSWORD_TOO_SHORT);
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
    throw new ValidationError(AUTH_ERRORS.RESET_TOKEN_INVALID);
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

  return reply.send({
    success: true,
    message: 'Password reset successfully. Please login.'
  });
};
