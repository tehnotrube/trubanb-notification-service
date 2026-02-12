import { getNotificationContent } from './notification-templates';
import { NotificationType } from '../notifications/enums/notification-type.enum';

describe('Notification Templates', () => {
  describe('getNotificationContent', () => {
    describe('RESERVATION_REQUEST_CREATED', () => {
      it('should return correct title and message', () => {
        const result = getNotificationContent(
          NotificationType.RESERVATION_REQUEST_CREATED,
          {
            guestName: 'John Doe',
            accommodationName: 'Beach House',
            startDate: '2025-06-01',
            endDate: '2025-06-07',
          },
        );

        expect(result.title).toBe('New Reservation Request');
        expect(result.message).toContain('John Doe');
        expect(result.message).toContain('Beach House');
      });

      it('should use fallback text when optional fields are missing', () => {
        const result = getNotificationContent(
          NotificationType.RESERVATION_REQUEST_CREATED,
          {},
        );

        expect(result.title).toBe('New Reservation Request');
        expect(result.message).toContain('A guest');
        expect(result.message).toContain('your accommodation');
      });
    });

    describe('RESERVATION_REQUEST_RESPONDED', () => {
      it('should return "Reservation Approved" title when status is APPROVED', () => {
        const result = getNotificationContent(
          NotificationType.RESERVATION_REQUEST_RESPONDED,
          {
            status: 'APPROVED',
            accommodationName: 'Beach House',
            startDate: '2025-06-01',
            endDate: '2025-06-07',
          },
        );

        expect(result.title).toBe('Reservation Approved');
        expect(result.message).toContain('approved');
        expect(result.message).toContain('Beach House');
      });

      it('should return "Reservation Declined" title when status is REJECTED', () => {
        const result = getNotificationContent(
          NotificationType.RESERVATION_REQUEST_RESPONDED,
          {
            status: 'REJECTED',
            accommodationName: 'Beach House',
          },
        );

        expect(result.title).toBe('Reservation Declined');
        expect(result.message).toContain('declined');
      });
    });

    describe('RESERVATION_CANCELLED', () => {
      it('should return correct title and message', () => {
        const result = getNotificationContent(
          NotificationType.RESERVATION_CANCELLED,
          {
            guestName: 'Jane Smith',
            accommodationName: 'Mountain Cabin',
            startDate: '2025-07-10',
            endDate: '2025-07-15',
          },
        );

        expect(result.title).toBe('Reservation Cancelled');
        expect(result.message).toContain('Jane Smith');
        expect(result.message).toContain('Mountain Cabin');
      });
    });

    describe('HOST_RATED', () => {
      it('should include rating score and comment', () => {
        const result = getNotificationContent(NotificationType.HOST_RATED, {
          guestName: 'John Doe',
          rating: 5,
          comment: 'Amazing host!',
        });

        expect(result.title).toBe('New Host Rating');
        expect(result.message).toContain('John Doe');
        expect(result.message).toContain('5/5');
        expect(result.message).toContain('Amazing host!');
      });

      it('should handle missing comment', () => {
        const result = getNotificationContent(NotificationType.HOST_RATED, {
          guestName: 'John Doe',
          rating: 4,
        });

        expect(result.message).toContain('4/5');
        expect(result.message).not.toContain('Comment');
      });

      it('should use fallback when guest name is missing', () => {
        const result = getNotificationContent(NotificationType.HOST_RATED, {
          rating: 3,
        });

        expect(result.message).toContain('A guest');
      });
    });

    describe('ACCOMMODATION_RATED', () => {
      it('should include accommodation name, rating, and comment', () => {
        const result = getNotificationContent(
          NotificationType.ACCOMMODATION_RATED,
          {
            guestName: 'Jane Smith',
            accommodationName: 'Beach House',
            rating: 4,
            comment: 'Great views!',
          },
        );

        expect(result.title).toBe('New Accommodation Rating');
        expect(result.message).toContain('Jane Smith');
        expect(result.message).toContain('Beach House');
        expect(result.message).toContain('4/5');
        expect(result.message).toContain('Great views!');
      });

      it('should handle missing comment', () => {
        const result = getNotificationContent(
          NotificationType.ACCOMMODATION_RATED,
          {
            guestName: 'Jane Smith',
            accommodationName: 'Beach House',
            rating: 5,
          },
        );

        expect(result.message).not.toContain('Comment');
      });
    });
  });
});
