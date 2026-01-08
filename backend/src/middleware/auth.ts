import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

interface JwtPayload {
  userId: number;
  iat?: number;
  passwordChangedAt?: number;
}

// Verify JWT token
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured in environment variables');
      res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
      return;
    }

    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Token is empty'
      });
      return;
    }

    // Verify token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.JsonWebTokenError) {
        res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
        return;
      }
      if (jwtError instanceof jwt.TokenExpiredError) {
        res.status(401).json({
          success: false,
          message: 'Token expired'
        });
        return;
      }
      throw jwtError;
    }

    if (!decoded || !decoded.userId) {
      res.status(401).json({
        success: false,
        message: 'Invalid token payload'
      });
      return;
    }

    // Get user from database using Prisma (only active users, trash IS NULL)
    const user = await prisma.users.findFirst({
      where: {
        id: decoded.userId,
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
        updated_at: true, // Need updated_at to check if password was changed
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
        message: 'User not found or has been deleted'
      });
      return;
    }

    // Check if password was changed after token was issued
    // IMPORTANT: We can't rely solely on updated_at because it can change for other reasons
    // We use a very lenient approach: only invalidate if the difference is VERY large (> 1 hour)
    // This ensures we only invalidate tokens that were definitely created before password change
    // and not tokens where updated_at changed due to other updates
    
    if (decoded.iat !== undefined) {
      const userPasswordChangedAt = user.updated_at 
        ? Math.floor(new Date(user.updated_at).getTime() / 1000) 
        : 0;
      
      // Only check if user has updated_at
      if (userPasswordChangedAt > 0) {
        const timeDifference = userPasswordChangedAt - decoded.iat;
        const ONE_HOUR = 3600; // 1 hour in seconds - very large tolerance to avoid false positives
        
        // Add logging for debugging
        console.log('Token validation check:', {
          userId: decoded.userId,
          tokenIat: decoded.iat,
          tokenPasswordChangedAt: decoded.passwordChangedAt,
          userPasswordChangedAt: userPasswordChangedAt,
          timeDifference: timeDifference,
          timeDifferenceMinutes: (timeDifference / 60).toFixed(2),
          tokenCreatedAt: new Date(decoded.iat * 1000).toISOString(),
          passwordChangedAt: new Date(userPasswordChangedAt * 1000).toISOString()
        });
        
        // Only invalidate if:
        // 1. Token was created BEFORE password was changed (tokenIat < userPasswordChangedAt)
        // 2. AND the difference is VERY large (> 1 hour) to ensure it's definitely a password change
        //    and not just updated_at changing due to other updates
        if (decoded.iat < userPasswordChangedAt && timeDifference > ONE_HOUR) {
          // Token was created significantly before password change (more than 1 hour), invalidate it
          console.log('Token invalidated: password changed more than 1 hour after token creation', {
            tokenIat: decoded.iat,
            userPasswordChangedAt: userPasswordChangedAt,
            timeDifference: timeDifference,
            timeDifferenceHours: (timeDifference / 3600).toFixed(2)
          });
          res.status(401).json({
            success: false,
            message: 'Session expired. Please login again.'
          });
          return;
        }
        // Token is valid - either created after password change or difference is less than 1 hour
        console.log('Token is valid - password change check passed (within tolerance)');
      } else {
        // No updated_at, password hasn't been changed, token is valid
        console.log('Token is valid - no password change detected');
      }
    } else {
      // For old tokens without iat, allow them (backward compatibility)
      console.log('Token is valid - old token without iat (backward compatibility)');
    }

    // Remove updated_at from user object before attaching to request
    const { updated_at, ...userWithoutUpdatedAt } = user;

    // Attach user to request (without updated_at)
    req.user = userWithoutUpdatedAt as typeof req.user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    // Provide more detailed error in development
    const errorMessage = process.env.NODE_ENV === 'development' && error instanceof Error
      ? error.message 
      : 'Server error during authentication';
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && error instanceof Error && { 
        error: error.message 
      })
    });
  }
};

// Check if user has specific role
export const authorize = (...roleIds: number[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      const userRoleId = req.user.role_id;
      
      if (!roleIds.includes(userRoleId)) {
        res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient permissions.'
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};

// Check if user is customer and owns the resource
export const authorizeCustomerOwnership = (resourceCustomerIdField: string = 'customer_id') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
        return;
      }

      // If user is not a customer, allow (admin/superadmin can access all)
      // Assuming role_id 8 is customer based on SIMLab structure
      if (req.user.role_id !== 8) {
        next();
        return;
      }

      // If user is customer, check ownership
      const resourceId = req.params.id || (req.body as any).id;
      if (!resourceId) {
        res.status(400).json({
          success: false,
          message: 'Resource ID required'
        });
        return;
      }

      // This will be implemented per resource type
      // For now, we'll check customer_id from request
      if (req.user.customer_id && (req.body as any)[resourceCustomerIdField]) {
        if (req.user.customer_id !== (req.body as any)[resourceCustomerIdField]) {
          res.status(403).json({
            success: false,
            message: 'Access denied. You can only access your own resources.'
          });
          return;
        }
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Server error during authorization'
      });
    }
  };
};













