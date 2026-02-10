import { NotificationType } from '../notifications';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export interface NotificationData {
  guestName?: string;
  accommodationName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  rating?: number;
  comment?: string;
}

interface NotificationTemplate {
  title: string | ((data: NotificationData) => string);
  message: (data: NotificationData) => string;
}

export const NOTIFICATION_TEMPLATES: Record<
  NotificationType,
  NotificationTemplate
> = {
  [NotificationType.RESERVATION_REQUEST_CREATED]: {
    title: 'New Reservation Request',
    message: (data) =>
      `${data.guestName ?? 'A guest'} has requested to book ${data.accommodationName ?? 'your accommodation'} from ${formatDate(data.startDate ?? '')} to ${formatDate(data.endDate ?? '')}.`,
  },
  [NotificationType.RESERVATION_REQUEST_RESPONDED]: {
    title: (data) =>
      data.status === 'APPROVED'
        ? 'Reservation Approved'
        : 'Reservation Declined',
    message: (data) =>
      data.status === 'APPROVED'
        ? `Your reservation for ${data.accommodationName ?? 'the accommodation'} has been approved! Check-in: ${formatDate(data.startDate ?? '')}, Check-out: ${formatDate(data.endDate ?? '')}.`
        : `Your reservation request for ${data.accommodationName ?? 'the accommodation'} was declined.`,
  },
  [NotificationType.RESERVATION_CANCELLED]: {
    title: 'Reservation Cancelled',
    message: (data) =>
      `${data.guestName ?? 'A guest'} has cancelled their reservation for ${data.accommodationName ?? 'your accommodation'} (${formatDate(data.startDate ?? '')} - ${formatDate(data.endDate ?? '')}).`,
  },
  [NotificationType.HOST_RATED]: {
    title: 'New Host Rating',
    message: (data) =>
      `${data.guestName ?? 'A guest'} rated you ${data.rating ?? 0}/5 stars.${data.comment ? ` Comment: "${data.comment}"` : ''}`,
  },
  [NotificationType.ACCOMMODATION_RATED]: {
    title: 'New Accommodation Rating',
    message: (data) =>
      `${data.guestName ?? 'A guest'} rated ${data.accommodationName ?? 'your accommodation'} ${data.rating ?? 0}/5 stars.${data.comment ? ` Comment: "${data.comment}"` : ''}`,
  },
};

export function getNotificationContent(
  type: NotificationType,
  data: NotificationData,
): { title: string; message: string } {
  const template = NOTIFICATION_TEMPLATES[type];
  return {
    title:
      typeof template.title === 'function'
        ? template.title(data)
        : template.title,
    message: template.message(data),
  };
}
