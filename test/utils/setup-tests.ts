import { Test } from '@nestjs/testing';
import {
  INestApplication,
  Logger,
  Module,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../../src/notifications/notifications.module';
import { HealthModule } from '../../src/health/health.module';
import { AuthModule } from '../../src/auth/auth.module';
import { SseModule } from '../../src/sse/sse.module';

/**
 * Test-only AppModule that excludes MessagingModule (RabbitMQ) and
 * MetricsModule (Prometheus) to avoid external dependency requirements.
 *
 * The RabbitMQModule.forRootAsync creates the AmqpConnection internally
 * and attempts to connect before provider overrides can take effect,
 * so we must exclude MessagingModule entirely rather than overriding.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/notificationsdb-test',
        ),
      }),
    }),
    HealthModule,
    AuthModule,
    SseModule,
    NotificationsModule,
  ],
})
class TestAppModule {}

export let app: INestApplication;

beforeAll(async () => {
  const moduleFixture = await Test.createTestingModule({
    imports: [TestAppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.useLogger(new Logger('E2E-TEST', { timestamp: true }));

  await app.init();
}, 120000);

afterAll(async () => {
  if (app) {
    await app.close();
  }
}, 30000);
