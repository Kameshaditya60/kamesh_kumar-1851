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
  UseGuards,
} from '@nestjs/common';
import { AdminOnly } from '../admin/admin-only.decorator';
import { AuthenticatedUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BrandOwnerOrAdminGuard } from './brand-owner-or-admin.guard';
import { BrandsService } from './brands.service';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandStatusDto } from './dto/update-brand-status.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brands: BrandsService) {}

  @Get()
  @AdminOnly()
  list() {
    return this.brands.findAll();
  }

  @Get(':id')
  @AdminOnly()
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.brands.findById(id);
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
