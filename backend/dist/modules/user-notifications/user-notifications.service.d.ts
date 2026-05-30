import { PrismaService } from '../../prisma/prisma.service';
export declare class UserNotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getForUser(userId: string): Promise<{
        success: boolean;
        data: {
            notifications: {
                message: string;
                type: string;
                id: string;
                createdAt: Date;
                link: string | null;
                userId: string;
                title: string;
                read: boolean;
            }[];
            unreadCount: number;
        };
    }>;
    markAllRead(userId: string): Promise<{
        success: boolean;
    }>;
    create(userId: string, title: string, message: string, type?: string, link?: string): Promise<{
        message: string;
        type: string;
        id: string;
        createdAt: Date;
        link: string | null;
        userId: string;
        title: string;
        read: boolean;
    }>;
}
