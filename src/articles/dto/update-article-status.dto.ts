import { IsEnum } from 'class-validator';
import { ArticleStatus } from '../enums/article-status.enum';

export class UpdateArticleStatusDto {
  @IsEnum(ArticleStatus)
  status!: ArticleStatus;
}
