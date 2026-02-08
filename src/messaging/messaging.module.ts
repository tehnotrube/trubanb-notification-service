import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationEventsHandler } from './handlers/notification-events.handler';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserClientModule } from '../user-client/user-client.module';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          { name: 'trubanb.notifications', type: 'topic' },
        ],
        uri: configService.get<string>(
          'RABBITMQ_URL',
          'amqp://guest:guest@localhost:5672',
        ),
        connectionInitOptions: { wait: true },
        enableControllerDiscovery: true,
      }),
    }),
    NotificationsModule,
    UserClientModule,
  ],
  controllers: [NotificationEventsHandler],
})
export class MessagingModule {}
