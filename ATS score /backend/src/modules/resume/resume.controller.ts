import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Sse,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { ResumeService } from './resume.service';
import { UploadResumeDto } from './dto/upload-resume.dto';
import { SubscriptionService } from '../subscription/subscription.service';
import { OptionalAuthGuard } from '../../common/guards/optional-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('resumes')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly subscription: SubscriptionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { ttl: 60 * 60 * 1000, limit: 15 } })
  @UseInterceptors(
    FileInterceptor('resume', {
      storage: memoryStorage(),
      limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB ?? '5', 10) * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ];
        cb(null, allowed.includes(file.mimetype));
      },
    }),
  )
  async uploadAndEnqueue(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() body: UploadResumeDto,
    @CurrentUser() user: AuthUser | null,
  ) {
    if (!file) throw new BadRequestException('Please upload a PDF or DOCX file');

    // Plan limit for logged-in users. Signed-out visitors have no plan; they are covered only by the
    // 15-uploads-per-hour limit above, which keeps the landing-page try-it flow open.
    if (user) await this.subscription.checkLimit(user.id, 'analysesPerMonth');

    const jobId = await this.resumeService.enqueue(
      {
        resumeBuffer: file.buffer.toString('base64'),
        mode: body.mode ?? 'analyze',
        domain: body.domain,
        jobDescription: body.jobDescription,
        userId: user?.id,
        name: body.name,
        email: body.email,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      },
      body.mode,
    );

    return {
      success: true,
      jobId,
      message: 'Analysis queued — connect to the SSE stream for real-time progress',
    };
  }

  // Progress routes are polled every few seconds while an analysis runs, so they are not rate limited.
  @SkipThrottle()
  @Get('jobs/:jobId/status')
  getJobStatus(@Param('jobId') jobId: string) {
    return this.resumeService.getJobStatus(jobId);
  }

  @SkipThrottle()
  @Sse('jobs/:jobId/stream')
  streamJobProgress(@Param('jobId') jobId: string): Observable<MessageEvent> {
    return this.resumeService.streamProgress(jobId);
  }
}
