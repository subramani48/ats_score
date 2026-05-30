import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly prisma;
    private readonly jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
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
    getMe(userId: string): Promise<{
        success: boolean;
        data: {
            name: string | null;
            id: string;
            email: string;
            createdAt: Date;
        } | null;
    }>;
    private signToken;
}
