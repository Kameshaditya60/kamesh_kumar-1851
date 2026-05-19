import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '../users/enums/role.enum';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { UpdateArticleStatusDto } from './dto/update-article-status.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('articles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.BRAND, Role.AUTHOR)
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Post()
  create(
    @Body() dto: CreateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.create(dto, user);
  }

  @Get()
  list(
    @Query() query: ListArticlesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.list(user, query);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.getOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.articles.update(id, dto, user);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArticleStatusDto,
  ) {
    return this.articles.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.articles.delete(id, user);
  }
}
