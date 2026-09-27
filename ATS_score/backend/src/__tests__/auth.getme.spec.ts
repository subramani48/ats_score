import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../modules/auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Fix 1 (part): GET /users/me returns the role, so the website can show the Admin link
const mockPrisma = { user: { findUnique: jest.fn(), create: jest.fn() } };

describe('AuthService.getMe()', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();
    service = module.get(AuthService);
    jest.resetAllMocks();
  });

  it('asks the database for the role, and never for the password hash', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.co', name: 'A', role: 'admin', createdAt: new Date() });
    const result = await service.getMe('u1');
    const args = mockPrisma.user.findUnique.mock.calls[0][0];
    expect(args.where).toEqual({ id: 'u1' });
    expect(args.select).toMatchObject({ id: true, email: true, name: true, role: true, createdAt: true });
    expect(args.select.passwordHash).toBeUndefined();
    expect(result.data?.role).toBe('admin');
  });
});
