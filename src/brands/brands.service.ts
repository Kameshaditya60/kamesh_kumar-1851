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
import { ArticleStatus } from '../articles/enums/article-status.enum';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/user.entity';
import { BrandAuthor } from './brand-author.entity';
import { BrandStatus } from './enums/brand-status.enum';
import { Brand } from './brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { ListBrandsDto } from './dto/list-brands.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brands: Repository<Brand>,
  ) {}

  findAll(): Promise<Brand[]> {
    return this.brands.find({
      relations: { createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findAllPaginated(
    query: ListBrandsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedResult<Brand>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const qb = this.brands
      .createQueryBuilder('brand')
      .leftJoinAndSelect('brand.createdBy', 'createdBy')
      .orderBy('brand.createdAt', 'DESC');

    if (actor.role !== Role.ADMIN) {
      qb.andWhere('brand.status = :approved', {
        approved: BrandStatus.APPROVED,
      });
    }

    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
    };
  }

  async findById(id: number): Promise<Brand> {
    const brand = await this.brands.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }

  async findProfileById(
    id: number,
    actor: AuthenticatedUser,
  ): Promise<Brand & { publishedArticleCount: number }> {
    const brand = await this.brands.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (
      !brand ||
      (brand.status === BrandStatus.DISAPPROVED && actor.role !== Role.ADMIN)
    ) {
      throw new NotFoundException(`Brand ${id} not found`);
    }

    const publishedArticleCount = await this.brands.manager
      .getRepository(Article)
      .count({
        where: { brandId: id, status: ArticleStatus.PUBLISHED },
      });

    return Object.assign(brand, { publishedArticleCount });
  }

  async assertBrandVisible(
    id: number,
    actor: AuthenticatedUser,
  ): Promise<Brand> {
    const brand = await this.brands.findOne({ where: { id } });
    if (
      !brand ||
      (brand.status === BrandStatus.DISAPPROVED && actor.role !== Role.ADMIN)
    ) {
      throw new NotFoundException(`Brand ${id} not found`);
    }
    return brand;
  }

  async create(dto: CreateBrandDto, createdById: string): Promise<Brand> {
    return this.brands.manager.transaction(async (manager) => {
      const users = manager.getRepository(User);
      const brands = manager.getRepository(Brand);

      const target = await users.findOne({ where: { id: dto.userId } });
      if (!target) {
        throw new NotFoundException(`User ${dto.userId} not found`);
      }
      if (target.role !== Role.BRAND) {
        throw new BadRequestException(
          'Brand can only be created for a user with role BRAND',
        );
      }
      if (target.brandId !== null) {
        throw new ConflictException('User already has a brand assigned');
      }

      const brand = brands.create({
        name: dto.name,
        description: dto.description ?? null,
        logoUrl: dto.logoUrl ?? null,
        createdById,
      });
      const saved = await brands.save(brand);

      target.brandId = saved.id;
      await users.save(target);

      return saved;
    });
  }

  async update(id: number, dto: UpdateBrandDto): Promise<Brand> {
    return this.brands.manager.transaction(async (manager) => {
      const brands = manager.getRepository(Brand);
      const users = manager.getRepository(User);

      const brand = await brands.findOne({ where: { id } });
      if (!brand) throw new NotFoundException(`Brand ${id} not found`);

      if (dto.name !== undefined) brand.name = dto.name;
      if (dto.description !== undefined) brand.description = dto.description;
      if (dto.logoUrl !== undefined) brand.logoUrl = dto.logoUrl;
      await brands.save(brand);

      if (dto.email !== undefined || dto.password !== undefined) {
        const owner = await users.findOne({ where: { brandId: id } });
        if (!owner) {
          throw new BadRequestException(
            `Brand ${id} has no bound user to update credentials on`,
          );
        }

        if (dto.email !== undefined && dto.email !== owner.email) {
          const collision = await users.findOne({
            where: { email: dto.email },
          });
          if (collision && collision.id !== owner.id) {
            throw new ConflictException('Email already in use');
          }
          owner.email = dto.email;
        }

        if (dto.password !== undefined) {
          owner.password = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
        }

        await users.save(owner);
      }

      return brand;
    });
  }

  async updateStatus(id: number, status: BrandStatus): Promise<Brand> {
    const brand = await this.findById(id);
    brand.status = status;
    return this.brands.save(brand);
  }

  async delete(id: number): Promise<void> {
    const result = await this.brands.delete({ id });
    if (!result.affected) throw new NotFoundException(`Brand ${id} not found`);
  }

  async assignAuthor(brandId: number, authorId: string): Promise<BrandAuthor> {
    return this.brands.manager.transaction(async (manager) => {
      const brands = manager.getRepository(Brand);
      const users = manager.getRepository(User);
      const brandAuthors = manager.getRepository(BrandAuthor);

      const brand = await brands.findOne({ where: { id: brandId } });
      if (!brand) throw new NotFoundException(`Brand ${brandId} not found`);

      const author = await users.findOne({ where: { id: authorId } });
      if (!author) throw new NotFoundException(`User ${authorId} not found`);
      if (author.role !== Role.AUTHOR) {
        throw new BadRequestException(
          'Only users with role AUTHOR can be assigned to a brand',
        );
      }

      const existing = await brandAuthors.findOne({
        where: { brandId, authorId },
      });
      if (existing) {
        throw new ConflictException(
          `Author ${authorId} is already assigned to brand ${brandId}`,
        );
      }

      const row = brandAuthors.create({ brandId, authorId });
      return brandAuthors.save(row);
    });
  }
}
