import { Controller, Get } from '@nestjs/common';

@Controller('api/notifications/health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'notification-service',
      timestamp: new Date().toISOString(),
    };
  }
}
