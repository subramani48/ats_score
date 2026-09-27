import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthUser } from '../decorators/current-user.decorator';

/**
 * Must run after JwtAuthGuard: `@UseGuards(JwtAuthGuard, RolesGuard)` plus `@Roles('admin')`.
 * The JWT only carries id and email, so the role is read from the database on every request.
 * That way changing a user's role takes effect immediately, without waiting for their token to expire.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Fail closed: using this guard without saying which roles are allowed is a mistake, so deny.
    if (!required || required.length === 0) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    const userId = request.user?.id;
    if (!userId) throw new UnauthorizedException('Authentication required');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || !required.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }
    return true;
  }
}
