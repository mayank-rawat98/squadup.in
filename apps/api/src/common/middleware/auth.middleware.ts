import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { JwtAppService } from '../../auth/services/jwt.service';
import { RedisService } from '../../redis/redis.service';
import { UsersService } from '../../users/users.service';

/**
 * Routes that work for both authenticated and anonymous callers. For these,
 * a valid token is still honoured (req.user is populated) but a missing token
 * is allowed through instead of rejected — the route handler decides access.
 * Matched against req.path (e.g. "/v1/templates/preview-template/:id").
 */
const OPTIONAL_AUTH_PATTERNS = [/\/templates\/preview-template\//];

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly redisService: RedisService,
    private readonly jwtService: JwtAppService,
    private readonly userService: UsersService,
  ) {}
  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    const isOptionalAuth = OPTIONAL_AUTH_PATTERNS.some((pattern) =>
      pattern.test(req.path),
    );

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Optional-auth routes are reachable without a token (handler enforces
      // any per-resource access rules itself).
      if (isOptionalAuth) {
        return next();
      }
      throw new UnauthorizedException(
        'Missing or invalid Authorization header',
      );
    }
    const accessToken = authHeader.split(' ')[1];

    const claims = await this.jwtService.verifyAccessToken(accessToken);
    // if verification fails, an error will be thrown and it will be caught by the global exception filter
    const isDeviceBlacklisted = await this.redisService.isDeviceBlacklisted(
      claims.did,
    );
    if (isDeviceBlacklisted) {
      throw new UnauthorizedException('Unauthorized Access');
    }

    const user = await this.userService.getUser(claims.sub);
    // if user lookup fails, an error will be thrown and it will be caught by the global exception filter
    if (!user) {
      throw new UnauthorizedException('Unauthorized Access');
    }
    req.user = user;
    req.auth = {
      userId: claims.sub,
      deviceId: claims.did,
      tokenJti: claims.jti,
    };
    return next();
  }
}
