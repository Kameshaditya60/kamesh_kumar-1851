import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsInt()
  @Min(1)
  brandId!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsString()
  @MinLength(1)
  content!: string;
}
