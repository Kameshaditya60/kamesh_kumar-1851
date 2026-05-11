import { Role } from '../users/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}
