import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBrandDto, UpdateBrandDto } from './brands.dto';

export const DEFAULT_SPOTLIGHT_BRANDS = [
  { name: 'ROADSTER', offer: 'UNDER ₹799', imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400', query: 'Roadster', order: 1, isActive: true },
  { name: 'NIKE', offer: 'MIN. 40% OFF', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', query: 'Nike', order: 2, isActive: true },
  { name: 'HIGHLANDER', offer: 'FLAT 60% OFF', imageUrl: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=400', query: 'Highlander', order: 3, isActive: true },
  { name: "LEVI'S", offer: 'MIN. 50% OFF', imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400', query: "Levi's", order: 4, isActive: true },
  { name: 'PUMA', offer: 'FROM ₹899', imageUrl: 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=400', query: 'Puma', order: 5, isActive: true },
  { name: 'ZARA', offer: 'NEW SEASON', imageUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400', query: 'Zara', order: 6, isActive: true },
  { name: 'HRX', offer: 'UNDER ₹699', imageUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', query: 'HRX', order: 7, isActive: true },
  { name: 'NOVA TECH', offer: 'FLAT 50% OFF', imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', query: 'Nova', order: 8, isActive: true },
];

@Injectable()
export class BrandsService {
  constructor(private prisma: PrismaService) {}

  private async ensureDefaultsIfEmpty() {
    const count = await this.prisma.brand.count({
      where: { deletedAt: null },
    });
    if (count === 0) {
      for (const b of DEFAULT_SPOTLIGHT_BRANDS) {
        await this.prisma.brand.upsert({
          where: { name: b.name },
          update: { deletedAt: null, isActive: true },
          create: b,
        }).catch(() => {});
      }
    }
  }

  async findAllActive() {
    await this.ensureDefaultsIfEmpty();
    return this.prisma.brand.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findAllAdmin() {
    await this.ensureDefaultsIfEmpty();
    return this.prisma.brand.findMany({
      where: { deletedAt: null },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findById(id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: CreateBrandDto) {
    const existing = await this.prisma.brand.findFirst({
      where: { name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Brand '${dto.name}' already exists`);
    }

    return this.prisma.brand.create({
      data: {
        name: dto.name.toUpperCase().trim(),
        offer: dto.offer.toUpperCase().trim(),
        imageUrl: dto.imageUrl.trim(),
        query: dto.query.trim(),
        order: dto.order ?? 0,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async update(id: string, dto: UpdateBrandDto) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    if (dto.name && dto.name.toUpperCase().trim() !== brand.name) {
      const existing = await this.prisma.brand.findFirst({
        where: { name: { equals: dto.name, mode: 'insensitive' }, deletedAt: null },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Brand '${dto.name}' already exists`);
      }
    }

    return this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.toUpperCase().trim() } : {}),
        ...(dto.offer ? { offer: dto.offer.toUpperCase().trim() } : {}),
        ...(dto.imageUrl ? { imageUrl: dto.imageUrl.trim() } : {}),
        ...(dto.query ? { query: dto.query.trim() } : {}),
        ...(dto.order !== undefined ? { order: dto.order } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async delete(id: string) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, deletedAt: null },
    });
    if (!brand) throw new NotFoundException('Brand not found');

    return this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }
}
