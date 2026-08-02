import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Staff } from '../entities/staff.entity';

/**
 * The authenticated staff record. StaffAuthMiddleware has already loaded it, so
 * the throw here is a guard against a route being mounted outside the staff
 * realm by mistake — not an expected runtime path.
 */
export const CurrentStaff = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Staff => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.staff) {
      throw new UnauthorizedException('Unauthorized Access');
    }
    return request.staff;
  },
);

/** The session identifiers (staffId, deviceId, tokenJti) for the current request. */
export const StaffAuth = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.staffAuth) {
      throw new UnauthorizedException('Unauthorized Access');
    }
    return request.staffAuth;
  },
);
