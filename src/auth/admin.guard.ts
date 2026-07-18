import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class AdminGuard
  implements CanActivate
{
  private readonly allowedDepartments = [
    'super_admin',
    'admin',
    'inventory',
    'orders',
    'customer_support',
  ];

  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request = context
      .switchToHttp()
      .getRequest();

    const user = request.user;

    if (
      !user ||
      !this.allowedDepartments.includes(
        user.department,
      )
    ) {
      throw new ForbiddenException(
        'Staff access only',
      );
    }

    return true;
  }
}