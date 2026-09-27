import { Module } from '@nestjs/common';
import { BattleCardController } from './battle-card.controller';
import { BattleCardService } from './battle-card.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [BattleCardController],
  providers: [BattleCardService],
})
export class BattleCardModule {}
