import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Article } from '../articles/article.entity';
import { PaginatedResult } from '../articles/articles.service';
import { BrandAuthor } from '../brands/brand-author.entity';
import { Brand } from '../brands/brand.entity';
import { MailService } from '../mail/mail.service';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/user.entity';
import { CreateAuthorDto } from './dto/create-author.dto';
import { ListAuthorsDto } from './dto/list-authors.dto';
import { UpdateAuthorProfileDto } from './dto/update-author-profile.dto';

const BCRYPT_ROUNDS = 10;

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

  async updateOwnProfile(
    userId: string,
    dto: UpdateAuthorProfileDto,
  ): Promise<User & { assignedBrands: Brand[] }> {
    const author = await this.findAuthorOrThrow(userId);

    if (dto.email !== undefined && dto.email !== author.email) {
      const collision = await this.users.findOne({
        where: { email: dto.email },
      });
      if (collision && collision.id !== author.id) {
        throw new BadRequestException('Email already in use');
      }
      author.email = dto.email;
    }

    if (dto.name !== undefined) {
      author.name = dto.name;
    }

    if (dto.password !== undefined) {
      author.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    }

    await this.users.save(author);

    return this.getAuthorById(userId);
  }

  async deleteAuthor(id: string): Promise<void> {
    await this.findAuthorOrThrow(id);

    // Article.authorId is ON DELETE RESTRICT, so an author with articles
    // cannot be removed. Check up front and return a clear 409 rather
    // than letting the FK violation surface as a 500.
    const articleCount = await this.users.manager
      .getRepository(Article)
      .count({ where: { authorId: id } });
    if (articleCount > 0) {
      throw new ConflictException(
        'Author has articles and cannot be deleted. Reassign or delete their articles first.',
      );
    }

    // brand_authors rows cascade away via their ON DELETE CASCADE FK.
    await this.users.delete({ id });
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
