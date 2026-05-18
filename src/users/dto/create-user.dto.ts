import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { Role } from '../enums/role.enum';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}
