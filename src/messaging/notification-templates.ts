import { NotificationType } from '../notifications';

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

interface NotificationTemplate {
  title: string | ((data: any) => string);
  message: (data: any) => string;
}

export const NOTIFICATION_TEMPLATES: Record<NotificationType, NotificationTemplate> = {
  [NotificationType.RESERVATION_REQUEST_CREATED]: {
    title: 'New Reservation Request',
    message: (data) =>
      `${data.guestName} has requested to book ${data.accommodationName} from ${formatDate(data.startDate)} to ${formatDate(data.endDate)}.`,
  },
  [NotificationType.RESERVATION_REQUEST_RESPONDED]: {
    title: (data) =>
      data.status === 'APPROVED' ? 'Reservation Approved' : 'Reservation Declined',
    message: (data) =>
      data.status === 'APPROVED'
        ? `Your reservation for ${data.accommodationName} has been approved! Check-in: ${formatDate(data.startDate)}, Check-out: ${formatDate(data.endDate)}.`
        : `Your reservation request for ${data.accommodationName} was declined.`,
  },
  [NotificationType.RESERVATION_CANCELLED]: {
    title: 'Reservation Cancelled',
    message: (data) =>
      `${data.guestName} has cancelled their reservation for ${data.accommodationName} (${formatDate(data.startDate)} - ${formatDate(data.endDate)}).`,
  },
  [NotificationType.HOST_RATED]: {
    title: 'New Host Rating',
    message: (data) =>
      `${data.guestName} rated you ${data.rating}/5 stars.${data.comment ? ` Comment: "${data.comment}"` : ''}`,
  },
  [NotificationType.ACCOMMODATION_RATED]: {
    title: 'New Accommodation Rating',
    message: (data) =>
      `${data.guestName} rated ${data.accommodationName} ${data.rating}/5 stars.${data.comment ? ` Comment: "${data.comment}"` : ''}`,
  },
};

export function getNotificationContent(
  type: NotificationType,
  data: any,
): { title: string; message: string } {
  const template = NOTIFICATION_TEMPLATES[type];
  return {
    title: typeof template.title === 'function' ? template.title(data) : template.title,
    message: template.message(data),
  };
}
