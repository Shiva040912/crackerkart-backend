import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request = context
      .switchToHttp()
      .getRequest<Request>();

    const authorization =
      request.headers.authorization;

    if (
      !authorization ||
      !authorization.startsWith('Bearer ')
    ) {
      throw new UnauthorizedException(
        'Admin token is required',
      );
    }

    const token = authorization.split(' ')[1];

    try {
      const payload =
        this.jwtService.verify(token, {
          secret:
            process.env.JWT_SECRET,
        });

      if (
        payload.department !== 'super_admin'
      ) {
        throw new ForbiddenException(
          'Only Super Admin can manage employees',
        );
      }

      request['user'] = {
        userId: payload.sub,
        email: payload.email,
        department: payload.department,
      };

      return true;
    } catch (error) {
      if (
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new UnauthorizedException(
        'Invalid or expired admin token',
      );
    }
  }
}