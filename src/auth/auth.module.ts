import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { SuperAdminGuard } from './super-admin.guard';

import { UsersModule } from '../user/users.module';
import { EmployeeModule } from '../employee/employee.module';

@Module({
  imports: [
    UsersModule,
    EmployeeModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET || 'CrackerKart@2026',

      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN || '1d') as any,
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, JwtStrategy, SuperAdminGuard],

  exports: [JwtModule, SuperAdminGuard],
})
export class AuthModule {}
