import { Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

export const API_KEY_PREFIX = 'ats_';
// "ats_" + 64 hex characters, as created by createKey()
const API_KEY_FORMAT = /^ats_[0-9a-f]{64}$/;

// Keys are 256 random bits, so a fast unsalted hash is enough: nobody can guess one from its hash.
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  async createKey(userId: string, name: string) {
    const key = `${API_KEY_PREFIX}${randomBytes(32).toString('hex')}`;
    const apiKey = await this.prisma.apiKey.create({
      data: { userId, keyHash: hashApiKey(key), keyLast8: key.slice(-8), name },
    });
    // Return full key ONCE — only its hash is stored, so it can never be shown again
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
        keyLast8: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    // Mask keys: show only prefix + last 8 chars
    return {
      success: true,
      data: keys.map(({ keyLast8, ...k }) => ({
        ...k,
        key: `${API_KEY_PREFIX}${'*'.repeat(24)}${keyLast8}`,
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

  /** Returns the key's owner for an active key, or null. Counts the use. */
  async authenticate(key: string): Promise<AuthUser | null> {
    if (!API_KEY_FORMAT.test(key)) return null;

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { keyHash: hashApiKey(key) },
      select: { id: true, isActive: true, user: { select: { id: true, email: true } } },
    });
    if (!apiKey || !apiKey.isActive) return null;

    await this.prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { usageCount: { increment: 1 }, lastUsed: new Date() },
    });
    return { id: apiKey.user.id, email: apiKey.user.email };
  }
}
