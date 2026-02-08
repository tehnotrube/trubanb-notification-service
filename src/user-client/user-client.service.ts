import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NotificationType } from '../notifications';

export type NotificationPreferences = Record<NotificationType, boolean>;

@Injectable()
export class UserClientService {
  private readonly logger = new Logger(UserClientService.name);
  private readonly userServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.userServiceUrl = this.configService.get<string>(
      'USER_SERVICE_URL',
      'http://localhost:3001',
    );
  }

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<NotificationPreferences>(
          `${this.userServiceUrl}/api/users/internal/${userId}/preferences`,
          { timeout: 5000 },
        ),
      );
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch notification preferences for user ${userId}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
      // Return null to indicate we couldn't fetch preferences
      // Caller should default to sending notification
      return null;
    }
  }

  async isNotificationEnabled(
    userId: string,
    notificationType: NotificationType,
  ): Promise<boolean> {
    const preferences = await this.getNotificationPreferences(userId);

    // If we can't fetch preferences, default to enabled
    if (!preferences) {
      return true;
    }

    // If specific preference doesn't exist, default to enabled
    return preferences[notificationType] ?? true;
  }
}
