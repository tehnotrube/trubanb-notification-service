import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, filter } from 'rxjs';
import { map } from 'rxjs/operators';

interface NotificationEvent {
  userId: string;
  data: any;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private readonly notificationSubject = new Subject<NotificationEvent>();

  /**
   * Get an observable stream of notifications for a specific user
   * This is used by the SSE controller endpoint
   */
  getStreamForUser(userId: string): Observable<MessageEvent> {
    this.logger.log(`User ${userId} connected to SSE stream`);

    return this.notificationSubject.pipe(
      filter((event) => event.userId === userId),
      map((event) => {
        return {
          data: JSON.stringify(event.data),
        } as MessageEvent;
      }),
    );
  }

  /**
   * Send a notification to a specific user
   * Called by event handlers when new notifications are created
   */
  sendToUser(userId: string, notification: any): void {
    this.logger.debug(`Sending notification to user ${userId}`);
    this.notificationSubject.next({
      userId,
      data: notification,
    });
  }
}
