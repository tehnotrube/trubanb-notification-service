import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SseService } from '../sse';
import { NotificationType } from './enums/notification-type.enum';
import { Notification } from './schemas/notification.schema';
import type { AuthenticatedUser } from '../auth';
import { UserRole } from '../auth/guards/roles.guard';
import { Observable, of } from 'rxjs';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let mockNotificationsService: jest.Mocked<NotificationsService>;
  let mockSseService: jest.Mocked<SseService>;

  const mockUser: AuthenticatedUser = {
    id: 'user_1',
    email: 'test@example.com',
    role: UserRole.GUEST,
  };

  const mockNotification = (overrides = {}): Notification => ({
    userId: 'user_1',
    type: NotificationType.RESERVATION_REQUEST_CREATED,
    title: 'New Reservation Request',
    message: 'A guest wants to book your place.',
    data: {},
    read: false,
    eventId: 'evt_1',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            findAllForUser: jest.fn(),
            findById: jest.fn(),
            markAsRead: jest.fn(),
            markAllAsRead: jest.fn(),
            getUnreadCount: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: SseService,
          useValue: {
            getStreamForUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    mockNotificationsService = module.get(NotificationsService);
    mockSseService = module.get(SseService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('stream', () => {
    it('should return SSE stream for user', () => {
      const mockObservable = of({
        data: '{}',
      }) as Observable<MessageEvent>;
      mockSseService.getStreamForUser.mockReturnValue(mockObservable);

      const result = controller.stream(mockUser);

      expect(mockSseService.getStreamForUser).toHaveBeenCalledWith('user_1');
      expect(result).toBe(mockObservable);
    });
  });

  describe('findAll', () => {
    it('should return paginated notifications', async () => {
      const paginated = {
        items: [mockNotification()],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      mockNotificationsService.findAllForUser.mockResolvedValue(paginated);

      const result = await controller.findAll(mockUser, 1, 20, undefined);

      expect(mockNotificationsService.findAllForUser).toHaveBeenCalledWith(
        'user_1',
        1,
        20,
        undefined,
      );
      expect(result).toEqual(paginated);
    });

    it('should parse read param "true" as boolean true', async () => {
      const paginated = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockNotificationsService.findAllForUser.mockResolvedValue(paginated);

      await controller.findAll(mockUser, 1, 20, 'true');

      expect(mockNotificationsService.findAllForUser).toHaveBeenCalledWith(
        'user_1',
        1,
        20,
        true,
      );
    });

    it('should parse read param "false" as boolean false', async () => {
      const paginated = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      };
      mockNotificationsService.findAllForUser.mockResolvedValue(paginated);

      await controller.findAll(mockUser, 1, 20, 'false');

      expect(mockNotificationsService.findAllForUser).toHaveBeenCalledWith(
        'user_1',
        1,
        20,
        false,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count wrapped in object', async () => {
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(mockUser);

      expect(mockNotificationsService.getUnreadCount).toHaveBeenCalledWith(
        'user_1',
      );
      expect(result).toEqual({ count: 5 });
    });
  });

  describe('findOne', () => {
    it('should return a notification', async () => {
      const notification = mockNotification();
      mockNotificationsService.findById.mockResolvedValue(notification);

      const result = await controller.findOne(mockUser, 'notif_1');

      expect(mockNotificationsService.findById).toHaveBeenCalledWith('notif_1');
      expect(result).toEqual(notification);
    });

    it('should throw NotFoundException when notification does not exist', async () => {
      mockNotificationsService.findById.mockResolvedValue(null);

      await expect(controller.findOne(mockUser, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when notification belongs to another user', async () => {
      const notification = mockNotification({ userId: 'other_user' });
      mockNotificationsService.findById.mockResolvedValue(notification);

      await expect(controller.findOne(mockUser, 'notif_1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const updated = mockNotification({ read: true });
      mockNotificationsService.markAsRead.mockResolvedValue(updated);

      const result = await controller.markAsRead(mockUser, 'notif_1');

      expect(mockNotificationsService.markAsRead).toHaveBeenCalledWith(
        'notif_1',
        'user_1',
      );
      expect(result).toEqual(updated);
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockNotificationsService.markAsRead.mockResolvedValue(null);

      await expect(
        controller.markAsRead(mockUser, 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all as read and return count', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue(3);

      const result = await controller.markAllAsRead(mockUser);

      expect(mockNotificationsService.markAllAsRead).toHaveBeenCalledWith(
        'user_1',
      );
      expect(result).toEqual({ count: 3 });
    });
  });

  describe('delete', () => {
    it('should delete a notification', async () => {
      mockNotificationsService.delete.mockResolvedValue(true);

      const result = await controller.delete(mockUser, 'notif_1');

      expect(mockNotificationsService.delete).toHaveBeenCalledWith(
        'notif_1',
        'user_1',
      );
      expect(result).toEqual({ deleted: true });
    });

    it('should throw NotFoundException when notification not found', async () => {
      mockNotificationsService.delete.mockResolvedValue(false);

      await expect(controller.delete(mockUser, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
