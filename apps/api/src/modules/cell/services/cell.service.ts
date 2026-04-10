import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, Optional } from '@nestjs/common';
import { CellRepository } from '../repositories/cell.repository';
import { CreateCellDto } from '../dto/create-cell.dto';
import { UpdateCellDto } from '../dto/update-cell.dto';
import { AssignAttributeDto } from '../dto/assign-attribute.dto';
import { Prisma } from '@prisma/client';
import { StorageService } from '@modules/storage/storage.service';
import { randomBytes } from 'crypto';

@Injectable()
export class CellService {
  private readonly logger = new Logger(CellService.name);

  constructor(
    private readonly cellRepository: CellRepository,
    @Optional() private readonly storageService?: StorageService,
  ) {}

  async create(userId: string, dto: CreateCellDto) {
    // Validate that categoryId is a leaf category
    const category = await this.cellRepository.findLeafCategoryById(dto.categoryId);

    if (!category.isLeaf) {
      throw new BadRequestException('Cells can only be created under leaf categories (categories with no children)');
    }

    // Generate slug if not provided
    const slug = dto.slug || this.generateSlug(dto.name);

    // Check if slug already exists
    const existingCell = await this.cellRepository.findBySlug(slug);
    if (existingCell) {
      throw new ConflictException('A cell with this slug already exists');
    }

    // Generate SKU if not provided
    const sku = dto.sku || this.generateSku();

    // Check if SKU already exists
    if (sku) {
      const existingSku = await this.cellRepository.findBySku(sku);
      if (existingSku) {
        throw new ConflictException('A cell with this SKU already exists');
      }
    }

    const cellData: Prisma.CellCreateInput = {
      name: dto.name,
      slug,
      sku,
      description: dto.description,
      sortOrder: dto.sortOrder ?? 0,
      isActive: dto.isActive ?? true,
      category: {
        connect: { id: dto.categoryId },
      },
      ...(dto.imageUrl && { imageUrl: dto.imageUrl }),
      createdBy: userId,
    };

    return this.cellRepository.create(cellData);
  }

  async update(id: string, userId: string, dto: UpdateCellDto) {
    const existingCell = await this.cellRepository.findById(id);
    if (!existingCell) {
      throw new NotFoundException('Cell not found');
    }

    // Generate slug if name is provided but slug is not
    let slug = dto.slug;
    if (dto.name && !slug) {
      slug = this.generateSlug(dto.name);
    }

    // Check if new slug conflicts with existing cell (excluding current cell)
    if (slug && slug !== existingCell.slug) {
      const conflictCell = await this.cellRepository.findBySlug(slug);
      if (conflictCell) {
        throw new ConflictException('A cell with this slug already exists');
      }
    }

    // Check if SKU conflicts with existing cell
    if (dto.sku && dto.sku !== existingCell.sku) {
      const conflictSku = await this.cellRepository.findBySku(dto.sku);
      if (conflictSku) {
        throw new ConflictException('A cell with this SKU already exists');
      }
    }

    // Clean up old image from SeaweedFS if imageUrl is being changed or set to null
    if (dto.imageUrl !== undefined && existingCell.imageUrl && dto.imageUrl !== existingCell.imageUrl) {
      await this.deleteStorageFile(existingCell.imageUrl);
    }

    const updateData: Prisma.CellUpdateInput = {
      ...(dto.name && { name: dto.name }),
      ...(slug && { slug }),
      ...(dto.sku !== undefined && { sku: dto.sku }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.imageUrl !== undefined && { imageUrl: dto.imageUrl }),
      updatedBy: userId,
    };

    return this.cellRepository.update(id, updateData);
  }

  async delete(id: string) {
    // Check if cell exists
    const cell = await this.cellRepository.findById(id);
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    // Check if cell has products
    const productCount = await this.cellRepository.countProducts(id);
    if (productCount > 0) {
      throw new BadRequestException(
        `Cannot delete cell because it has ${productCount} product(s). Delete the products first.`
      );
    }

    return this.cellRepository.delete(id);
  }

  async findById(id: string) {
    const cell = await this.cellRepository.findById(id);
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }
    return cell;
  }

  async findBySlug(slug: string) {
    const cell = await this.cellRepository.findBySlug(slug);
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }
    return cell;
  }

  async findByCategoryId(categoryId: string, activeOnly: boolean = false) {
    return this.cellRepository.findByCategoryId(categoryId, activeOnly);
  }

  async list(params: {
    skip?: number;
    take?: number;
    categoryId?: string;
    activeOnly?: boolean;
  }) {
    return this.cellRepository.list(params);
  }

  async assignAttribute(cellId: string, dto: AssignAttributeDto) {
    // Check if cell exists
    const cell = await this.cellRepository.findById(cellId);
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    return this.cellRepository.addAttribute(
      cellId,
      dto.attributeId,
      dto.displayOrder ?? 0
    );
  }

  async removeAttribute(cellId: string, attributeId: string) {
    // Check if cell exists
    const cell = await this.cellRepository.findById(cellId);
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    return this.cellRepository.removeAttribute(cellId, attributeId);
  }

  async getAttributes(cellId: string) {
    // Check if cell exists
    const cell = await this.cellRepository.findById(cellId);
    if (!cell) {
      throw new NotFoundException('Cell not found');
    }

    return this.cellRepository.getAttributes(cellId);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private generateSku(): string {
    const randomPart = randomBytes(4).toString('hex').toUpperCase();
    return `C-${randomPart}`;
  }

  private async deleteStorageFile(imageUrl: string): Promise<void> {
    if (!this.storageService || !imageUrl) return;
    const storageKey = imageUrl.startsWith('/') ? imageUrl.slice(1) : imageUrl;
    try {
      await this.storageService.deleteFile(storageKey);
    } catch (error) {
      this.logger.warn(`Failed to delete old file from SeaweedFS: ${storageKey}`, error);
    }
  }
}
