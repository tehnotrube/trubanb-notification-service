import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Controller, Logger } from '@nestjs/common';
import { NotificationsService, NotificationType } from '../../notifications';
import { UserClientService } from '../../user-client';
import { SseService } from '../../sse';
import {
  getNotificationContent,
  NotificationData,
} from '../notification-templates';
import type {
  ReservationRequestCreatedEvent,
  ReservationRequestRespondedEvent,
  ReservationCancelledEvent,
  HostRatedEvent,
  AccommodationRatedEvent,
} from '../events/notification-events';

@Controller()
export class NotificationEventsHandler {
  private readonly logger = new Logger(NotificationEventsHandler.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly userClientService: UserClientService,
    private readonly sseService: SseService,
  ) {}

  @RabbitSubscribe({
    exchange: 'trubanb.notifications',
    routingKey: 'reservation.request.created',
    queue: 'notification.reservation.request.created',
  })
  async handleReservationRequestCreated(event: ReservationRequestCreatedEvent) {
    this.logger.log(
      `Received reservation request created event: ${event.eventId}`,
    );

    const hostId = event.payload.hostId;
    const notificationType = NotificationType.RESERVATION_REQUEST_CREATED;

    await this.createAndSendNotification(
      hostId,
      notificationType,
      event.payload,
      event.eventId,
    );
  }

  @RabbitSubscribe({
    exchange: 'trubanb.notifications',
    routingKey: 'reservation.request.responded',
    queue: 'notification.reservation.request.responded',
  })
  async handleReservationRequestResponded(
    event: ReservationRequestRespondedEvent,
  ) {
    this.logger.log(
      `Received reservation request responded event: ${event.eventId}`,
    );

    const guestId = event.payload.guestId;
    const notificationType = NotificationType.RESERVATION_REQUEST_RESPONDED;

    await this.createAndSendNotification(
      guestId,
      notificationType,
      event.payload,
      event.eventId,
    );
  }

  @RabbitSubscribe({
    exchange: 'trubanb.notifications',
    routingKey: 'reservation.cancelled',
    queue: 'notification.reservation.cancelled',
  })
  async handleReservationCancelled(event: ReservationCancelledEvent) {
    this.logger.log(`Received reservation cancelled event: ${event.eventId}`);

    const hostId = event.payload.hostId;
    const notificationType = NotificationType.RESERVATION_CANCELLED;

    await this.createAndSendNotification(
      hostId,
      notificationType,
      event.payload,
      event.eventId,
    );
  }

  @RabbitSubscribe({
    exchange: 'trubanb.notifications',
    routingKey: 'rating.host.created',
    queue: 'notification.rating.host.created',
  })
  async handleHostRated(event: HostRatedEvent) {
    this.logger.log(`Received host rated event: ${event.eventId}`);

    const hostId = event.payload.hostId;
    const notificationType = NotificationType.HOST_RATED;

    await this.createAndSendNotification(
      hostId,
      notificationType,
      event.payload,
      event.eventId,
    );
  }

  @RabbitSubscribe({
    exchange: 'trubanb.notifications',
    routingKey: 'rating.accommodation.created',
    queue: 'notification.rating.accommodation.created',
  })
  async handleAccommodationRated(event: AccommodationRatedEvent) {
    this.logger.log(`Received accommodation rated event: ${event.eventId}`);

    const hostId = event.payload.hostId;
    const notificationType = NotificationType.ACCOMMODATION_RATED;

    await this.createAndSendNotification(
      hostId,
      notificationType,
      event.payload,
      event.eventId,
    );
  }

  private async createAndSendNotification(
    userId: string,
    type: NotificationType,
    data: NotificationData,
    eventId: string,
  ): Promise<void> {
    try {
      // Check if notification is enabled for this user
      const isEnabled = await this.userClientService.isNotificationEnabled(
        userId,
        type,
      );

      if (!isEnabled) {
        this.logger.debug(
          `Notification type ${type} is disabled for user ${userId}`,
        );
        return;
      }

      // Get notification content from templates
      const { title, message } = getNotificationContent(type, data);

      // Create notification in database
      const notification = await this.notificationsService.create({
        userId,
        type,
        title,
        message,
        data,
        eventId,
      });

      this.logger.log(
        `Created notification for user ${userId}: ${notification.title}`,
      );

      // Send real-time notification via SSE
      this.sseService.sendToUser(userId, notification);
    } catch (error) {
      this.logger.error(
        `Failed to create notification for user ${userId}`,
        error instanceof Error ? error.stack : 'Unknown error',
      );
      // Don't throw - we don't want to reject the message
      // The notification will be missing but other processing can continue
    }
  }
}
