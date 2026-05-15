import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Brand } from './brand.entity';

@Entity({ name: 'brand_authors' })
@Unique(['brandId', 'authorId'])
export class BrandAuthor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'int' })
  brandId!: number;

  @ManyToOne(() => Brand, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'brandId' })
  brand!: Brand;

  @Column({ type: 'uuid' })
  authorId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorId' })
  author!: User;

  @CreateDateColumn()
  createdAt!: Date;
}
