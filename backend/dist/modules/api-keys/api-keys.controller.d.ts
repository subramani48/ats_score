import { ApiKeysService } from './api-keys.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
declare class CreateKeyDto {
    name: string;
}
export declare class ApiKeysController {
    private readonly service;
    constructor(service: ApiKeysService);
    createKey(body: CreateKeyDto, user: AuthUser): Promise<{
        success: boolean;
        data: {
            id: string;
            key: string;
            name: string;
            createdAt: Date;
        };
    }>;
    listKeys(user: AuthUser): Promise<{
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
    revokeKey(id: string, user: AuthUser): Promise<{
        success: boolean;
    }>;
}
export {};
