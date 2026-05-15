import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '../users/enums/role.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    private readonly users: UsersService,
    private readonly config: ConfigService,
  ) { }

  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_EMAIL') ?? 'admin@email.com';
    const password = this.config.get<string>('ADMIN_PASSWORD') ?? 'admin';

    const existing = await this.users.findByEmail(email);
    if (existing) {
      this.logger.log(`Admin ${email} already exists, skipping seed`);
      return;
    }

    await this.users.create({ email, password, role: Role.ADMIN });
    this.logger.log(`Seeded default admin user: ${email}`);
  }
}
