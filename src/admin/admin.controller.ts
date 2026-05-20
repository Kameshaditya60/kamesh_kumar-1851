import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { BrandsService } from '../brands/brands.service';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';
import { AdminOnly } from './admin-only.decorator';
import { AssignAuthorDto } from './dto/assign-author.dto';

@Controller('admin')
@AdminOnly()
export class AdminController {
  constructor(
    private readonly users: UsersService,
    private readonly brands: BrandsService,
    private readonly mail: MailService,
  ) {}

  @Post('users')
  async createUser(@Body() dto: CreateUserDto) {
    const user = await this.users.create({
      email: dto.email,
      password: dto.password,
      role: dto.role,
    });

    if (user.role === Role.BRAND) {
      await this.mail.sendWelcomeEmail(user.email, dto.password);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      brandId: user.brandId,
      createdAt: user.createdAt,
    };
  }

  @Post('brands/:brandId/authors')
  assignAuthor(
    @Param('brandId', ParseIntPipe) brandId: number,
    @Body() dto: AssignAuthorDto,
  ) {
    return this.brands.assignAuthor(brandId, dto.authorId);
  }

  @Delete('brands/:brandId/authors/:authorId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unassignAuthor(
    @Param('brandId', ParseIntPipe) brandId: number,
    @Param('authorId', ParseUUIDPipe) authorId: string,
  ) {
    await this.brands.unassignAuthor(brandId, authorId);
  }
}
