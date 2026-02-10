import { Notification } from '../schemas/notification.schema';

export class PaginatedNotificationsDto {
  items: Notification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
