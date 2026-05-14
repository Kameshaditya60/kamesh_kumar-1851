import { Body, Controller, Post } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';
import { AdminOnly } from './admin-only.decorator';

@Controller('admin')
@AdminOnly()
export class AdminController {
  constructor(
    private readonly users: UsersService,
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
      await this.mail.sendBrandWelcomeEmail(user.email, dto.password);
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      brandId: user.brandId,
      createdAt: user.createdAt,
    };
  }
}
