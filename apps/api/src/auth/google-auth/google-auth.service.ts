import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { createHash } from 'crypto';

type GoogleTokenInfo = {
  aud?: string;
  azp?: string;
  email?: string;
  exp?: string;
  email_verified?: string;
  iss?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

export type GoogleIdentity = {
  email: string;
  name?: string;
  picture?: string;
  sub?: string;
};

type CachedGoogleIdentity = {
  identity: GoogleIdentity;
  expiresAt: number;
};

@Injectable()
export class GoogleAuthService {
  private static readonly TOKEN_CACHE_MAX_SIZE = 1000;

  private readonly tokenCache = new Map<string, CachedGoogleIdentity>();

  constructor(private readonly configService: ConfigService) {}

  async verifyAuthCode(code: string): Promise<GoogleIdentity> {
    if (!code?.trim()) {
      throw new BadRequestException('Google authorization code is required');
    }

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')?.trim();
    const clientSecret = this.configService
      .get<string>('GOOGLE_CLIENT_SECRET')
      ?.trim();

    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException(
        'Google authentication is not configured',
      );
    }

    let idToken: string;
    try {
      const params = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        // 'postmessage' is Google's reserved redirect_uri for popup-mode code clients
        redirect_uri: 'postmessage',
        grant_type: 'authorization_code',
      });

      const { data } = await axios.post<{ id_token?: string }>(
        'https://oauth2.googleapis.com/token',
        params.toString(),
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 5000,
        },
      );

      if (!data.id_token) {
        throw new UnauthorizedException(
          'Google did not return an ID token for the provided code',
        );
      }
      idToken = data.id_token;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new UnauthorizedException(
        'Unable to exchange Google authorization code',
      );
    }

    return this.verifyIdToken(idToken);
  }

  async verifyIdToken(idToken: string): Promise<GoogleIdentity> {
    if (!idToken?.trim()) {
      throw new BadRequestException('Google ID token is required');
    }

    const expectedAudience = this.configService
      .get<string>('GOOGLE_CLIENT_ID')
      ?.trim();
    if (!expectedAudience) {
      throw new InternalServerErrorException(
        'Google authentication is not configured',
      );
    }

    const cacheKey = this.getCacheKey(idToken);
    const cachedIdentity = this.getCachedIdentity(cacheKey);
    if (cachedIdentity) {
      return cachedIdentity;
    }

    try {
      const { data } = await axios.get<GoogleTokenInfo>(
        'https://oauth2.googleapis.com/tokeninfo',
        {
          params: { id_token: idToken },
          timeout: 5000,
        },
      );

      const audience = data.aud || data.azp || '';

      if (audience !== expectedAudience) {
        throw new UnauthorizedException('Invalid Google client audience');
      }

      if (
        data.iss &&
        data.iss !== 'https://accounts.google.com' &&
        data.iss !== 'accounts.google.com'
      ) {
        throw new UnauthorizedException('Invalid Google token issuer');
      }

      if (!data.email || data.email_verified !== 'true') {
        throw new UnauthorizedException(
          'Google account email must be verified',
        );
      }

      const identity: GoogleIdentity = {
        email: data.email.toLowerCase(),
        name: data.name?.trim() || undefined,
        picture: this.getSafePictureUrl(data.picture),
        sub: data.sub,
      };

      this.setCachedIdentity(cacheKey, identity, data.exp);
      return identity;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Unable to verify Google credentials');
    }
  }

  private getSafePictureUrl(url?: string): string | undefined {
    if (!url) return undefined;
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'https:' ? parsed.toString() : undefined;
    } catch {
      return undefined;
    }
  }

  private getCacheKey(idToken: string): string {
    return createHash('sha256').update(idToken).digest('hex');
  }

  private getCachedIdentity(cacheKey: string): GoogleIdentity | null {
    const cached = this.tokenCache.get(cacheKey);
    if (!cached) return null;

    if (cached.expiresAt <= Date.now()) {
      this.tokenCache.delete(cacheKey);
      return null;
    }
    return cached.identity;
  }

  private setCachedIdentity(
    cacheKey: string,
    identity: GoogleIdentity,
    googleExp?: string,
  ) {
    const now = Date.now();
    const googleExpSeconds = googleExp ? Number(googleExp) : Number.NaN;
    const googleExpiryMs = googleExpSeconds * 1000;
    const maxCacheMs = now + 5 * 60 * 1000;
    const expiresAt =
      Number.isFinite(googleExpiryMs) && googleExpiryMs > now
        ? Math.min(googleExpiryMs, maxCacheMs)
        : maxCacheMs;

    if (
      !this.tokenCache.has(cacheKey) &&
      this.tokenCache.size >= GoogleAuthService.TOKEN_CACHE_MAX_SIZE
    ) {
      const oldestKey = this.tokenCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.tokenCache.delete(oldestKey);
      }
    }

    this.tokenCache.set(cacheKey, { identity, expiresAt });
  }
}
