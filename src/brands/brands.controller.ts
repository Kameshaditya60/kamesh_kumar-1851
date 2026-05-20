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
import { AdminOnly } from '../admin/admin-only.decorator';
import { ArticlesService } from '../articles/articles.service';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandOwnerOrAdminGuard } from './brand-owner-or-admin.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ListBrandsDto } from './dto/list-brands.dto';
import { UpdateBrandStatusDto } from './dto/update-brand-status.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(
    private readonly brands: BrandsService,
    private readonly articles: ArticlesService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  list(
    @Query() query: ListBrandsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.brands.findAllPaginated(query, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.brands.findProfileById(id, user);
  }

  @Get(':id/articles')
  @UseGuards(JwtAuthGuard)
  async listArticles(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ListBrandsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.brands.assertBrandVisible(id, user);
    return this.articles.listPublic({
      brandId: id,
      page: query.page,
      limit: query.limit,
    });
  }

  @Post()
  @AdminOnly()
  create(
    @Body() dto: CreateBrandDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.brands.create(dto, user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, BrandOwnerOrAdminGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brands.update(id, dto);
  }

  @Patch(':id/status')
  @AdminOnly()
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBrandStatusDto,
  ) {
    return this.brands.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @AdminOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.brands.delete(id);
  }
}
