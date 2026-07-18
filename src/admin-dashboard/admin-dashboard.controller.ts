import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AdminDashboardService } from './admin-dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
  ) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  getSummary(@Req() req: any) {
    if (req.user?.department !== 'super_admin') {
      throw new ForbiddenException(
        'Super Admin access only',
      );
    }

    return this.adminDashboardService.getSummary();
  }
}