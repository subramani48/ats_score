import { UserNotificationsService } from './user-notifications.service';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class UserNotificationsController {
    private readonly service;
    constructor(service: UserNotificationsService);
    getNotifications(user: AuthUser): Promise<{
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
    markAllRead(user: AuthUser): Promise<{
        success: boolean;
    }>;
}
