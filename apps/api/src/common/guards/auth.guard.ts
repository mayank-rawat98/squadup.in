import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../decorators/constants/decorators.constant';

/**
 * User-realm authorization: a route is either public or requires an
 * authenticated customer. There are no roles here — every user is equivalent.
 *
 * Administrative capability lives entirely in the staff realm (StaffGuard +
 * StaffAuthMiddleware); nothing in the customer realm can grant it.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    return Boolean(request.auth);
  }
}
