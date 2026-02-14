import { SseService } from './sse.service';
import { Notification } from '../notifications/schemas/notification.schema';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { firstValueFrom, take, toArray } from 'rxjs';

describe('SseService', () => {
  let service: SseService;

  const mockNotification: Partial<Notification> = {
    userId: 'user_1',
    type: NotificationType.RESERVATION_REQUEST_CREATED,
    title: 'New Reservation Request',
    message: 'A guest wants to book your place.',
    data: {},
    read: false,
    eventId: 'evt_1',
  };

  beforeEach(() => {
    service = new SseService();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStreamForUser', () => {
    it('should return an observable', () => {
      const stream = service.getStreamForUser('user_1');
      expect(stream).toBeDefined();
      expect(stream.subscribe).toBeDefined();
    });
  });

  describe('sendToUser', () => {
    it('should emit notification to the correct user stream', async () => {
      const stream = service.getStreamForUser('user_1');

      const eventPromise = firstValueFrom(stream.pipe(take(1)));

      service.sendToUser('user_1', mockNotification as Notification);

      const event = await eventPromise;
      expect(event).toEqual({
        data: JSON.stringify(mockNotification),
      });
    });

    it('should not emit to a different user stream', (done) => {
      const user2Stream = service.getStreamForUser('user_2');
      let received = false;

      const subscription = user2Stream.subscribe(() => {
        received = true;
      });

      service.sendToUser('user_1', mockNotification as Notification);

      // Give a small window for the event to potentially arrive
      setTimeout(() => {
        expect(received).toBe(false);
        subscription.unsubscribe();
        done();
      }, 50);
    });

    it('should emit to multiple subscribers of the same user', async () => {
      const stream1 = service.getStreamForUser('user_1');
      const stream2 = service.getStreamForUser('user_1');

      const promise1 = firstValueFrom(stream1.pipe(take(1)));
      const promise2 = firstValueFrom(stream2.pipe(take(1)));

      service.sendToUser('user_1', mockNotification as Notification);

      const [event1, event2] = await Promise.all([promise1, promise2]);
      expect(event1).toEqual({ data: JSON.stringify(mockNotification) });
      expect(event2).toEqual({ data: JSON.stringify(mockNotification) });
    });

    it('should emit multiple notifications sequentially', async () => {
      const stream = service.getStreamForUser('user_1');

      const eventsPromise = firstValueFrom(stream.pipe(take(2), toArray()));

      const notif1 = { ...mockNotification, eventId: 'evt_1' } as Notification;
      const notif2 = { ...mockNotification, eventId: 'evt_2' } as Notification;

      service.sendToUser('user_1', notif1);
      service.sendToUser('user_1', notif2);

      const events = await eventsPromise;
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual({ data: JSON.stringify(notif1) });
      expect(events[1]).toEqual({ data: JSON.stringify(notif2) });
    });
  });
});
