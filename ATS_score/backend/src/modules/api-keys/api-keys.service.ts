import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(userId: string, name: string) {
    const key = `ats_${randomBytes(32).toString('hex')}`;
    const apiKey = await this.prisma.apiKey.create({
      data: { userId, key, name },
    });
    // Return full key ONCE — never again
    return { success: true, data: { id: apiKey.id, key, name, createdAt: apiKey.createdAt } };
  }

  async listKeys(userId: string) {
    const keys = await this.prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        isActive: true,
        usageCount: true,
        lastUsed: true,
        createdAt: true,
        key: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Mask keys: show only prefix + last 8 chars
    return {
      success: true,
      data: keys.map(k => ({
        ...k,
        key: `ats_${'*'.repeat(24)}${k.key.slice(-8)}`,
      })),
    };
  }

  async revokeKey(userId: string, keyId: string) {
    const existing = await this.prisma.apiKey.findFirst({ where: { id: keyId, userId } });
    if (!existing) throw new NotFoundException('API key not found');

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
    return { success: true };
  }
}
