import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class OtpTokenService {
  generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  generateSecureOtp(): number {
    return crypto.randomInt(100000, 1000000);
  }
}
