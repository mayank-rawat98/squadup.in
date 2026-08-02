import { Module } from '@nestjs/common';
import { StaffModule } from '../staff/staff.module';
import { AdminOpsAuditsController } from './audits/admin-ops-audits.controller';
import { AdminOpsEmailTemplatesController } from './email-templates/admin-ops-email-templates.controller';
import { AdminOpsUsersController } from './users/admin-ops-users.controller';
import { AdminOpsUsersService } from './users/admin-ops-users.service';

/**
 * Admin-ops module — the single entry point for the ops dashboard's
 * administrative endpoints (mounted under `/v1/admin-ops/*`).
 *
 * It owns no entities of its own: each controller reuses the domain services
 * exported by their feature modules and applies staff-realm authorization
 * (`StaffGuard`). Users, audits and mailer are @Global, so their services
 * inject without an import; StaffModule is imported for the guard's dependency.
 */
@Module({
  imports: [StaffModule],
  controllers: [
    AdminOpsUsersController,
    AdminOpsEmailTemplatesController,
    AdminOpsAuditsController,
  ],
  providers: [AdminOpsUsersService],
})
export class AdminOpsModule {}
