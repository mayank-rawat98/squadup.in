import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserTourState } from './entities/user-tour-state.entity';
import { TourController } from './tour.controller';
import { TourService } from './tour.service';
import { TourRepository } from './tour.repository';

@Module({
  imports: [TypeOrmModule.forFeature([UserTourState])],
  controllers: [TourController],
  providers: [TourService, TourRepository],
  exports: [TourService],
})
export class TourModule {}
