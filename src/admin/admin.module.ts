import { Module } from '@nestjs/common';
import { BrandsModule } from '../brands/brands.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule, BrandsModule, MailModule],
  controllers: [AdminController],
})
export class AdminModule {}
