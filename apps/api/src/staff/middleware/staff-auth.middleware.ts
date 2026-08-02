import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RedisService } from '../../redis/redis.service';
import { StaffStatus } from '../entities/staff.entity';
import { StaffJwtService } from '../services/staff-jwt.service';
import { StaffService } from '../services/staff.service';

/**
 * Resolves the staff principal for every ops-realm route and attaches it as
 * `req.staff` / `req.staffAuth`.
 *
 * This is the staff counterpart of AuthMiddleware and is mounted on a disjoint
 * set of controllers — the two realms never overlap on a route, so a customer
 * token is simply invalid here and vice versa.
 */
@Injectable()
export class StaffAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly staffJwtService: StaffJwtService,
    private readonly staffService: StaffService,
    private readonly redisService: RedisService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }

    const claims = await this.staffJwtService.verifyAccessToken(
      authHeader.split(' ')[1],
    );

    if (await this.redisService.isStaffDeviceBlacklisted(claims.did)) {
      throw new UnauthorizedException('Unauthorized Access');
    }

    const staff = await this.staffService.findById(claims.sub);
    if (!staff || staff.status !== StaffStatus.ACTIVE) {
      throw new UnauthorizedException('Unauthorized Access');
    }

    req.staff = staff;
    req.staffAuth = {
      staffId: claims.sub,
      deviceId: claims.did,
      tokenJti: claims.jti,
    };
    return next();
  }
}
