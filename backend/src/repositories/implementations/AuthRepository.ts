import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  IAuthRepository,
  CreateAuthUserDTO,
} from '../contracts/IAuthRepository';
import { RepositoryResult } from '../results/RepositoryResult';

/**
 * Auth Repository Implementation (The Worker)
 * Concrete implementation of authentication operations
 */
export class AuthRepository implements IAuthRepository {
  constructor(private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<RepositoryResult<any | null>> {
    try {
      console.log('[AuthRepository] Finding user by email:', email);

      const user = await this.prisma.users.findFirst({
        where: {
          email,
          trash: null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          password: true,
          display_name: true,
          role_id: true,
          customer_id: true,
          contact_id: true,
          profile_picture: true,
          department: true,
          last_login: true,
          created_at: true,
          updated_at: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      console.log('[AuthRepository] User found:', user ? 'YES' : 'NO');
      console.log('[AuthRepository] User data:', JSON.stringify(user, null, 2));
      console.log('[AuthRepository] Role included:', user?.role ? 'YES' : 'NO');
      if (user?.role) {
        console.log('[AuthRepository] Role data:', JSON.stringify(user.role, null, 2));
      }

      return RepositoryResult.ok(user);
    } catch (error: any) {
      console.error('[AuthRepository] Error finding user:', error);
      return RepositoryResult.fail(`Failed to find user by email: ${error.message}`);
    }
  }

  async findByUsername(username: string): Promise<RepositoryResult<any | null>> {
    try {
      const user = await this.prisma.users.findFirst({
        where: {
          username,
          trash: null,
        },
      });

      return RepositoryResult.ok(user);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to find user by username: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any | null>> {
    try {
      const user = await this.prisma.users.findFirst({
        where: {
          id,
          trash: null,
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
              name: true,
            },
          },
        },
      });

      return RepositoryResult.ok(user);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to find user by ID: ${error.message}`);
    }
  }

  async findByIdWithPassword(id: number): Promise<RepositoryResult<any | null>> {
    try {
      const user = await this.prisma.users.findFirst({
        where: {
          id,
          trash: null,
        },
      });

      return RepositoryResult.ok(user);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to find user by ID: ${error.message}`);
    }
  }

  async validateRoleExists(roleId: number): Promise<RepositoryResult<boolean>> {
    try {
      const role = await this.prisma.roles.findFirst({
        where: { id: roleId },
      });

      return RepositoryResult.ok(!!role);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to validate role: ${error.message}`);
    }
  }

  async createUser(data: CreateAuthUserDTO): Promise<RepositoryResult<any>> {
    try {
      const user = await this.prisma.users.create({
        data: {
          email: data.email,
          username: data.username,
          display_name: data.display_name,
          role_id: data.role_id,
          password: data.password,
          created_by: data.created_by,
        },
        select: {
          id: true,
          username: true,
          email: true,
          display_name: true,
          role_id: true,
          created_at: true,
        },
      });

      return RepositoryResult.ok(user);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to create user: ${error.message}`);
    }
  }

  async updatePassword(userId: number, hashedPassword: string): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update password: ${error.message}`);
    }
  }

  async updateLastLogin(userId: number): Promise<RepositoryResult<boolean>> {
    try {
      await this.prisma.users.update({
        where: { id: userId },
        data: { last_login: new Date() },
      });

      return RepositoryResult.ok(true);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to update last login: ${error.message}`);
    }
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }
}
