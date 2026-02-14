import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard, UserRole } from './roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockContext = (userRole?: UserRole): ExecutionContext => {
    const request = {
      user: userRole ? { role: userRole } : undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;

    guard = new RolesGuard(reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    const result = guard.canActivate(createMockContext(UserRole.GUEST));

    expect(result).toBe(true);
  });

  it('should allow access when user has required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.HOST]);

    const result = guard.canActivate(createMockContext(UserRole.HOST));

    expect(result).toBe(true);
  });

  it('should allow access when user has one of multiple required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      UserRole.HOST,
      UserRole.ADMIN,
    ]);

    const result = guard.canActivate(createMockContext(UserRole.ADMIN));

    expect(result).toBe(true);
  });

  it('should throw ForbiddenException when user does not have required role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(createMockContext(UserRole.GUEST))).toThrow(
      ForbiddenException,
    );
  });

  it('should throw ForbiddenException when user role is not found on request', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.HOST]);

    expect(() => guard.canActivate(createMockContext())).toThrow(
      ForbiddenException,
    );
  });

  it('should perform case-insensitive role matching', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.HOST]);

    // Create context with uppercase role
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { role: 'HOST' } }),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;

    const result = guard.canActivate(context);

    expect(result).toBe(true);
  });
});
