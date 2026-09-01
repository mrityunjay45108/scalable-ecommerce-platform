import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './categories.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAllTree() {
    const categories = await this.prisma.category.findMany({
      where: { parentId: null, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          include: {
            children: { where: { deletedAt: null } },
            _count: { select: { products: { where: { deletedAt: null } } } },
          },
        },
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async findAllFlat() {
    return this.prisma.category.findMany({
      where: { deletedAt: null },
      include: {
        parent: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
        parent: true,
        _count: { select: { products: { where: { deletedAt: null } } } },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }

    return category;
  }

  async create(dto: CreateCategoryDto) {
    const slug = dto.slug || this.slugify(dto.name);

    const existing = await this.prisma.category.findFirst({
      where: { slug, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException(`Category with slug '${slug}' already exists`);
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId || null,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!category) throw new NotFoundException('Category not found');

    const slug = dto.slug || (dto.name ? this.slugify(dto.name) : category.slug);

    if (slug !== category.slug) {
      const existing = await this.prisma.category.findFirst({
        where: { slug, deletedAt: null },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Category with slug '${slug}' already exists`);
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ?? category.name,
        slug,
        description: dto.description,
        imageUrl: dto.imageUrl,
        parentId: dto.parentId !== undefined ? dto.parentId : category.parentId,
      },
    });
  }

  async delete(id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
      include: {
        children: { where: { deletedAt: null } },
        products: { where: { deletedAt: null } },
      },
    });

    if (!category) throw new NotFoundException('Category not found');
    if (category.products.length > 0) {
      throw new ConflictException('Cannot delete category with active associated products');
    }
    if (category.children.length > 0) {
      throw new ConflictException('Cannot delete category that contains subcategories');
    }

    // Soft delete
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: 'Category deleted successfully' };
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
