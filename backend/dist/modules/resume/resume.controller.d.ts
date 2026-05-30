import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { UploadResumeDto } from './dto/upload-resume.dto';
import { AuthUser } from '../../common/decorators/current-user.decorator';
export declare class ResumeController {
    private readonly resumeService;
    constructor(resumeService: ResumeService);
    uploadAndEnqueue(file: Express.Multer.File | undefined, body: UploadResumeDto, user: AuthUser | null): Promise<{
        success: boolean;
        jobId: string;
        message: string;
    }>;
    getJobStatus(jobId: string): Promise<{
        success: boolean;
        jobId: string;
        state: import("bullmq").JobState | "unknown";
        progress: import("bullmq").JobProgress;
        result: any;
        failedReason: string | null;
    }>;
    streamJobProgress(jobId: string): Observable<MessageEvent>;
}
