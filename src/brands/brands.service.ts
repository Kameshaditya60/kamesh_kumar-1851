import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './brand.entity';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';

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

  async findById(id: number): Promise<Brand> {
    const brand = await this.brands.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!brand) throw new NotFoundException(`Brand ${id} not found`);
    return brand;
  }

  async create(dto: CreateBrandDto, createdById: string): Promise<Brand> {
    const brand = this.brands.create({
      name: dto.name,
      description: dto.description ?? null,
      logoUrl: dto.logoUrl ?? null,
      createdById,
    });
    return this.brands.save(brand);
  }

  async update(id: number, dto: UpdateBrandDto): Promise<Brand> {
    const brand = await this.findById(id);
    if (dto.name !== undefined) brand.name = dto.name;
    if (dto.description !== undefined) brand.description = dto.description;
    if (dto.logoUrl !== undefined) brand.logoUrl = dto.logoUrl;
    return this.brands.save(brand);
  }

  async delete(id: number): Promise<void> {
    const result = await this.brands.delete({ id });
    if (!result.affected) throw new NotFoundException(`Brand ${id} not found`);
  }
}
