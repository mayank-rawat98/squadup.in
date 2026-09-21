import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../../decorators/constants/decorators.constant';
import { EXPERIMENTAL_FEATURE_KEY } from '../feature-flags.constants';
import { FeatureFlagsService } from '../services/feature-flags.service';

@Injectable()
export class ExperimentalFeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const featureKey = this.reflector.getAllAndOverride<string>(
      EXPERIMENTAL_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!featureKey) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    if (!request.auth?.userId) {
      throw new UnauthorizedException('Unauthorized');
    }

    await this.featureFlagsService.assertFeatureAccess(
      request.auth.userId,
      featureKey,
    );

    return true;
  }
}
