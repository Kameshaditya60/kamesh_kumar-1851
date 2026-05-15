import { IsUUID } from 'class-validator';

export class AssignAuthorDto {
  @IsUUID()
  authorId!: string;
}
