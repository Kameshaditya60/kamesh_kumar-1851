import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Article } from './articles/article.entity';
import { BrandAuthor } from './brands/brand-author.entity';
import { Brand } from './brands/brand.entity';
import { User } from './users/user.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [User, Brand, BrandAuthor, Article],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
