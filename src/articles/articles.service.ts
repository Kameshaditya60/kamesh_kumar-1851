import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/current-user.decorator';
import { BrandAuthor } from '../brands/brand-author.entity';
import { Brand } from '../brands/brand.entity';
import { Role } from '../users/enums/role.enum';
import { Article } from './article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { ListArticlesDto } from './dto/list-articles.dto';
import { ListPublicArticlesDto } from './dto/list-public-articles.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleSortBy } from './enums/article-sort-by.enum';
import { ArticleStatus } from './enums/article-status.enum';
import { SortOrder } from './enums/sort-order.enum';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  totalPages: number;
  currentPage: number;
}

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articles: Repository<Article>,
  ) {}

  async create(
    dto: CreateArticleDto,
    actor: AuthenticatedUser,
  ): Promise<Article> {
    const brand = await this.articles.manager
      .getRepository(Brand)
      .findOne({ where: { id: dto.brandId } });
    if (!brand) {
      throw new NotFoundException(`Brand ${dto.brandId} not found`);
    }

    await this.assertCanWriteFor(dto.brandId, actor);

    const article = this.articles.create({
      title: dto.title,
      content: dto.content,
      brandId: dto.brandId,
      authorId: actor.id,
    });
    const saved = await this.articles.save(article);
    return this.findById(saved.id);
  }

  async findById(id: number): Promise<Article> {
    const article = await this.articles.findOne({
      where: { id },
      relations: { author: true, brand: true },
    });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }

  async getOne(id: number, actor: AuthenticatedUser): Promise<Article> {
    const article = await this.findById(id);
    this.assertCanRead(article, actor);
    return article;
  }

  async list(
    actor: AuthenticatedUser,
    query: ListArticlesDto,
  ): Promise<PaginatedResult<Article>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? ArticleSortBy.CreatedAt;
    const direction: 'ASC' | 'DESC' =
      (query.order ?? SortOrder.Desc) === SortOrder.Asc ? 'ASC' : 'DESC';

    if (actor.role === Role.BRAND && actor.brandId === null) {
      return { data: [], total: 0, totalPages: 1, currentPage: page };
    }

    const qb = this.articles
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.brand', 'brand');

    if (actor.role === Role.BRAND) {
      qb.andWhere('article.brandId = :scopedBrandId', {
        scopedBrandId: actor.brandId,
      });
    } else if (actor.role === Role.AUTHOR) {
      qb.andWhere('article.authorId = :scopedAuthorId', {
        scopedAuthorId: actor.id,
      });
    } else if (actor.role !== Role.ADMIN) {
      throw new ForbiddenException();
    }

    if (query.status !== undefined) {
      qb.andWhere('article.status = :status', { status: query.status });
    }
    if (query.brandId !== undefined && actor.role !== Role.BRAND) {
      qb.andWhere('article.brandId = :filterBrandId', {
        filterBrandId: query.brandId,
      });
    }

    qb.orderBy(`article.${sortBy}`, direction)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
    };
  }

  async update(
    id: number,
    dto: UpdateArticleDto,
    actor: AuthenticatedUser,
  ): Promise<Article> {
    const article = await this.findById(id);
    this.assertCanModify(article, actor);
    if (dto.title !== undefined) article.title = dto.title;
    if (dto.content !== undefined) article.content = dto.content;
    return this.articles.save(article);
  }

  async delete(id: number, actor: AuthenticatedUser): Promise<void> {
    const article = await this.findById(id);
    this.assertCanModify(article, actor);
    await this.articles.delete({ id });
  }

  async listPublic(
    query: ListPublicArticlesDto,
  ): Promise<PaginatedResult<Article>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? ArticleSortBy.PublishedAt;
    const direction: 'ASC' | 'DESC' =
      (query.order ?? SortOrder.Desc) === SortOrder.Asc ? 'ASC' : 'DESC';

    const qb = this.articles
      .createQueryBuilder('article')
      .leftJoinAndSelect('article.author', 'author')
      .leftJoinAndSelect('article.brand', 'brand')
      .where('article.status = :status', { status: ArticleStatus.PUBLISHED });

    if (query.brandId !== undefined) {
      qb.andWhere('article.brandId = :brandId', { brandId: query.brandId });
    }

    if (query.q && query.q.trim()) {
      qb.andWhere('(article.title ILIKE :q OR article.content ILIKE :q)', {
        q: `%${query.q.trim()}%`,
      });
    }

    qb.orderBy(`article.${sortBy}`, direction)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      currentPage: page,
    };
  }

  async getPublicById(id: number): Promise<Article> {
    const article = await this.articles.findOne({
      where: { id, status: ArticleStatus.PUBLISHED },
      relations: { author: true, brand: true },
    });
    if (!article) throw new NotFoundException(`Article ${id} not found`);
    return article;
  }

  async updateStatus(id: number, status: ArticleStatus): Promise<Article> {
    const article = await this.findById(id);
    article.status = status;
    if (status === ArticleStatus.PUBLISHED && article.publishedAt === null) {
      article.publishedAt = new Date();
    }
    return this.articles.save(article);
  }

  private async assertCanWriteFor(
    brandId: number,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.BRAND && actor.brandId === brandId) return;
    if (actor.role === Role.AUTHOR) {
      const approval = await this.articles.manager
        .getRepository(BrandAuthor)
        .findOne({ where: { brandId, authorId: actor.id } });
      if (approval) return;
    }
    throw new ForbiddenException(
      'You cannot write articles for this brand',
    );
  }

  private assertCanRead(article: Article, actor: AuthenticatedUser): void {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.BRAND && article.brandId === actor.brandId) return;
    if (actor.role === Role.AUTHOR && article.authorId === actor.id) return;
    throw new ForbiddenException('You cannot view this article');
  }

  private assertCanModify(article: Article, actor: AuthenticatedUser): void {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.BRAND && article.brandId === actor.brandId) return;
    if (actor.role === Role.AUTHOR && article.authorId === actor.id) return;
    throw new ForbiddenException('You cannot modify this article');
  }
}
