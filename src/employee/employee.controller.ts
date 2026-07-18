import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { EmployeeService } from './employee.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { SuperAdminGuard } from '../auth/super-admin.guard';

@Controller('employees')
@UseGuards(SuperAdminGuard)
export class EmployeeController {
  constructor(
    private readonly employeeService: EmployeeService,
  ) {}

  @Post()
  create(
    @Body()
    dto: CreateEmployeeDto,
  ) {
    return this.employeeService.create(dto);
  }

  @Get()
  findAll() {
    return this.employeeService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.employeeService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,
    @Body()
    body: any,
  ) {
    return this.employeeService.update(
      id,
      body,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.employeeService.delete(
      id,
    );
  }
}