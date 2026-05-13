import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../users/enums/role.enum';
import { User } from '../users/user.entity';
import { BrandStatus } from './enums/brand-status.enum';
import { Brand } from './brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private readonly brands: Repository<Brand>,
  ) { }

  findAll(): Promise<Brand[]> {
    return this.brands.find({
      relations: { createdBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: number): Promise<Brand> {
    const brand = await this.brands.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
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
    const brand = await this.findById(id);
    if (dto.name !== undefined) brand.name = dto.name;
    if (dto.description !== undefined) brand.description = dto.description;
    if (dto.logoUrl !== undefined) brand.logoUrl = dto.logoUrl;
    return this.brands.save(brand);
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
}
