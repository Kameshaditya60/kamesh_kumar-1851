import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.type';

export interface AuthResult {
  accessToken: string;
  user: { id: string; email: string; role: Role | null };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) { }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await this.users.findByEmailForAuth(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await this.users.verifyPassword(password, user.password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return this.issueToken(user);
  }

  private issueToken(user: User): AuthResult {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
