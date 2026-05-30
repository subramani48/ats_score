import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    const unreadCount = notifications.filter(n => !n.read).length;
    return { success: true, data: { notifications, unreadCount } };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  async create(
    userId: string,
    title: string,
    message: string,
    type = 'info',
    link?: string,
  ) {
    return this.prisma.notification.create({
      data: { userId, title, message, type, link: link ?? null },
    });
  }
}
