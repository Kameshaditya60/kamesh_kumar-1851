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
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleStatus } from './enums/article-status.enum';

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

  async list(actor: AuthenticatedUser): Promise<Article[]> {
    const baseOptions = {
      relations: { author: true, brand: true },
      order: { createdAt: 'DESC' as const },
    };
    if (actor.role === Role.ADMIN) {
      return this.articles.find(baseOptions);
    }
    if (actor.role === Role.BRAND) {
      if (actor.brandId === null) return [];
      return this.articles.find({
        ...baseOptions,
        where: { brandId: actor.brandId },
      });
    }
    if (actor.role === Role.AUTHOR) {
      return this.articles.find({
        ...baseOptions,
        where: { authorId: actor.id },
      });
    }
    throw new ForbiddenException();
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
