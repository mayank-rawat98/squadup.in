import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Integration with 2factor.in SMS OTP API.
 *
 * GET https://2factor.in/API/V1/:api_key/SMS/:phone_number/:otp_value/:otp_template_name
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly apiKey: string;
  private readonly templateName: string;
  private readonly baseUrl = 'https://2factor.in/API/V1';

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('TWO_FACTOR_SMS_API_KEY');
    const name = this.configService.get<string>('TWO_FACTOR_SMS_TEMPLATE');

    if (!key || !name) {
      this.logger.warn(
        'TWO_FACTOR_SMS_API_KEY or TWO_FACTOR_SMS_TEMPLATE is not set – phone OTP will not work',
      );
      throw new InternalServerErrorException(
        'TWO_FACTOR_SMS_API_KEY and TWO_FACTOR_SMS_TEMPLATE must be set in production for SMS OTP functionality',
      );
    }
    this.apiKey = key;
    this.templateName = name;
  }

  /**
   * Send an OTP SMS via 2factor.in.
   * Returns true on success, false on failure.
   */
  async sendOtp(phoneNumber: string, otp: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.error('Cannot send SMS: TWO_FACTOR_SMS_API_KEY is not set');
      return false;
    }

    const url = `${this.baseUrl}/${this.apiKey}/SMS/${phoneNumber}/${otp}/${this.templateName}`;

    try {
      const response = await axios.get(url, { timeout: 10_000 });

      if (response.data?.Status === 'Success') {
        return true;
      }

      this.logger.error(
        `2factor.in API returned non-success: ${JSON.stringify(response.data)}`,
      );
      return false;
    } catch (error) {
      this.logger.error('2factor.in SMS API error', error);
      return false;
    }
  }
}
