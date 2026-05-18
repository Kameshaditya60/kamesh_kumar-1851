import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { ListPublicArticlesDto } from './dto/list-public-articles.dto';

@Controller('public/articles')
export class PublicArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get()
  list(@Query() query: ListPublicArticlesDto) {
    return this.articles.listPublic(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.articles.getPublicById(id);
  }
}
