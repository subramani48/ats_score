import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Marks a route or controller as limited to users whose role is one of `roles`. Used with RolesGuard. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
