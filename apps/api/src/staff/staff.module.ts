import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from './entities/staff.entity';
import { StaffGuard } from './guards/staff.guard';
import { StaffAuthMiddleware } from './middleware/staff-auth.middleware';
import { StaffAuthService } from './services/staff-auth.service';
import { StaffJwtService } from './services/staff-jwt.service';
import { StaffService } from './services/staff.service';
import { StaffAuthController } from './staff-auth.controller';
import { StaffController } from './staff.controller';
import { StaffRepository } from './staff.repository';

/**
 * The ops (staff) realm: its own identity, credentials, sessions and guard,
 * sharing nothing with the customer `User` realm but the Redis connection.
 *
 * Global because StaffGuard is applied by controllers across several feature
 * modules (backup, minio, forms, changelog, admin-ops) that have no other
 * reason to depend on the staff realm.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Staff]), JwtModule.register({})],
  controllers: [StaffAuthController, StaffController],
  providers: [
    StaffService,
    StaffAuthService,
    StaffJwtService,
    StaffRepository,
    StaffGuard,
    StaffAuthMiddleware,
  ],
  exports: [StaffService, StaffJwtService, StaffGuard, StaffAuthMiddleware],
})
export class StaffModule {}
