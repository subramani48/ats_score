import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
export interface GoogleProfile {
    id: string;
    displayName: string;
    emails: Array<{
        value: string;
        verified: boolean;
    }>;
    photos: Array<{
        value: string;
    }>;
}
declare const GoogleStrategy_base: new (...args: any[]) => Strategy;
export declare class GoogleStrategy extends GoogleStrategy_base {
    private readonly config;
    constructor(config: ConfigService);
    validate(_accessToken: string, _refreshToken: string, profile: GoogleProfile, done: VerifyCallback): Promise<void>;
}
export {};
