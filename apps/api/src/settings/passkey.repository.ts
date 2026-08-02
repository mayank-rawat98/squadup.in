import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasskeyCredential } from './entities/passkey-credential.entity';

@Injectable()
export class PasskeyRepository {
  constructor(
    @InjectRepository(PasskeyCredential)
    private readonly repo: Repository<PasskeyCredential>,
  ) {}

  findByUserId(userId: string): Promise<PasskeyCredential[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'ASC' } });
  }

  findByCredentialId(credentialId: string): Promise<PasskeyCredential | null> {
    return this.repo.findOne({ where: { credentialId } });
  }

  create(data: Partial<PasskeyCredential>): Promise<PasskeyCredential> {
    return this.repo.save(this.repo.create(data));
  }

  async updateCounter(
    id: string,
    counter: number,
    lastUsedAt: Date,
  ): Promise<void> {
    await this.repo.update({ id }, { counter, lastUsedAt });
  }

  async rename(id: string, userId: string, nickname: string): Promise<void> {
    await this.repo.update({ id, userId }, { nickname });
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const res = await this.repo.delete({ id, userId });
    return (res.affected ?? 0) > 0;
  }

  countByUserId(userId: string): Promise<number> {
    return this.repo.count({ where: { userId } });
  }
}
