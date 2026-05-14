import { IsEnum } from 'class-validator';
import { BrandStatus } from '../enums/brand-status.enum';

export class UpdateBrandStatusDto {
  @IsEnum(BrandStatus)
  status!: BrandStatus;
}
