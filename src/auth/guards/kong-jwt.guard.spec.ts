import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { KongJwtGuard } from './kong-jwt.guard';
import { UserRole } from './roles.guard';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

interface MockRequest {
  headers: Record<string, string | undefined>;
  user?: AuthenticatedUser;
}

describe('KongJwtGuard', () => {
  let guard: KongJwtGuard;

  const createMockContext = (
    headers: Record<string, string | undefined> = {},
  ): { context: ExecutionContext; request: MockRequest } => {
    const request: MockRequest = {
      headers: {
        'x-user-id': headers['x-user-id'],
        'x-user-email': headers['x-user-email'],
        'x-user-role': headers['x-user-role'],
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  beforeEach(() => {
    guard = new KongJwtGuard();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should extract user from headers and attach to request', () => {
    const { context, request } = createMockContext({
      'x-user-id': 'user_123',
      'x-user-email': 'test@example.com',
      'x-user-role': 'host',
    });

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      id: 'user_123',
      email: 'test@example.com',
      role: 'host',
    });
  });

  it('should throw UnauthorizedException when X-User-Id is missing', () => {
    const { context } = createMockContext({
      'x-user-email': 'test@example.com',
      'x-user-role': 'guest',
    });

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should default email to empty string when not provided', () => {
    const { context, request } = createMockContext({
      'x-user-id': 'user_123',
      'x-user-role': 'host',
    });

    guard.canActivate(context);

    expect(request.user?.email).toBe('');
  });

  it('should default role to GUEST when not provided', () => {
    const { context, request } = createMockContext({
      'x-user-id': 'user_123',
      'x-user-email': 'test@example.com',
    });

    guard.canActivate(context);

    expect(request.user?.role).toBe(UserRole.GUEST);
  });
});
