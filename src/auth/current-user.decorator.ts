import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Role } from '../users/role.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    return ctx.switchToHttp().getRequest().user;
  },
);
