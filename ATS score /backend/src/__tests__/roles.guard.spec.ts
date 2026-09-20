import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// Fix 1: admin role guard
class AdminOnly { @Roles('admin') handler() { return 1; } }
class NoRoles { handler() { return 1; } }
class AdminOrRecruiter { @Roles('admin', 'recruiter') handler() { return 1; } }

const ctx = (cls: { prototype: { handler: unknown } }, user?: { id: string }): ExecutionContext =>
  ({
    getHandler: () => cls.prototype.handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

const mockPrisma = { user: { findUnique: jest.fn() } };

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    jest.resetAllMocks();
    guard = new RolesGuard(new Reflector(), mockPrisma as never);
  });

  it('lets an admin through, reading the role from the database', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    await expect(guard.canActivate(ctx(AdminOnly, { id: 'u1' }))).resolves.toBe(true);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' }, select: { role: true } });
  });

  it('blocks an ordinary user with 403', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'user' });
    await expect(guard.canActivate(ctx(AdminOnly, { id: 'u1' }))).rejects.toThrow(ForbiddenException);
  });

  it('blocks when the user no longer exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(ctx(AdminOnly, { id: 'gone' }))).rejects.toThrow(ForbiddenException);
  });

  it('answers 401 when nobody is logged in, without touching the database', async () => {
    await expect(guard.canActivate(ctx(AdminOnly, undefined))).rejects.toThrow(UnauthorizedException);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('fails closed: a route that uses the guard without listing roles blocks everyone', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'admin' });
    await expect(guard.canActivate(ctx(NoRoles, { id: 'u1' }))).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('accepts any of several allowed roles', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'recruiter' });
    await expect(guard.canActivate(ctx(AdminOrRecruiter, { id: 'u1' }))).resolves.toBe(true);
    mockPrisma.user.findUnique.mockResolvedValue({ role: 'user' });
    await expect(guard.canActivate(ctx(AdminOrRecruiter, { id: 'u1' }))).rejects.toThrow(ForbiddenException);
  });

  it('checks the role on every request, so a demotion takes effect immediately', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({ role: 'admin' }).mockResolvedValueOnce({ role: 'user' });
    await expect(guard.canActivate(ctx(AdminOnly, { id: 'u1' }))).resolves.toBe(true);
    await expect(guard.canActivate(ctx(AdminOnly, { id: 'u1' }))).rejects.toThrow(ForbiddenException);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
  });
});
