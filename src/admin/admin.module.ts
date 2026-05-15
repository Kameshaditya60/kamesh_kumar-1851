import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [UsersModule, MailModule],
  controllers: [AdminController],
})
export class AdminModule {}
