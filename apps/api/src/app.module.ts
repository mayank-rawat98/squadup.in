import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule } from '@nestjs/microservices';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { AdminOpsModule } from './admin-ops/admin-ops.module';
import { AdminOpsAuditsController } from './admin-ops/audits/admin-ops-audits.controller';
import { AdminOpsEmailTemplatesController } from './admin-ops/email-templates/admin-ops-email-templates.controller';
import { AdminOpsUsersController } from './admin-ops/users/admin-ops-users.controller';
import { AuditsController } from './audits/audits.controller';
import { AuditsModule } from './audits/audits.module';
import { AuthController } from './auth/auth.controller';
import { AuthModule } from './auth/auth.module';
import { BackupController } from './backup/backup.controller';
import { BackupModule } from './backup/backup.module';
import { ChangelogController } from './changelog/changelog.controller';
import { ChangelogModule } from './changelog/changelog.module';
import { AuthMiddleware } from './common/middleware/auth.middleware';
import { createAuditClientConfig } from './config';
import { DbModule } from './db/db.module';
import { FormsController } from './forms/forms.controller';
import { FormsModule } from './forms/forms.module';
import { MailerModule } from './mailer/mailer.module';
import { MetricsModule } from './metrics/metrics.module';
import { MinioController } from './minio/minio.controller';
import { MinioModule } from './minio/minio.module';
import { NotificationController } from './notifications/controllers/notification.controller';
import { NotificationsModule } from './notifications/notifications.module';
import { RateLimiterModule } from './rate-limiter/rate-limiter.module';
import { RedisModule } from './redis/redis.module';
import { GeneralSettingsController } from './settings/general-settings.controller';
import { SettingsController } from './settings/settings.controller';
import { SettingsModule } from './settings/settings.module';
import { StaffAuthMiddleware } from './staff/middleware/staff-auth.middleware';
import { StaffAuthController } from './staff/staff-auth.controller';
import { StaffController } from './staff/staff.controller';
import { StaffModule } from './staff/staff.module';
import { UsersController } from './users/users.controller';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ClientsModule.registerAsync([createAuditClientConfig()]),
    PrometheusModule.register({
      // optional config:
      defaultMetrics: {
        enabled: true, // collects process/node metrics by default
      },
      defaultLabels: { app: 'squadup.in' },
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => ({
        type: configService.get<string>('DB_TYPE') as 'postgres',
        host: configService.get<string>('POSTGRES_HOST'),
        port: configService.get<number>('POSTGRES_PORT'),
        username: configService.get<string>('POSTGRES_USER'),
        password: configService.get<string>('POSTGRES_PASSWORD'),
        database: configService.get<string>('POSTGRES_DB'),
        ssl:
          configService.get('PGSSLMODE') === 'require' ||
          configService.get('POSTGRES_SSL') === 'true'
            ? {
                rejectUnauthorized:
                  configService.get('PGSSL_REJECT_UNAUTHORIZED') !== 'false',
              }
            : false,
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),
    UsersModule,
    RedisModule,
    RateLimiterModule,
    AuthModule,
    MetricsModule,
    FormsModule,
    MailerModule,
    MinioModule,
    BackupModule,
    AuditsModule,
    DbModule,
    NotificationsModule,
    SettingsModule,
    ChangelogModule,
    AdminOpsModule,
    StaffModule,
  ],
  controllers: [],
  providers: [],
  exports: [ClientsModule],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude(
        { path: 'v1/auth/login', method: RequestMethod.POST },
        { path: 'v1/auth/register', method: RequestMethod.POST },
        { path: 'v1/auth/refresh', method: RequestMethod.POST },
        {
          path: 'v1/auth/resend-verification-email',
          method: RequestMethod.POST,
        },
        {
          path: 'v1/users/forgot-password-email',
          method: RequestMethod.POST,
        },
        { path: 'v1/users/forgot-password', method: RequestMethod.POST },
        { path: 'v1/users/send-email-link', method: RequestMethod.POST },
        { path: 'v1/users/verify-email-link', method: RequestMethod.POST },
        { path: 'v1/auth/verify-email', method: RequestMethod.POST },
        // Public invite endpoints — the invitee isn't logged in yet. Note this
        // does NOT match 'invite/accept-existing', which stays authenticated.
        { path: 'v1/auth/invite/validate', method: RequestMethod.GET },
        { path: 'v1/auth/invite/accept', method: RequestMethod.POST },
        { path: 'v1/auth/google', method: RequestMethod.POST },
        { path: 'v1/auth/verify-2fa', method: RequestMethod.POST },
        { path: 'v1/auth/2fa/select-method', method: RequestMethod.POST },
        { path: 'v1/auth/2fa/passkey/options', method: RequestMethod.POST },
        { path: 'v1/auth/2fa/passkey/verify', method: RequestMethod.POST },
      )
      .forRoutes(
        UsersController,
        AuthController,
        NotificationController,
        SettingsController,
        GeneralSettingsController,
        AuditsController,
      );

    // Staff realm — the ops dashboard authenticates with a staff token; there is
    // no admin role in the customer realm at all. Alongside the staff/admin-ops
    // controllers this covers the administrative controllers (backup, minio,
    // form management, changelog authoring), whose anonymous routes — public
    // form submissions and changelog reads — are excluded so they stay open.
    consumer
      .apply(StaffAuthMiddleware)
      .exclude(
        { path: 'v1/staff/auth/login', method: RequestMethod.POST },
        { path: 'v1/staff/auth/refresh', method: RequestMethod.POST },
        { path: 'v1/forms/newsletter', method: RequestMethod.POST },
        { path: 'v1/forms/contact-us', method: RequestMethod.POST },
        { path: 'v1/forms/grievance', method: RequestMethod.POST },
        { path: 'v1/forms/career', method: RequestMethod.POST },
        {
          path: 'v1/forms/newsletter/unsubscribe',
          method: RequestMethod.PATCH,
        },
        { path: 'v1/changelog', method: RequestMethod.GET },
        { path: 'v1/changelog/:id', method: RequestMethod.GET },
      )
      .forRoutes(
        StaffAuthController,
        StaffController,
        AdminOpsUsersController,
        AdminOpsEmailTemplatesController,
        AdminOpsAuditsController,
        BackupController,
        MinioController,
        FormsController,
        ChangelogController,
      );
  }
}
