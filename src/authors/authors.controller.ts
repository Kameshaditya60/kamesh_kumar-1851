import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/enums/role.enum';
import { AuthorsService } from './authors.service';
import { UpdateAuthorProfileDto } from './dto/update-author-profile.dto';

@Controller('authors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.AUTHOR)
export class AuthorsController {
  constructor(private readonly authors: AuthorsService) {}

  @Get('me')
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.authors.getAuthorById(user.id);
  }

  @Patch('me')
  updateOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAuthorProfileDto,
  ) {
    return this.authors.updateOwnProfile(user.id, dto);
  }
}
