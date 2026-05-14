import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { Role } from '../users/enums/role.enum';

@Injectable()
export class BrandOwnerOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser | undefined;

    if (!user) {
      throw new ForbiddenException('Not authenticated');
    }
    if (user.role === Role.ADMIN) {
      return true;
    }

    const brandId = parseInt(req.params?.id, 10);
    if (Number.isNaN(brandId)) {
      throw new ForbiddenException('Invalid brand id');
    }

    if (user.role === Role.BRAND && user.brandId === brandId) {
      return true;
    }

    throw new ForbiddenException('You can only update your own brand');
  }
}
