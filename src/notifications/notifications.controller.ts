import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { NotificationsService } from './notifications.service';
import { SseService } from '../sse';
import { KongJwtGuard, CurrentUser } from '../auth';
import type { AuthenticatedUser } from '../auth';

@Controller('api/notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly sseService: SseService,
  ) {}

  /**
   * SSE endpoint for real-time notifications
   * Connect via: new EventSource('/api/notifications/stream')
   */
  @Sse('stream')
  @UseGuards(KongJwtGuard)
  stream(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.sseService.getStreamForUser(user.id);
  }

  @Get()
  @UseGuards(KongJwtGuard)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('read') readParam?: string,
  ) {
    const readFilter = readParam !== undefined
      ? readParam === 'true'
      : undefined;
    return this.notificationsService.findAllForUser(user.id, page, limit, readFilter);
  }

  @Get('unread-count')
  @UseGuards(KongJwtGuard)
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notificationsService.getUnreadCount(user.id);
    return { count };
  }

  @Get(':id')
  @UseGuards(KongJwtGuard)
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const notification = await this.notificationsService.findById(id);
    if (!notification || notification.userId !== user.id) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  @Put(':id/read')
  @UseGuards(KongJwtGuard)
  async markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const notification = await this.notificationsService.markAsRead(id, user.id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    return notification;
  }

  @Put('read-all')
  @UseGuards(KongJwtGuard)
  async markAllAsRead(@CurrentUser() user: AuthenticatedUser) {
    const count = await this.notificationsService.markAllAsRead(user.id);
    return { count };
  }

  @Delete(':id')
  @UseGuards(KongJwtGuard)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    const deleted = await this.notificationsService.delete(id, user.id);
    if (!deleted) {
      throw new NotFoundException('Notification not found');
    }
    return { deleted: true };
  }
}
