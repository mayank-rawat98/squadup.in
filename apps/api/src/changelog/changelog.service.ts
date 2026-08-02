import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditsService } from '../audits/audits.service';
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORY,
  AUDIT_RESOURCE,
  AUDIT_SEVERITY,
  AUDIT_STATUS,
} from '../audits/constants';
import { CreateChangelogDto } from './dto/create-changelog.dto';
import { QueryChangelogDto } from './dto/query-changelog.dto';
import { UpdateChangelogDto } from './dto/update-changelog.dto';
import { Changelog } from './entities/changelog.entity';
import { ChangelogRepository } from './changelog.repository';

@Injectable()
export class ChangelogService {
  constructor(
    private readonly changelogRepository: ChangelogRepository,
    private readonly auditsService: AuditsService,
  ) {}

  async findAll(query: QueryChangelogDto): Promise<{
    items: Changelog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { items, total } = await this.changelogRepository.findAll(query);
    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
      totalPages: Math.ceil(total / query.limit),
    };
  }

  async findOne(id: string): Promise<Changelog> {
    const entry = await this.changelogRepository.findOne(id);
    if (!entry) {
      throw new NotFoundException(`Changelog entry with id ${id} not found`);
    }
    return entry;
  }

  async create(userId: string, dto: CreateChangelogDto): Promise<Changelog> {
    const exists = await this.changelogRepository.existsByVersion(dto.version);
    if (exists) {
      throw new ConflictException(
        `Changelog entry with version "${dto.version}" already exists`,
      );
    }

    // releaseType and the legacy isMajor flag are kept consistent. Either may
    // be supplied (ops sends releaseType, web still sends isMajor).
    const releaseType = dto.releaseType ?? (dto.isMajor ? 'major' : 'minor');

    const entry = await this.changelogRepository.create({
      ...dto,
      date: new Date(dto.date),
      releaseType,
      isMajor: releaseType === 'major',
    });

    await this.auditsService.logUserAction(
      userId,
      AUDIT_ACTIONS.CHANGELOG.CREATED,
      AUDIT_RESOURCE.CHANGELOG,
      entry.id,
      {
        resourceName: entry.version,
        severity: AUDIT_SEVERITY.LOW,
        status: AUDIT_STATUS.SUCCESS,
        category: AUDIT_CATEGORY.CHANGELOG,
      },
    );

    return entry;
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateChangelogDto,
  ): Promise<Changelog> {
    await this.findOne(id);

    if (dto.version) {
      const versionTaken = await this.changelogRepository.existsByVersion(
        dto.version,
        id,
      );
      if (versionTaken) {
        throw new ConflictException(
          `Changelog entry with version "${dto.version}" already exists`,
        );
      }
    }

    // Keep releaseType and isMajor in sync when either one is updated.
    const sync: Partial<Changelog> = {};
    if (dto.releaseType) {
      sync.isMajor = dto.releaseType === 'major';
    } else if (dto.isMajor !== undefined) {
      sync.releaseType = dto.isMajor ? 'major' : 'minor';
    }

    const updated = await this.changelogRepository.update(id, {
      ...dto,
      date: dto.date ? new Date(dto.date) : undefined,
      ...sync,
    });

    await this.auditsService.logUserAction(
      userId,
      AUDIT_ACTIONS.CHANGELOG.UPDATED,
      AUDIT_RESOURCE.CHANGELOG,
      id,
      {
        resourceName: updated.version,
        severity: AUDIT_SEVERITY.LOW,
        status: AUDIT_STATUS.SUCCESS,
        category: AUDIT_CATEGORY.CHANGELOG,
      },
    );

    return updated;
  }

  async delete(userId: string, id: string): Promise<void> {
    const entry = await this.findOne(id);
    await this.changelogRepository.delete(id);

    await this.auditsService.logUserAction(
      userId,
      AUDIT_ACTIONS.CHANGELOG.DELETED,
      AUDIT_RESOURCE.CHANGELOG,
      id,
      {
        resourceName: entry.version,
        severity: AUDIT_SEVERITY.LOW,
        status: AUDIT_STATUS.SUCCESS,
        category: AUDIT_CATEGORY.CHANGELOG,
      },
    );
  }
}
