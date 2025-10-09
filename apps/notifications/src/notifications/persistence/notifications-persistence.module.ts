import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Notification } from '../notification.entity';
import { NotificationsPersistenceService } from './notifications-persistence.service';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsPersistenceService],
  exports: [NotificationsPersistenceService],
})
export class NotificationsPersistenceModule {}
