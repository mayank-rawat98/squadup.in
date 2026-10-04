import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Sandbox } from './entities/sandbox.entity';
import { SandboxesController } from './sandboxes.controller';
import { SandboxesRepository } from './sandboxes.repository';
import { SandboxesService } from './sandboxes.service';

/** React + TypeScript sandboxes (ROADMAP Milestone 5): saved projects per user. */
@Module({
  imports: [TypeOrmModule.forFeature([Sandbox])],
  controllers: [SandboxesController],
  providers: [SandboxesService, SandboxesRepository],
  exports: [SandboxesService],
})
export class SandboxesModule {}
