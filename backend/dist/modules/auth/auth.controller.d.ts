import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto): Promise<{
        success: boolean;
        token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
        };
    }>;
    login(dto: LoginDto): Promise<{
        success: boolean;
        token: string;
        user: {
            id: string;
            email: string;
            name: string | null;
        };
    }>;
    getMe(user: AuthUser): Promise<{
        success: boolean;
        data: {
            name: string | null;
            id: string;
            email: string;
            createdAt: Date;
        } | null;
    }>;
}
