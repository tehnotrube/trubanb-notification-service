import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import type { ClientGrpc } from '@nestjs/microservices';
import { Observable, firstValueFrom } from 'rxjs';
import { NotificationType } from '../notifications';

export type NotificationPreferences = Record<NotificationType, boolean>;

interface GetPreferencesRequest {
  userId: string;
}

interface GetPreferencesResponse {
  reservationRequestCreated: boolean;
  reservationRequestResponded: boolean;
  reservationCancelled: boolean;
  hostRated: boolean;
  accommodationRated: boolean;
}

interface UserGrpcService {
  getNotificationPreferences(
    data: GetPreferencesRequest,
  ): Observable<GetPreferencesResponse>;
}

@Injectable()
export class UserClientService implements OnModuleInit {
  private readonly logger = new Logger(UserClientService.name);
  private userService: UserGrpcService;

  constructor(
    @Inject('USER_PACKAGE')
    private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.userService = this.client.getService<UserGrpcService>('UserService');
  }

  async getNotificationPreferences(
    userId: string,
  ): Promise<NotificationPreferences | null> {
    try {
      const response = await firstValueFrom(
        this.userService.getNotificationPreferences({ userId }),
      );

      // Map gRPC response to NotificationPreferences
      return {
        [NotificationType.RESERVATION_REQUEST_CREATED]:
          response.reservationRequestCreated,
        [NotificationType.RESERVATION_REQUEST_RESPONDED]:
          response.reservationRequestResponded,
        [NotificationType.RESERVATION_CANCELLED]: response.reservationCancelled,
        [NotificationType.HOST_RATED]: response.hostRated,
        [NotificationType.ACCOMMODATION_RATED]: response.accommodationRated,
      } as NotificationPreferences;
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
