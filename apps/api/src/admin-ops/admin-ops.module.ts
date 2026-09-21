import { Module } from '@nestjs/common';
import { AdminSecurityModule } from '../admin-security/admin-security.module';
import { BlogsModule } from '../blogs/blogs.module';
import { StaffModule } from '../staff/staff.module';
import { AdminOpsAuditsController } from './audits/admin-ops-audits.controller';
import { AdminOpsBlogsController } from './blogs/admin-ops-blogs.controller';
import { AdminOpsBlogsService } from './blogs/admin-ops-blogs.service';
import { AdminOpsEmailTemplatesController } from './email-templates/admin-ops-email-templates.controller';
import { AdminOpsFeatureFlagsController } from './feature-flags/admin-ops-feature-flags.controller';
import { AdminOpsFeatureRequestsController } from './feature-flags/admin-ops-feature-requests.controller';
import { AdminOpsReferenceDataController } from './reference-data/admin-ops-reference-data.controller';
import { AdminOpsSecurityController } from './security/admin-ops-security.controller';
import { AdminOpsUsersController } from './users/admin-ops-users.controller';
import { AdminOpsUsersService } from './users/admin-ops-users.service';

/**
 * Admin-ops module — the single entry point for the ops dashboard's
 * administrative endpoints (mounted under `/v1/admin-ops/*`).
 *
 * It owns no entities of its own: each controller reuses the domain services
 * exported by their feature modules and applies staff-realm authorization
 * (`StaffGuard`). Users, audits, mailer, minio, feature-flags and reference-data
 * are @Global, so their services inject without an import; Blogs and
 * AdminSecurity are imported explicitly, and StaffModule for the guard.
 */
@Module({
  imports: [StaffModule, AdminSecurityModule, BlogsModule],
  controllers: [
    AdminOpsUsersController,
    AdminOpsEmailTemplatesController,
    AdminOpsAuditsController,
    AdminOpsSecurityController,
    AdminOpsFeatureFlagsController,
    AdminOpsFeatureRequestsController,
    AdminOpsReferenceDataController,
    AdminOpsBlogsController,
  ],
  providers: [AdminOpsUsersService, AdminOpsBlogsService],
})
export class AdminOpsModule {}
