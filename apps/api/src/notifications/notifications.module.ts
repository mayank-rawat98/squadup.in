import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import {
  Notification,
  NotificationReceiver,
  UserNotificationPreferences,
  NotificationTemplate,
  EmailQueue,
} from './entities';

// Repositories
import { NotificationRepository } from './repositories';

// Services
import {
  NotificationService,
  NotificationPreferencesService,
  NotificationEmailService,
} from './services';

// Gateway
import { NotificationGateway } from './gateways/notification.gateway';

// Controller
import { NotificationController } from './controllers/notification.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      NotificationReceiver,
      UserNotificationPreferences,
      NotificationTemplate,
      EmailQueue,
    ]),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationRepository,
    NotificationService,
    NotificationPreferencesService,
    NotificationEmailService,
    NotificationGateway,
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationsModule {}
