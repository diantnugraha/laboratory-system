import { PrismaClient } from '@prisma/client';
import { IRoleRepository, RoleFilter } from '../contracts/IRoleRepository';
import { RepositoryResult, PaginatedData } from '../results/RepositoryResult';
import { buildSearchCondition } from '../../utils/searchHelper';

/**
 * Role Repository Implementation (The Worker)
 * Concrete implementation of role data access operations
 *
 * Note: Role is READ-ONLY - no write operations available
 * Data source: simlab_dev.roles table
 */
export class RoleRepository implements IRoleRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(filter: RoleFilter): Promise<RepositoryResult<PaginatedData<any>>> {
    try {
      const { search, limit = 100, offset = 0 } = filter;

      // Build where condition for search
      const where: any = {
        ...buildSearchCondition('name', search),
      };

      const [data, total] = await Promise.all([
        this.prisma.roles.findMany({
          where,
          select: {
            id: true,
            name: true,
          },
          orderBy: { id: 'asc' },
          take: limit,
          skip: offset,
        }),
        this.prisma.roles.count({ where }),
      ]);

      // Calculate page from offset
      const page = Math.floor(offset / limit) + 1;

      return RepositoryResult.ok({
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch roles: ${error.message}`);
    }
  }

  async findById(id: number): Promise<RepositoryResult<any>> {
    try {
      const role = await this.prisma.roles.findFirst({
        where: { id },
        select: {
          id: true,
          name: true,
        },
      });

      if (!role) {
        return RepositoryResult.fail('Role not found');
      }

      return RepositoryResult.ok(role);
    } catch (error: any) {
      return RepositoryResult.fail(`Failed to fetch role: ${error.message}`);
    }
  }
}
