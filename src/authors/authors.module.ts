import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BrandAuthor } from '../brands/brand-author.entity';
import { MailModule } from '../mail/mail.module';
import { User } from '../users/user.entity';
import { AdminAuthorsController } from './admin-authors.controller';
import { AuthorsController } from './authors.controller';
import { AuthorsService } from './authors.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, BrandAuthor]), MailModule],
  controllers: [AdminAuthorsController, AuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService],
})
export class AuthorsModule {}
