import { Global, Module } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';

// Global (like PrismaModule) so any controller can check plan limits without importing this module.
@Global()
@Module({
  controllers: [SubscriptionController],
  providers:   [SubscriptionService],
  exports:     [SubscriptionService],
})
export class SubscriptionModule {}
