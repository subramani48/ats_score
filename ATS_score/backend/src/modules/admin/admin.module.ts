import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserNotificationsModule } from '../user-notifications/user-notifications.module';

@Module({
  imports: [UserNotificationsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
