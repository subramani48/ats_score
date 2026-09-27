import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyStrategy } from './api-key.strategy';

@Module({
  controllers: [ApiKeysController],
  providers: [ApiKeysService, ApiKeyStrategy],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
