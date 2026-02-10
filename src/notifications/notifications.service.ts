import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PaginatedNotificationsDto } from './dto/paginated-notifications.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    // Check for duplicate using eventId for idempotency
    if (dto.eventId) {
      const existing = await this.notificationModel.findOne({
        eventId: dto.eventId,
        userId: dto.userId,
      });

      if (existing) {
        this.logger.debug(
          `Notification with eventId ${dto.eventId} already exists for user ${dto.userId}`,
        );
        return existing;
      }
    }

    const notification = new this.notificationModel(dto);
    return notification.save();
  }

  async findAllForUser(
    userId: string,
    page = 1,
    limit = 20,
    readFilter?: boolean,
  ): Promise<PaginatedNotificationsDto> {
    const query: { userId: string; read?: boolean } = { userId };

    if (readFilter !== undefined) {
      query.read = readFilter;
    }

    const [items, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Notification | null> {
    return this.notificationModel.findById(id).exec();
  }

  async markAsRead(id: string, userId: string): Promise<Notification | null> {
    return this.notificationModel
      .findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true })
      .exec();
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, read: false },
      { read: true },
    );
    return result.modifiedCount;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, read: false });
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({ _id: id, userId });
    return result.deletedCount > 0;
  }
}
