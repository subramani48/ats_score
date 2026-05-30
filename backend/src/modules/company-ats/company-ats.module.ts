import { Module } from '@nestjs/common';
import { CompanyAtsController } from './company-ats.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [CompanyAtsController],
})
export class CompanyAtsModule {}
