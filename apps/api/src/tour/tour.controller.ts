import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { TourService } from './tour.service';
import { UpdateTourDto } from './dto/update-tour.dto';
import {
  GetTourDocs,
  ResetTourDocs,
  TourTag,
  UpdateTourDocs,
} from './swagger/tour.swagger';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { UserRateLimit } from '../decorators/throttler.decorator';

@TourTag
@Controller({
  version: '1',
  path: 'tour',
})
@UseGuards(PermissionsGuard)
@UserRateLimit()
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @GetTourDocs
  @Get()
  async getTour(@Req() req: Request) {
    const data = await this.tourService.getTour(req.auth.userId);
    return {
      success: true,
      data,
      message: 'Tour state retrieved successfully',
    };
  }

  @UpdateTourDocs
  @Patch()
  async updateTour(@Body() dto: UpdateTourDto, @Req() req: Request) {
    const data = await this.tourService.updateTour(req.auth.userId, dto);
    return {
      success: true,
      data,
      message: 'Tour state updated successfully',
    };
  }

  @ResetTourDocs
  @Post('reset')
  async resetTour(@Req() req: Request) {
    const data = await this.tourService.resetTour(req.auth.userId);
    return {
      success: true,
      data,
      message: 'Tour state reset successfully',
    };
  }
}
