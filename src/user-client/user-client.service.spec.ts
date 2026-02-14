import { Test, TestingModule } from '@nestjs/testing';
import { UserClientService } from './user-client.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { of, throwError } from 'rxjs';

describe('UserClientService', () => {
  let service: UserClientService;
  let mockUserGrpcService: {
    getNotificationPreferences: jest.Mock;
  };

  const mockGrpcClient = {
    getService: jest.fn(),
  };

  beforeEach(async () => {
    mockUserGrpcService = {
      getNotificationPreferences: jest.fn(),
    };
    mockGrpcClient.getService.mockReturnValue(mockUserGrpcService);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserClientService,
        {
          provide: 'USER_PACKAGE',
          useValue: mockGrpcClient,
        },
      ],
    }).compile();

    service = module.get<UserClientService>(UserClientService);
    service.onModuleInit(); // manually trigger to set up gRPC service

    jest.clearAllMocks();
    // Re-setup after clearAllMocks since onModuleInit already ran
    mockGrpcClient.getService.mockReturnValue(mockUserGrpcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getNotificationPreferences', () => {
    it('should return mapped notification preferences', async () => {
      mockUserGrpcService.getNotificationPreferences.mockReturnValue(
        of({
          reservationRequestCreated: true,
          reservationRequestResponded: false,
          reservationCancelled: true,
          hostRated: true,
          accommodationRated: false,
        }),
      );

      const result = await service.getNotificationPreferences('user_1');

      expect(result).toEqual({
        [NotificationType.RESERVATION_REQUEST_CREATED]: true,
        [NotificationType.RESERVATION_REQUEST_RESPONDED]: false,
        [NotificationType.RESERVATION_CANCELLED]: true,
        [NotificationType.HOST_RATED]: true,
        [NotificationType.ACCOMMODATION_RATED]: false,
      });
    });

    it('should return null when gRPC call fails', async () => {
      mockUserGrpcService.getNotificationPreferences.mockReturnValue(
        throwError(() => new Error('gRPC connection refused')),
      );

      const result = await service.getNotificationPreferences('user_1');

      expect(result).toBeNull();
    });
  });

  describe('isNotificationEnabled', () => {
    it('should return true when notification type is enabled', async () => {
      mockUserGrpcService.getNotificationPreferences.mockReturnValue(
        of({
          reservationRequestCreated: true,
          reservationRequestResponded: true,
          reservationCancelled: true,
          hostRated: true,
          accommodationRated: true,
        }),
      );

      const result = await service.isNotificationEnabled(
        'user_1',
        NotificationType.RESERVATION_REQUEST_CREATED,
      );

      expect(result).toBe(true);
    });

    it('should return false when notification type is disabled', async () => {
      mockUserGrpcService.getNotificationPreferences.mockReturnValue(
        of({
          reservationRequestCreated: false,
          reservationRequestResponded: true,
          reservationCancelled: true,
          hostRated: true,
          accommodationRated: true,
        }),
      );

      const result = await service.isNotificationEnabled(
        'user_1',
        NotificationType.RESERVATION_REQUEST_CREATED,
      );

      expect(result).toBe(false);
    });

    it('should default to true when preferences cannot be fetched', async () => {
      mockUserGrpcService.getNotificationPreferences.mockReturnValue(
        throwError(() => new Error('Service unavailable')),
      );

      const result = await service.isNotificationEnabled(
        'user_1',
        NotificationType.HOST_RATED,
      );

      expect(result).toBe(true);
    });
  });
});
