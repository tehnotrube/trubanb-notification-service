import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';
import { NotificationType } from './enums/notification-type.enum';
import { CreateNotificationDto } from './dto/create-notification.dto';

type JestMockModel<T> = jest.Mocked<Model<T>> & jest.Mock;

describe('NotificationsService', () => {
  let service: NotificationsService;
  let model: JestMockModel<Notification>;

  const mockNotification = (overrides = {}) => ({
    _id: 'notif_1',
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
    const mockModel = jest.fn().mockImplementation(function (
      this: Record<string, unknown>,
      dto: Record<string, unknown>,
    ) {
      Object.assign(this, dto);
      this.save = jest.fn().mockResolvedValue({ ...dto, _id: 'new_id' });
    });

    const chainableMock = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    Object.assign(mockModel, {
      findOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
      findById: jest.fn().mockReturnValue({ exec: jest.fn() }),
      find: jest.fn().mockReturnValue(chainableMock),
      findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
      countDocuments: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    model = module.get<JestMockModel<Notification>>(
      getModelToken(Notification.name),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateNotificationDto = {
      userId: 'user_1',
      type: NotificationType.RESERVATION_REQUEST_CREATED,
      title: 'New Reservation Request',
      message: 'A guest wants to book your place.',
      eventId: 'evt_1',
    };

    it('should create a new notification', async () => {
      const savedDoc = mockNotification();
      model.mockImplementation(function (
        this: Record<string, unknown>,
        data: Record<string, unknown>,
      ) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue(savedDoc);
      });
      // findOne is called with query object, returns null (no duplicate)
      (model.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.create(dto);

      expect(model.findOne).toHaveBeenCalledWith({
        eventId: 'evt_1',
        userId: 'user_1',
      });
      expect(result).toEqual(savedDoc);
    });

    it('should return existing notification if eventId already exists (idempotency)', async () => {
      const existing = mockNotification();
      (model.findOne as jest.Mock).mockResolvedValue(existing);

      const result = await service.create(dto);

      expect(model.findOne).toHaveBeenCalledWith({
        eventId: 'evt_1',
        userId: 'user_1',
      });
      expect(result).toEqual(existing);
      // Should NOT have called the constructor to create a new document
    });

    it('should skip duplicate check when eventId is not provided', async () => {
      const dtoWithoutEventId: CreateNotificationDto = {
        userId: 'user_1',
        type: NotificationType.HOST_RATED,
        title: 'New Host Rating',
        message: 'You were rated!',
      };
      const savedDoc = mockNotification({ eventId: undefined });
      model.mockImplementation(function (
        this: Record<string, unknown>,
        data: Record<string, unknown>,
      ) {
        Object.assign(this, data);
        this.save = jest.fn().mockResolvedValue(savedDoc);
      });

      const result = await service.create(dtoWithoutEventId);

      expect(model.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(savedDoc);
    });
  });

  describe('findAllForUser', () => {
    it('should return paginated notifications for a user', async () => {
      const items = [mockNotification(), mockNotification({ _id: 'notif_2' })];
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(items),
      };
      (model.find as jest.Mock).mockReturnValue(chainable);
      (model.countDocuments as jest.Mock).mockResolvedValue(2);

      const result = await service.findAllForUser('user_1', 1, 20);

      expect(model.find).toHaveBeenCalledWith({ userId: 'user_1' });
      expect(chainable.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(chainable.skip).toHaveBeenCalledWith(0);
      expect(chainable.limit).toHaveBeenCalledWith(20);
      expect(result).toEqual({
        items,
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should filter by read status when readFilter is true', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (model.find as jest.Mock).mockReturnValue(chainable);
      (model.countDocuments as jest.Mock).mockResolvedValue(0);

      await service.findAllForUser('user_1', 1, 20, true);

      expect(model.find).toHaveBeenCalledWith({ userId: 'user_1', read: true });
      expect(model.countDocuments).toHaveBeenCalledWith({
        userId: 'user_1',
        read: true,
      });
    });

    it('should filter by read status when readFilter is false', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (model.find as jest.Mock).mockReturnValue(chainable);
      (model.countDocuments as jest.Mock).mockResolvedValue(0);

      await service.findAllForUser('user_1', 1, 20, false);

      expect(model.find).toHaveBeenCalledWith({
        userId: 'user_1',
        read: false,
      });
    });

    it('should calculate correct pagination offset', async () => {
      const chainable = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      (model.find as jest.Mock).mockReturnValue(chainable);
      (model.countDocuments as jest.Mock).mockResolvedValue(50);

      const result = await service.findAllForUser('user_1', 3, 10);

      expect(chainable.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(chainable.limit).toHaveBeenCalledWith(10);
      expect(result.totalPages).toBe(5); // Math.ceil(50/10)
    });
  });

  describe('findById', () => {
    it('should return a notification by id', async () => {
      const notification = mockNotification();
      (model.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(notification),
      });

      const result = await service.findById('notif_1');

      expect(model.findById).toHaveBeenCalledWith('notif_1');
      expect(result).toEqual(notification);
    });

    it('should return null when notification not found', async () => {
      (model.findById as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read', async () => {
      const updated = mockNotification({ read: true });
      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await service.markAsRead('notif_1', 'user_1');

      expect(model.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'notif_1', userId: 'user_1' },
        { read: true },
        { new: true },
      );
      expect(result).toEqual(updated);
    });

    it('should return null when notification not found', async () => {
      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.markAsRead('nonexistent', 'user_1');

      expect(result).toBeNull();
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all unread notifications as read and return count', async () => {
      (model.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 5 });

      const result = await service.markAllAsRead('user_1');

      expect(model.updateMany).toHaveBeenCalledWith(
        { userId: 'user_1', read: false },
        { read: true },
      );
      expect(result).toBe(5);
    });

    it('should return 0 when no unread notifications exist', async () => {
      (model.updateMany as jest.Mock).mockResolvedValue({ modifiedCount: 0 });

      const result = await service.markAllAsRead('user_1');

      expect(result).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return the count of unread notifications', async () => {
      (model.countDocuments as jest.Mock).mockResolvedValue(3);

      const result = await service.getUnreadCount('user_1');

      expect(model.countDocuments).toHaveBeenCalledWith({
        userId: 'user_1',
        read: false,
      });
      expect(result).toBe(3);
    });
  });

  describe('delete', () => {
    it('should delete a notification and return true', async () => {
      (model.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 1 });

      const result = await service.delete('notif_1', 'user_1');

      expect(model.deleteOne).toHaveBeenCalledWith({
        _id: 'notif_1',
        userId: 'user_1',
      });
      expect(result).toBe(true);
    });

    it('should return false when notification not found', async () => {
      (model.deleteOne as jest.Mock).mockResolvedValue({ deletedCount: 0 });

      const result = await service.delete('nonexistent', 'user_1');

      expect(result).toBe(false);
    });
  });
});
