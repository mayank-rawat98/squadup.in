import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IPinfoLiteWrapper from 'node-ipinfo';

@Injectable()
export class IpLocationService implements OnModuleInit {
  private ipinfoWrapper!: IPinfoLiteWrapper;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const secret = this.configService.get<string>('IP_INFO_SECRET');
    if (!secret) {
      throw new InternalServerErrorException(
        'IP_INFO_SECRET environment variable is not set. IP location service cannot be initialized.',
      );
    }
    // Fallback to undefined if secret isn't set so the wrapper can still be constructed
    this.ipinfoWrapper = new IPinfoLiteWrapper(secret);
  }

  async getIpLocation(ip: string) {
    if (!ip) {
      return {
        country: 'unknown',
        city: 'unknown',
        region: 'unknown',
        countryCode: 'unknown',
        countryFlag: 'unknown',
      };
    }

    try {
      const ipinfo = await this.ipinfoWrapper.lookupIp(ip);
      return {
        country: ipinfo?.country ?? 'unknown',
        city: ipinfo?.city ?? 'unknown',
        region: ipinfo?.region ?? 'unknown',
        countryCode: ipinfo?.countryCode ?? 'unknown',
        countryFlag: ipinfo?.countryFlag?.emoji ?? 'unknown',
      };
    } catch {
      return {
        country: 'unknown',
        city: 'unknown',
        region: 'unknown',
        countryCode: 'unknown',
        countryFlag: 'unknown',
      };
    }
  }
}

export default IpLocationService;
