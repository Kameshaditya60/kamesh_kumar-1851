import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { PaginatedResult } from '../articles/articles.service';
import { BrandAuthor } from '../brands/brand-author.entity';
import { Brand } from '../brands/brand.entity';
import { MailService } from '../mail/mail.service';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/user.entity';
import { CreateAuthorDto } from './dto/create-author.dto';
import { ListAuthorsDto } from './dto/list-authors.dto';

const BCRYPT_ROUNDS = 10;
const PG_FK_VIOLATION = '23503';

@Injectable()
export class AuthorsService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(BrandAuthor)
    private readonly brandAuthors: Repository<BrandAuthor>,
    private readonly mail: MailService,
  ) {}

  async createAuthor(dto: CreateAuthorDto): Promise<User> {
    const existing = await this.users.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const hash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const created = await this.users.save(
      this.users.create({
        name: dto.name,
        email: dto.email,
        password: hash,
        role: Role.AUTHOR,
        brandId: null,
      }),
    );

    await this.mail.sendWelcomeEmail(dto.email, dto.password);

    // Re-fetch via a query so the select:false password is not returned.
    return this.users.findOneOrFail({ where: { id: created.id } });
  }

  async listAuthors(query: ListAuthorsDto): Promise<PaginatedResult<User>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [data, total] = await this.users.findAndCount({
      where: { role: Role.AUTHOR },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
    };
  }

  async getAuthorById(
    id: string,
  ): Promise<User & { assignedBrands: Brand[] }> {
    const author = await this.findAuthorOrThrow(id);
    const assignedBrands = await this.getAssignedBrands(id);
    return Object.assign(author, { assignedBrands });
  }

  async deleteAuthor(id: string): Promise<void> {
    await this.findAuthorOrThrow(id);
    try {
      // brand_authors rows cascade away via the ON DELETE CASCADE FK.
      await this.users.delete({ id });
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err.driverError as { code?: string }).code === PG_FK_VIOLATION
      ) {
        throw new ConflictException(
          'Author has articles and cannot be deleted. Reassign or delete their articles first.',
        );
      }
      throw err;
    }
  }

  private async findAuthorOrThrow(id: string): Promise<User> {
    const author = await this.users.findOne({
      where: { id, role: Role.AUTHOR },
    });
    if (!author) throw new NotFoundException(`Author ${id} not found`);
    return author;
  }

  private async getAssignedBrands(authorId: string): Promise<Brand[]> {
    const rows = await this.brandAuthors.find({
      where: { authorId },
      relations: { brand: true },
    });
    return rows.map((row) => row.brand);
  }
}
