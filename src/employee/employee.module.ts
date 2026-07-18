import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';

import {
  Employee,
  EmployeeSchema,
} from './employee.schema';
import { EmployeeService } from './employee.service';
import { EmployeeController } from './employee.controller';
import { SuperAdminGuard } from '../auth/super-admin.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Employee.name,
        schema: EmployeeSchema,
      },
    ]),

    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'CrackerKart@2026',
    }),
  ],

  controllers: [EmployeeController],

  providers: [
    EmployeeService,
    SuperAdminGuard,
  ],

  exports: [EmployeeService],
})
export class EmployeeModule {}