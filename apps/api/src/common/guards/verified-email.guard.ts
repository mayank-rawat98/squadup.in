import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

/**
 * Blocks an action until the user's email is verified. `User.emailVerified` is
 * the canonical flag — it is written during email verification, during a
 * confirmed email change, and on Google login, so it reliably reflects whether
 * the address on the account has been proven.
 *
 * Reads `req.user`, which AuthMiddleware populates, so this guard only works on
 * authenticated routes. Nothing is gated on it yet; apply it with `@UseGuards`
 * on whichever routes should require a verified address.
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    if (!request.user?.emailVerified) {
      throw new ForbiddenException(
        'Please verify your email address to use this feature.',
      );
    }

    return true;
  }
}
