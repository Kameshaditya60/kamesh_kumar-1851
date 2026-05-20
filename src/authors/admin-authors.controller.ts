import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { AdminOnly } from '../admin/admin-only.decorator';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { ListAuthorsDto } from './dto/list-authors.dto';

@Controller('admin/authors')
@AdminOnly()
export class AdminAuthorsController {
  constructor(private readonly authors: AuthorsService) {}

  @Post()
  create(@Body() dto: CreateAuthorDto) {
    return this.authors.createAuthor(dto);
  }

  @Get()
  list(@Query() query: ListAuthorsDto) {
    return this.authors.listAuthors(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.authors.getAuthorById(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.authors.deleteAuthor(id);
  }
}
