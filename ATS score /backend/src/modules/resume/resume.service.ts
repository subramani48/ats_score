import { Injectable, BadRequestException } from '@nestjs/common';
import { QueueService } from '../queue/queue.service';
import type { AnalysisJobPayload } from '../../types';
import type { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';

@Injectable()
export class ResumeService {
  constructor(private readonly queueService: QueueService) {}

  async enqueue(payload: AnalysisJobPayload, mode?: 'analyze' | 'rewrite'): Promise<string> {
    if (mode === 'rewrite' && !payload.jobDescription?.trim()) {
      throw new BadRequestException('Job description is required for rewrite mode');
    }
    return this.queueService.enqueue(payload);
  }

  getJobStatus(jobId: string) {
    return this.queueService.getJobStatus(jobId);
  }

  streamProgress(jobId: string): Observable<MessageEvent> {
    return this.queueService.createProgressStream(jobId);
  }
}
