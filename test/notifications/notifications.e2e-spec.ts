import request from 'supertest';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { App } from 'supertest/types';
import { app } from '../utils/setup-tests';
import { Notification } from '../../src/notifications/schemas/notification.schema';
import { NotificationType } from '../../src/notifications/enums/notification-type.enum';
import {
  TEST_GUEST_TOKEN_HEADERS,
  TEST_HOST_TOKEN_HEADERS,
} from '../utils/auth/headers.utils';
import { PaginatedNotificationsDto } from '../../src/notifications/dto/paginated-notifications.dto';

interface NotificationResponse {
  _id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
}

interface CountResponse {
  count: number;
}

interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
}

describe('Notifications E2E (MongoDB)', () => {
  let notificationModel: Model<Notification>;

  const GUEST_ID = TEST_GUEST_TOKEN_HEADERS['x-user-id'];
  const HOST_ID = TEST_HOST_TOKEN_HEADERS['x-user-id'];

  beforeAll(() => {
    notificationModel = app.get(getModelToken(Notification.name));
  });

  beforeEach(async () => {
    await notificationModel.deleteMany({});
    jest.clearAllMocks();
  });

  // Helper to seed notifications
  const seedNotification = async (overrides = {}) => {
    const doc = await notificationModel.create({
      userId: GUEST_ID,
      type: NotificationType.RESERVATION_REQUEST_CREATED,
      title: 'Test Notification',
      message: 'Test message',
      data: {},
      read: false,
      eventId: `evt_${Date.now()}_${Math.random()}`,
      ...overrides,
    });
    return doc;
  };

  describe('GET /api/notifications', () => {
    it('should return paginated notifications for the authenticated user', async () => {
      await seedNotification({ userId: GUEST_ID });
      await seedNotification({ userId: GUEST_ID, eventId: 'evt_2' });
      // This one belongs to another user, should not appear
      await seedNotification({ userId: HOST_ID, eventId: 'evt_3' });

      const res = await request(app.getHttpServer() as App)
        .get('/api/notifications')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as PaginatedNotificationsDto;
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
    });

    it('should respect pagination parameters', async () => {
      for (let i = 0; i < 5; i++) {
        await seedNotification({ userId: GUEST_ID, eventId: `evt_page_${i}` });
      }

      const res = await request(app.getHttpServer() as App)
        .get('/api/notifications?page=2&limit=2')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as PaginatedNotificationsDto;
      expect(body.items).toHaveLength(2);
      expect(body.total).toBe(5);
      expect(body.page).toBe(2);
      expect(body.limit).toBe(2);
      expect(body.totalPages).toBe(3);
    });

    it('should filter by read=true', async () => {
      await seedNotification({
        userId: GUEST_ID,
        read: true,
        eventId: 'evt_read',
      });
      await seedNotification({
        userId: GUEST_ID,
        read: false,
        eventId: 'evt_unread',
      });

      const res = await request(app.getHttpServer() as App)
        .get('/api/notifications?read=true')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as PaginatedNotificationsDto;
      expect(body.items).toHaveLength(1);
      expect(body.items[0].read).toBe(true);
    });

    it('should filter by read=false', async () => {
      await seedNotification({
        userId: GUEST_ID,
        read: true,
        eventId: 'evt_read',
      });
      await seedNotification({
        userId: GUEST_ID,
        read: false,
        eventId: 'evt_unread',
      });

      const res = await request(app.getHttpServer() as App)
        .get('/api/notifications?read=false')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as PaginatedNotificationsDto;
      expect(body.items).toHaveLength(1);
      expect(body.items[0].read).toBe(false);
    });

    it('should return 401 without auth headers', async () => {
      await request(app.getHttpServer() as App)
        .get('/api/notifications')
        .expect(401);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return the count of unread notifications', async () => {
      await seedNotification({
        userId: GUEST_ID,
        read: false,
        eventId: 'evt_u1',
      });
      await seedNotification({
        userId: GUEST_ID,
        read: false,
        eventId: 'evt_u2',
      });
      await seedNotification({
        userId: GUEST_ID,
        read: true,
        eventId: 'evt_r1',
      });

      const res = await request(app.getHttpServer() as App)
        .get('/api/notifications/unread-count')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as CountResponse;
      expect(body.count).toBe(2);
    });

    it('should return 0 when no unread notifications', async () => {
      await seedNotification({
        userId: GUEST_ID,
        read: true,
        eventId: 'evt_r',
      });

      const res = await request(app.getHttpServer() as App)
        .get('/api/notifications/unread-count')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as CountResponse;
      expect(body.count).toBe(0);
    });

    it('should return 401 without auth headers', async () => {
      await request(app.getHttpServer() as App)
        .get('/api/notifications/unread-count')
        .expect(401);
    });
  });

  describe('GET /api/notifications/:id', () => {
    it('should return a notification by id', async () => {
      const notif = await seedNotification({ userId: GUEST_ID });

      const res = await request(app.getHttpServer() as App)
        .get(`/api/notifications/${String(notif._id)}`)
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as NotificationResponse;
      expect(body._id).toBe(String(notif._id));
      expect(body.title).toBe('Test Notification');
    });

    it('should return 404 when notification belongs to another user', async () => {
      const notif = await seedNotification({ userId: HOST_ID });

      await request(app.getHttpServer() as App)
        .get(`/api/notifications/${String(notif._id)}`)
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(404);
    });

    it('should return 404 for non-existent id', async () => {
      await request(app.getHttpServer() as App)
        .get('/api/notifications/000000000000000000000000')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(404);
    });

    it('should return 401 without auth headers', async () => {
      await request(app.getHttpServer() as App)
        .get('/api/notifications/some-id')
        .expect(401);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notif = await seedNotification({ userId: GUEST_ID, read: false });

      const res = await request(app.getHttpServer() as App)
        .put(`/api/notifications/${String(notif._id)}/read`)
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as NotificationResponse;
      expect(body.read).toBe(true);

      // Verify in database
      const saved = await notificationModel.findById(notif._id);
      expect(saved?.read).toBe(true);
    });

    it('should return 404 when notification belongs to another user', async () => {
      const notif = await seedNotification({ userId: HOST_ID });

      await request(app.getHttpServer() as App)
        .put(`/api/notifications/${String(notif._id)}/read`)
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(404);
    });

    it('should return 404 for non-existent notification', async () => {
      await request(app.getHttpServer() as App)
        .put('/api/notifications/000000000000000000000000/read')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(404);
    });
  });

  describe('PUT /api/notifications/read-all', () => {
    it('should mark all notifications as read and return count', async () => {
      await seedNotification({
        userId: GUEST_ID,
        read: false,
        eventId: 'evt_a1',
      });
      await seedNotification({
        userId: GUEST_ID,
        read: false,
        eventId: 'evt_a2',
      });
      await seedNotification({
        userId: GUEST_ID,
        read: true,
        eventId: 'evt_a3',
      });

      const res = await request(app.getHttpServer() as App)
        .put('/api/notifications/read-all')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as CountResponse;
      expect(body.count).toBe(2);

      // Verify all are now read in database
      const unread = await notificationModel.countDocuments({
        userId: GUEST_ID,
        read: false,
      });
      expect(unread).toBe(0);
    });

    it('should return 0 when no unread notifications', async () => {
      const res = await request(app.getHttpServer() as App)
        .put('/api/notifications/read-all')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      const body = res.body as CountResponse;
      expect(body.count).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      const notif = await seedNotification({ userId: GUEST_ID });

      await request(app.getHttpServer() as App)
        .delete(`/api/notifications/${String(notif._id)}`)
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(200);

      // Verify deleted from database
      const deleted = await notificationModel.findById(notif._id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when notification belongs to another user', async () => {
      const notif = await seedNotification({ userId: HOST_ID });

      await request(app.getHttpServer() as App)
        .delete(`/api/notifications/${String(notif._id)}`)
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(404);
    });

    it('should return 404 for non-existent notification', async () => {
      await request(app.getHttpServer() as App)
        .delete('/api/notifications/000000000000000000000000')
        .set(TEST_GUEST_TOKEN_HEADERS)
        .expect(404);
    });
  });

  describe('GET /api/notifications/health', () => {
    it('should return health status without auth', async () => {
      const res = await request(app.getHttpServer() as App)
        .get('/api/notifications/health')
        .expect(200);

      const body = res.body as HealthResponse;
      expect(body.status).toBe('ok');
      expect(body.service).toBe('notification-service');
      expect(body.timestamp).toBeDefined();
    });
  });
});
