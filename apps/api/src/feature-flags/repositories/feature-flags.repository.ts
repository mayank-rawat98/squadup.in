import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, Repository } from 'typeorm';
import { FeatureRequestStatus } from '../feature-flags.constants';
import { FeatureFlag } from '../entities/feature-flag.entity';
import { FeatureFlagUserAccess } from '../entities/feature-flag-user-access.entity';

@Injectable()
export class FeatureFlagsRepository {
  constructor(
    @InjectRepository(FeatureFlag)
    private readonly featureFlagRepo: Repository<FeatureFlag>,
    @InjectRepository(FeatureFlagUserAccess)
    private readonly userAccessRepo: Repository<FeatureFlagUserAccess>,
  ) {}

  listFlags() {
    return this.featureFlagRepo.find({
      relations: { userAccesses: true },
      order: { key: 'ASC' },
    });
  }

  findFlagByKey(key: string) {
    return this.featureFlagRepo.findOne({
      where: { key },
      relations: { userAccesses: true },
    });
  }

  createFlag(data: DeepPartial<FeatureFlag>) {
    return this.featureFlagRepo.create(data);
  }

  saveFlag(flag: DeepPartial<FeatureFlag>) {
    return this.featureFlagRepo.save(flag);
  }

  async deleteFlag(id: string) {
    await this.featureFlagRepo.delete(id);
  }

  findUserAccess(featureFlagId: string, userId: string) {
    return this.userAccessRepo.findOne({
      where: { featureFlagId, userId },
    });
  }

  createUserAccess(data: DeepPartial<FeatureFlagUserAccess>) {
    return this.userAccessRepo.create(data);
  }

  saveUserAccess(access: DeepPartial<FeatureFlagUserAccess>) {
    return this.userAccessRepo.save(access);
  }

  listExperimentalFlags() {
    return this.featureFlagRepo.find({
      where: { isExperimental: true, enabled: true },
      relations: { userAccesses: true },
      order: { name: 'ASC' },
    });
  }

  findUserAccessById(id: string) {
    return this.userAccessRepo.findOne({
      where: { id },
      relations: { featureFlag: true },
    });
  }

  listUserAccessRequests(filters: {
    status?: FeatureRequestStatus;
    featureFlagId?: string;
    userId?: string;
  }) {
    const where: FindOptionsWhere<FeatureFlagUserAccess> = {};
    if (filters.status) where.status = filters.status;
    if (filters.featureFlagId) where.featureFlagId = filters.featureFlagId;
    if (filters.userId) where.userId = filters.userId;

    return this.userAccessRepo.find({
      where,
      relations: { featureFlag: true },
      order: { requestedAt: 'ASC', createdAt: 'ASC' },
    });
  }

  async deleteUserAccess(id: string) {
    await this.userAccessRepo.delete(id);
  }

  countPendingRequests() {
    return this.userAccessRepo.count({
      where: { status: FeatureRequestStatus.PENDING },
    });
  }
}
