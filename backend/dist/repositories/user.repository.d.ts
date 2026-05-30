export declare const userRepository: {
    findById: (id: string) => import(".prisma/client").Prisma.Prisma__UserClient<{
        name: string | null;
        email: string;
        id: string;
        passwordHash: string | null;
        provider: string;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    findByEmail: (email: string) => import(".prisma/client").Prisma.Prisma__UserClient<{
        name: string | null;
        email: string;
        id: string;
        passwordHash: string | null;
        provider: string;
        createdAt: Date;
        updatedAt: Date;
    } | null, null, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    create: (data: {
        email: string;
        name?: string;
        passwordHash?: string;
        provider?: string;
    }) => Promise<{
        name: string | null;
        email: string;
        id: string;
        passwordHash: string | null;
        provider: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    upsertOAuth: (email: string, name: string, provider: string) => import(".prisma/client").Prisma.Prisma__UserClient<{
        name: string | null;
        email: string;
        id: string;
        passwordHash: string | null;
        provider: string;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import(".prisma/client").Prisma.PrismaClientOptions>;
    hashPassword: (plain: string) => Promise<string>;
    verifyPassword: (plain: string, hash: string) => Promise<boolean>;
};
