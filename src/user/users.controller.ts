import {
  Controller,
  ForbiddenException,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  @Get('customers')
  @UseGuards(JwtAuthGuard)
  getAllCustomers(@Req() req: any) {
    const allowedDepartments = [
      'super_admin',
      'orders',
      'customer_support',
    ];

    if (
      !req.user ||
      !allowedDepartments.includes(
        req.user.department,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to view customers',
      );
    }

    return this.usersService.getAllCustomers();
  }
}