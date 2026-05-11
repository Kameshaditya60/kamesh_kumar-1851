import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Role } from './role.enum';
import { User } from './user.entity';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User> {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(params: {
    email: string;
    password: string;
    role: Role;
  }): Promise<User> {
    const existing = await this.findByEmail(params.email);
    if (existing) throw new ConflictException('Email already in use');

    const hash = await bcrypt.hash(params.password, BCRYPT_ROUNDS);
    const user = this.users.create({
      email: params.email,
      password: hash,
      role: params.role,
    });
    return this.users.save(user);
  }

  async ensureExists(params: {
    email: string;
    password: string;
    role: Role;
  }): Promise<User> {
    const existing = await this.findByEmail(params.email);
    if (existing) return existing;
    return this.create(params);
  }

  verifyPassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
