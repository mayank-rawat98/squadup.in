import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserSettings } from './entities/user-settings.entity';
import { PasskeyCredential } from './entities/passkey-credential.entity';
import { SettingsRepository } from './settings.repository';
import { PasskeyRepository } from './passkey.repository';
import { TwoFactorAuthenticatorService } from './services/two-factor-authenticator.service';
import { TwoFactorEmailService } from './services/two-factor-email.service';
import { TwoFactorPhoneService } from './services/two-factor-phone.service';
import { TwoFactorOtpService } from './services/two-factor-otp.service';
import { TwoFactorPasskeyService } from './services/two-factor-passkey.service';
import { TwoFactorRecoveryService } from './services/two-factor-recovery.service';
import { SmsService } from './services/sms.service';
import { SettingsController } from './settings.controller';
import { GeneralSettingsController } from './general-settings.controller';
import { GeneralSettingsService } from './services/general-settings.service';
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([UserSettings, PasskeyCredential])],
  controllers: [SettingsController, GeneralSettingsController],
  providers: [
    SettingsRepository,
    PasskeyRepository,
    TwoFactorAuthenticatorService,
    TwoFactorEmailService,
    TwoFactorPhoneService,
    TwoFactorOtpService,
    TwoFactorPasskeyService,
    TwoFactorRecoveryService,
    SmsService,
    GeneralSettingsService,
  ],
  exports: [
    SettingsRepository,
    PasskeyRepository,
    TwoFactorAuthenticatorService,
    TwoFactorEmailService,
    TwoFactorPhoneService,
    TwoFactorOtpService,
    TwoFactorPasskeyService,
    TwoFactorRecoveryService,
    SmsService,
    GeneralSettingsService,
  ],
})
export class SettingsModule {}
