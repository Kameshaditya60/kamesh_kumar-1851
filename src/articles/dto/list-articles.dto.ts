import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { ArticleSortBy } from '../enums/article-sort-by.enum';
import { ArticleStatus } from '../enums/article-status.enum';
import { SortOrder } from '../enums/sort-order.enum';

export class ListArticlesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(ArticleSortBy)
  sortBy?: ArticleSortBy;

  @IsOptional()
  @IsEnum(SortOrder)
  order?: SortOrder;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  brandId?: number;
}
