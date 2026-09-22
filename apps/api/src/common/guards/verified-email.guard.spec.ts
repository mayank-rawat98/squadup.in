import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { VerifiedEmailGuard } from './verified-email.guard';

describe('VerifiedEmailGuard', () => {
  const guard = new VerifiedEmailGuard();

  const makeContext = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows the request when the email is verified', () => {
    expect(guard.canActivate(makeContext({ emailVerified: true }))).toBe(true);
  });

  it('blocks the request when the email is not verified', () => {
    expect(() =>
      guard.canActivate(makeContext({ emailVerified: false })),
    ).toThrow(ForbiddenException);
  });

  it('blocks the request when no user is present', () => {
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });
});
