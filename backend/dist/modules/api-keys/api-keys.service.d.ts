import { PrismaService } from '../../prisma/prisma.service';
export declare class ApiKeysService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createKey(userId: string, name: string): Promise<{
        success: boolean;
        data: {
            id: string;
            key: string;
            name: string;
            createdAt: Date;
        };
    }>;
    listKeys(userId: string): Promise<{
        success: boolean;
        data: {
            key: string;
            name: string;
            id: string;
            createdAt: Date;
            isActive: boolean;
            usageCount: number;
            lastUsed: Date | null;
        }[];
    }>;
    revokeKey(userId: string, keyId: string): Promise<{
        success: boolean;
    }>;
}
