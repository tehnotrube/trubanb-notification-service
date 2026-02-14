import { Test, TestingModule } from '@nestjs/testing';
import { NotificationEventsHandler } from './notification-events.handler';
import { NotificationsService } from '../../notifications/notifications.service';
import { UserClientService } from '../../user-client/user-client.service';
import { SseService } from '../../sse/sse.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';
import { Notification as NotificationSchema } from '../../notifications/schemas/notification.schema';
import type {
  ReservationRequestCreatedEvent,
  ReservationRequestRespondedEvent,
  ReservationCancelledEvent,
  HostRatedEvent,
  AccommodationRatedEvent,
} from '../events/notification-events';

describe('NotificationEventsHandler', () => {
  let handler: NotificationEventsHandler;
  let mockNotificationsService: jest.Mocked<NotificationsService>;
  let mockUserClientService: jest.Mocked<UserClientService>;
  let mockSseService: jest.Mocked<SseService>;

  const createdNotification: NotificationSchema = {
    userId: 'host_1',
    type: NotificationType.RESERVATION_REQUEST_CREATED,
    title: 'New Reservation Request',
    message: 'Test message',
    data: {},
    read: false,
    eventId: 'evt_1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationEventsHandler],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue(createdNotification),
          },
        },
        {
          provide: UserClientService,
          useValue: {
            isNotificationEnabled: jest.fn().mockResolvedValue(true),
          },
        },
        {
          provide: SseService,
          useValue: {
            sendToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    handler = module.get<NotificationEventsHandler>(NotificationEventsHandler);
    mockNotificationsService = module.get(NotificationsService);
    mockUserClientService = module.get(UserClientService);
    mockSseService = module.get(SseService);

    jest.clearAllMocks();
    // Re-set defaults after clearAllMocks
    mockUserClientService.isNotificationEnabled.mockResolvedValue(true);
    mockNotificationsService.create.mockResolvedValue(createdNotification);
  });

  describe('handleReservationRequestCreated', () => {
    const event: ReservationRequestCreatedEvent = {
      eventId: 'evt_1',
      eventType: 'reservation.request.created',
      timestamp: new Date().toISOString(),
      payload: {
        requestId: 'req_1',
        accommodationId: 'acc_1',
        accommodationName: 'Beach House',
        hostId: 'host_1',
        guestId: 'guest_1',
        guestName: 'John Doe',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
        numberOfGuests: 2,
        price: 500,
      },
    };

    it('should create notification and send SSE for host', async () => {
      await handler.handleReservationRequestCreated(event);

      expect(mockUserClientService.isNotificationEnabled).toHaveBeenCalledWith(
        'host_1',
        NotificationType.RESERVATION_REQUEST_CREATED,
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'host_1',
          type: NotificationType.RESERVATION_REQUEST_CREATED,
          eventId: 'evt_1',
          title: expect.any(String) as unknown as string,
          message: expect.any(String) as unknown as string,
        }),
      );
      expect(mockSseService.sendToUser).toHaveBeenCalledWith(
        'host_1',
        createdNotification,
      );
    });

    it('should not create notification when disabled for user', async () => {
      mockUserClientService.isNotificationEnabled.mockResolvedValue(false);

      await handler.handleReservationRequestCreated(event);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
      expect(mockSseService.sendToUser).not.toHaveBeenCalled();
    });

    it('should not throw when an error occurs (message not rejected)', async () => {
      mockNotificationsService.create.mockRejectedValue(
        new Error('DB connection failed'),
      );

      await expect(
        handler.handleReservationRequestCreated(event),
      ).resolves.not.toThrow();
    });
  });

  describe('handleReservationRequestResponded', () => {
    const event: ReservationRequestRespondedEvent = {
      eventId: 'evt_2',
      eventType: 'reservation.request.responded',
      timestamp: new Date().toISOString(),
      payload: {
        requestId: 'req_1',
        accommodationId: 'acc_1',
        accommodationName: 'Beach House',
        hostId: 'host_1',
        guestId: 'guest_1',
        status: 'APPROVED',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
      },
    };

    it('should create notification for guest (not host)', async () => {
      await handler.handleReservationRequestResponded(event);

      expect(mockUserClientService.isNotificationEnabled).toHaveBeenCalledWith(
        'guest_1',
        NotificationType.RESERVATION_REQUEST_RESPONDED,
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'guest_1',
          type: NotificationType.RESERVATION_REQUEST_RESPONDED,
          eventId: 'evt_2',
        }),
      );
    });

    it('should not create notification when disabled', async () => {
      mockUserClientService.isNotificationEnabled.mockResolvedValue(false);

      await handler.handleReservationRequestResponded(event);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleReservationCancelled', () => {
    const event: ReservationCancelledEvent = {
      eventId: 'evt_3',
      eventType: 'reservation.cancelled',
      timestamp: new Date().toISOString(),
      payload: {
        reservationId: 'res_1',
        accommodationId: 'acc_1',
        accommodationName: 'Beach House',
        hostId: 'host_1',
        guestId: 'guest_1',
        guestName: 'John Doe',
        startDate: '2025-06-01',
        endDate: '2025-06-07',
      },
    };

    it('should create notification for host', async () => {
      await handler.handleReservationCancelled(event);

      expect(mockUserClientService.isNotificationEnabled).toHaveBeenCalledWith(
        'host_1',
        NotificationType.RESERVATION_CANCELLED,
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'host_1',
          type: NotificationType.RESERVATION_CANCELLED,
          eventId: 'evt_3',
        }),
      );
      expect(mockSseService.sendToUser).toHaveBeenCalledWith(
        'host_1',
        createdNotification,
      );
    });

    it('should not create notification when disabled', async () => {
      mockUserClientService.isNotificationEnabled.mockResolvedValue(false);

      await handler.handleReservationCancelled(event);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleHostRated', () => {
    const event: HostRatedEvent = {
      eventId: 'evt_4',
      eventType: 'rating.host.created',
      timestamp: new Date().toISOString(),
      payload: {
        ratingId: 'rat_1',
        hostId: 'host_1',
        guestId: 'guest_1',
        guestName: 'John Doe',
        rating: 5,
        comment: 'Great host!',
      },
    };

    it('should create notification for host', async () => {
      await handler.handleHostRated(event);

      expect(mockUserClientService.isNotificationEnabled).toHaveBeenCalledWith(
        'host_1',
        NotificationType.HOST_RATED,
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'host_1',
          type: NotificationType.HOST_RATED,
          eventId: 'evt_4',
        }),
      );
      expect(mockSseService.sendToUser).toHaveBeenCalledWith(
        'host_1',
        createdNotification,
      );
    });

    it('should not create notification when disabled', async () => {
      mockUserClientService.isNotificationEnabled.mockResolvedValue(false);

      await handler.handleHostRated(event);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('handleAccommodationRated', () => {
    const event: AccommodationRatedEvent = {
      eventId: 'evt_5',
      eventType: 'rating.accommodation.created',
      timestamp: new Date().toISOString(),
      payload: {
        ratingId: 'rat_2',
        accommodationId: 'acc_1',
        accommodationName: 'Beach House',
        hostId: 'host_1',
        guestId: 'guest_1',
        guestName: 'John Doe',
        rating: 4,
        comment: 'Nice place!',
      },
    };

    it('should create notification for host', async () => {
      await handler.handleAccommodationRated(event);

      expect(mockUserClientService.isNotificationEnabled).toHaveBeenCalledWith(
        'host_1',
        NotificationType.ACCOMMODATION_RATED,
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'host_1',
          type: NotificationType.ACCOMMODATION_RATED,
          eventId: 'evt_5',
        }),
      );
      expect(mockSseService.sendToUser).toHaveBeenCalledWith(
        'host_1',
        createdNotification,
      );
    });

    it('should not create notification when disabled', async () => {
      mockUserClientService.isNotificationEnabled.mockResolvedValue(false);

      await handler.handleAccommodationRated(event);

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });

    it('should not throw when error occurs', async () => {
      mockNotificationsService.create.mockRejectedValue(
        new Error('Unexpected error'),
      );

      await expect(
        handler.handleAccommodationRated(event),
      ).resolves.not.toThrow();
    });
  });
});
