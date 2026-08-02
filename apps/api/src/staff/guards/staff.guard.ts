import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../decorators/constants/decorators.constant';
import { StaffStatus } from '../entities/staff.entity';

/**
 * Authorizes staff-realm routes.
 *
 * There is a single role today, so an active staff principal is sufficient —
 * StaffAuthMiddleware has already proven the token and loaded the record. The
 * guard is still applied explicitly at each controller so that adding a
 * hierarchy later is a change inside this class, not a change at every route.
 *
 * `@Public()` is honoured because some staff-guarded controllers also expose
 * anonymous routes — public form submissions and changelog reads sit on the
 * same controller as the staff-only management routes.
 */
@Injectable()
export class StaffGuard implements CanActivate {
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
    return (
      Boolean(request.staff) && request.staff?.status === StaffStatus.ACTIVE
    );
  }
}
