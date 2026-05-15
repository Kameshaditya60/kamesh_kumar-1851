import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Role } from '../users/enums/role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role | null;
  brandId: number | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
