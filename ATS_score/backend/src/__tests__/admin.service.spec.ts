import { NotFoundException, ValidationPipe } from '@nestjs/common';
import { AdminService } from '../modules/admin/admin.service';
import { AdminController } from '../modules/admin/admin.controller';

const makePrisma = () => ({
  user: {
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    findUnique: jest.fn(),
    update: jest.fn(async ({ data }) => ({ id: 'u1', email: 'a@b.c', name: null, tier: data.tier, role: 'user' })),
  },
});

describe('AdminService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let notifications: { create: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = makePrisma();
    notifications = { create: jest.fn() };
    service = new AdminService(prisma as never, notifications as never);
  });

  describe('setUserTier()', () => {
    it('changes the plan and tells the user', async () => {
      prisma.user.findUnique.mockResolvedValue({ tier: 'free' });
      const res = await service.setUserTier('u1', 'pro', 'admin1');

      expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'u1' }, data: { tier: 'pro' } }));
      expect(res.data.tier).toBe('pro');
      expect(notifications.create).toHaveBeenCalledWith('u1', 'Your plan has changed', expect.stringContaining('Pro plan'), 'success');
    });

    it('does not notify when the plan stays the same', async () => {
      prisma.user.findUnique.mockResolvedValue({ tier: 'pro' });
      await service.setUserTier('u1', 'pro', 'admin1');
      expect(notifications.create).not.toHaveBeenCalled();
    });

    it('answers 404 for an unknown user and changes nothing', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.setUserTier('nope', 'pro', 'admin1')).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('getUsers()', () => {
    it('searches email and name, case-insensitively', async () => {
      await service.getUsers(1, 20, '  Jane ');
      const where = prisma.user.findMany.mock.calls[0][0].where;
      expect(where).toEqual({ OR: [
        { email: { contains: 'Jane', mode: 'insensitive' } },
        { name: { contains: 'Jane', mode: 'insensitive' } },
      ] });
      expect(prisma.user.count).toHaveBeenCalledWith({ where });
    });

    it.each([
      [NaN, NaN, 1, 20],
      [-3, 0, 1, 1],
      [2, 5000, 2, 100],
      [1.5, 10, 1, 10],
    ])('keeps page %p / limit %p within bounds', async (page, limit, expPage, expLimit) => {
      const res = await service.getUsers(page, limit);
      expect(res.data).toMatchObject({ page: expPage, limit: expLimit });
      expect(prisma.user.findMany.mock.calls[0][0]).toMatchObject({ take: expLimit, skip: (expPage - 1) * expLimit });
    });
  });
});

describe('PATCH /admin/users/:id/tier body', () => {
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true });
  const dtoType = Reflect.getMetadata('design:paramtypes', AdminController.prototype, 'setUserTier')[1];
  const validate = (body: unknown) => pipe.transform(body, { type: 'body', metatype: dtoType });

  it.each(['free', 'pro', 'enterprise'])('accepts "%s"', async tier => {
    await expect(validate({ tier })).resolves.toMatchObject({ tier });
  });

  it.each([{ tier: 'platinum' }, {}, { tier: 'pro', role: 'admin' }])('refuses %p', async body => {
    await expect(validate(body)).rejects.toThrow();
  });
});
