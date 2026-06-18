import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DatabaseProvider } from '@core/database/database.provider';
import { BaseService } from '@shared/domain';
import { randomBytes } from 'crypto';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductRepository } from '../repositories/product.repository';
import { ProductImageRepository } from '../repositories/product-image.repository';
import { ProductVariantRepository } from '../repositories/product-variant.repository';
import { CellRepository } from '@modules/cell/repositories/cell.repository';
import { CreateSimpleProductDto } from '../dto/create-simple-product.dto';
import { CreateSimpleProductImageDto } from '../dto/create-simple-product-image.dto';
import { UpdateSimpleProductDto } from '../dto/update-simple-product.dto';
import { SetSimpleProductAttributeDto } from '../dto/set-simple-product-attribute.dto';

@Injectable()
export class SimpleProductService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly db: DatabaseProvider,
    private readonly categoryRepo: CategoryRepository,
    private readonly productRepo: ProductRepository,
    private readonly imageRepo: ProductImageRepository,
    private readonly variantRepo: ProductVariantRepository,
    private readonly cellRepo: CellRepository,
  ) {
    super(eventEmitter);
  }

  /**
   * Find all simple products in a category (flat list across all cells).
   */
  async findByCategory(categoryId: string, activeOnly = false): Promise<any[]> {
    // Find all cells under this category
    const cells = await this.db.cell.findMany({
      where: { categoryId, isActive: true },
      select: { id: true },
    });

    if (cells.length === 0) return [];

    const cellIds = cells.map((cell: any) => cell.id);

    const whereClause: any = { cellId: { in: cellIds } };
    if (activeOnly) {
      whereClause.status = 'active';
    }

    return this.db.product.findMany({
      where: whereClause,
      orderBy: { name: 'asc' },
      include: {
        images: {
          where: { variantId: null },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        variants: {
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
          include: {
            variantImages: {
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            },
          },
        },
      },
    });
  }

  /**
   * Find simple products by category slug (public endpoint).
   */
  async findByCategorySlug(slug: string): Promise<any[]> {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return this.findByCategory(category.id, true);
  }

  /**
   * Find a single simple product by ID.
   */
  async findById(productId: string): Promise<any> {
    const product = await this.db.product.findUnique({
      where: { id: productId },
      include: {
        images: {
          where: { variantId: null },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        variants: {
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
          include: {
            variantImages: {
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Simple product not found');
    }

    return product;
  }

  /**
   * Find a single simple product within a category.
   */
  async findByCategoryAndProductId(categoryId: string, productId: string): Promise<any> {
    // Verify the product belongs to this category
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Simple product not found');
    }

    // Check the product's cell belongs to the given category
    if (product.cellId) {
      const cell = await this.cellRepo.findById(product.cellId);
      if (!cell || cell.categoryId !== categoryId) {
        throw new NotFoundException('Simple product not found in this category');
      }
    }

    return this.findById(productId);
  }

  /**
   * Create a simple product under a category.
   * Auto-creates a "General" cell if one doesn't exist, and a default variant.
   */
  async create(categoryId: string, dto: CreateSimpleProductDto): Promise<any> {
    // Verify category exists
    const category = await this.categoryRepo.findById(categoryId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Find or create a "General" cell for this category
    const cell = await this.findOrCreateGeneralCell(category);

    // Generate slug if not provided
    const slug = dto.slug ?? this.generateSlug(dto.name);

    // Check slug uniqueness
    const existingSlug = await this.productRepo.findBySlug(slug);
    if (existingSlug) {
      throw new ConflictException(`A product with slug "${slug}" already exists`);
    }

    // Generate SKU if not provided
    const sku = dto.sku ?? this.generateProductSku();

    // Check SKU uniqueness if provided
    if (dto.sku) {
      const existingSku = await this.productRepo.findBySku(dto.sku);
      if (existingSku) {
        throw new ConflictException(`A product with SKU "${dto.sku}" already exists`);
      }
    }

    // Create the product with type=SIMPLE and status=ACTIVE
    const product = await this.productRepo.create({
      sku,
      name: dto.name,
      slug,
      description: dto.description ?? null,
      type: 'simple',
      status: 'active',
      price: dto.price ?? null,
      cellId: cell.id,
      isFeatured: false,
      currency: 'SAR',
      quantity: dto.quantity ?? 1,
      thumbnailUrl: dto.thumbnailUrl ?? null,
    });

    // Auto-create a default variant so the product is visible everywhere
    const variantQuantity = dto.quantity ?? 1;
    await this.variantRepo.create({
      productId: product.id,
      sku: this.generateVariantSku(),
      name: dto.name,
      price: dto.price ?? null,
      quantity: variantQuantity,
      attributes: {},
      isDefault: true,
    });

    // If thumbnailUrl was provided, also create a ProductImage record
    if (dto.thumbnailUrl) {
      await this.imageRepo.create({
        productId: product.id,
        url: dto.thumbnailUrl,
        altText: dto.name,
        sortOrder: 1,
        isPrimary: true,
        variantId: null,
      });
    }

    return this.findById(product.id);
  }

  /**
   * Update a simple product.
   */
  async update(productId: string, dto: UpdateSimpleProductDto): Promise<any> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Simple product not found');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.price !== undefined) updateData.price = dto.price;
    if (dto.quantity !== undefined) updateData.quantity = dto.quantity;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.thumbnailUrl !== undefined) updateData.thumbnailUrl = dto.thumbnailUrl;
    if (dto.status !== undefined) updateData.status = dto.status;

    if (dto.slug !== undefined) {
      // Check slug uniqueness if changing
      if (dto.slug !== product.slug) {
        const existing = await this.productRepo.findBySlug(dto.slug);
        if (existing) {
          throw new ConflictException(`A product with slug "${dto.slug}" already exists`);
        }
      }
      updateData.slug = dto.slug;
    }

    await this.productRepo.update(productId, updateData);

    return this.findById(productId);
  }

  /**
   * Delete a simple product (cascades to variants and images).
   */
  async delete(productId: string): Promise<void> {
    const product = await this.productRepo.findById(productId);
    if (!product) {
      throw new NotFoundException('Simple product not found');
    }
    await this.productRepo.delete(productId);
  }

  /**
   * Add an image to a simple product.
   */
  async addImage(
    categoryId: string,
    productId: string,
    dto: CreateSimpleProductImageDto,
  ): Promise<any> {
    // Verify the product exists and belongs to this category
    await this.findByCategoryAndProductId(categoryId, productId);

    // If this image is set as primary, unset any existing primary
    if (dto.isPrimary) {
      const existingImages = await this.imageRepo.findByProductId(productId);
      for (const img of existingImages) {
        if (img.isPrimary) {
          await this.imageRepo.update(img.id, { isPrimary: false });
        }
      }
    }

    const existingImages = await this.imageRepo.findByProductId(productId);
    const nextSortOrder = dto.sortOrder ?? existingImages.length + 1;

    const image = await this.imageRepo.create({
      productId,
      url: dto.url,
      altText: dto.altText ?? null,
      sortOrder: nextSortOrder,
      isPrimary: dto.isPrimary ?? existingImages.length === 0,
      variantId: null,
    });

    // If this is the first image, also set as thumbnailUrl on the product
    if (existingImages.length === 0 && !dto.isPrimary) {
      await this.productRepo.update(productId, {
        thumbnailUrl: dto.url,
      });
    }

    return image;
  }

  /**
   * Get all images for a simple product.
   */
  async getImages(categoryId: string, productId: string): Promise<any[]> {
    await this.findByCategoryAndProductId(categoryId, productId);
    return this.imageRepo.findByProductId(productId);
  }

  /**
   * Update an image for a simple product.
   */
  async updateImage(
    categoryId: string,
    productId: string,
    imageId: string,
    data: { altText?: string; isPrimary?: boolean; sortOrder?: number },
  ): Promise<any> {
    await this.findByCategoryAndProductId(categoryId, productId);

    const image = await this.imageRepo.findById(imageId);
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    if (data.isPrimary === true) {
      const existingImages = await this.imageRepo.findByProductId(productId);
      for (const img of existingImages) {
        if (img.isPrimary && img.id !== imageId) {
          await this.imageRepo.update(img.id, { isPrimary: false });
        }
      }
    }

    const updateData: Partial<{
      url: string;
      altText: string | null;
      isPrimary: boolean;
      sortOrder: number;
    }> = {};

    if (data.altText !== undefined) updateData.altText = data.altText;
    if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

    const updatedImage = await this.imageRepo.update(imageId, updateData);

    // Update thumbnailUrl on product if this image is primary or it's the first image
    if (data.isPrimary) {
      await this.productRepo.update(productId, {
        thumbnailUrl: updatedImage.url,
      });
    }

    return updatedImage;
  }

  /**
   * Delete an image from a simple product.
   */
  async deleteImage(
    categoryId: string,
    productId: string,
    imageId: string,
  ): Promise<void> {
    await this.findByCategoryAndProductId(categoryId, productId);

    const image = await this.imageRepo.findById(imageId);
    if (!image) {
      throw new NotFoundException('Image not found');
    }

    await this.imageRepo.delete(imageId);

    // If the deleted image was the thumbnail, update the product
    const remainingImages = await this.imageRepo.findByProductId(productId);
    const product = await this.productRepo.findById(productId);
    if (product && product.thumbnailUrl === image.url) {
      await this.productRepo.update(productId, {
        thumbnailUrl: remainingImages.length > 0 ? remainingImages[0].url : null,
      });
    }
  }

  // ============================================
  // Attribute Value Management
  // ============================================

  /**
   * Get all attribute values for a simple product.
   */
  async getAttributeValues(categoryId: string, productId: string): Promise<any[]> {
    await this.findByCategoryAndProductId(categoryId, productId);

    return this.db.productAttributeValue.findMany({
      where: { productId },
      include: {
        attribute: true,
        option: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Set or update an attribute value on a simple product.
   */
  async setAttributeValue(
    categoryId: string,
    productId: string,
    dto: SetSimpleProductAttributeDto,
  ): Promise<any> {
    await this.findByCategoryAndProductId(categoryId, productId);

    // Upsert the attribute value
    return this.db.productAttributeValue.upsert({
      where: {
        productId_attributeId: {
          productId,
          attributeId: dto.attributeId,
        },
      },
      create: {
        productId,
        attributeId: dto.attributeId,
        rawValue: dto.rawValue ?? null,
        numberValue: dto.numberValue ?? null,
        textValue: dto.textValue ?? null,
        optionId: dto.optionId ?? null,
        booleanValue: dto.booleanValue ?? null,
      },
      update: {
        rawValue: dto.rawValue ?? null,
        numberValue: dto.numberValue ?? null,
        textValue: dto.textValue ?? null,
        optionId: dto.optionId ?? null,
        booleanValue: dto.booleanValue ?? null,
      },
      include: {
        attribute: true,
        option: true,
      },
    });
  }

  /**
   * Remove an attribute value from a simple product.
   */
  async removeAttributeValue(
    categoryId: string,
    productId: string,
    attributeId: string,
  ): Promise<void> {
    await this.findByCategoryAndProductId(categoryId, productId);

    await this.db.productAttributeValue.delete({
      where: {
        productId_attributeId: {
          productId,
          attributeId,
        },
      },
    });
  }

  // ============================================
  // Public lookup (for product detail page)
  // ============================================

  /**
   * Find a simple product by slug for the public detail page.
   * Only returns active products.
   */
  async findPublicBySlug(slug: string): Promise<any> {
    const product = await this.productRepo.findBySlug(slug);
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    if (product.status !== 'active') {
      throw new NotFoundException('Product not found');
    }
    // Return with all includes needed for the detail page
    return this.db.product.findUnique({
      where: { id: product.id },
      include: {
        images: {
          where: { variantId: null },
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        variants: {
          orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }],
          include: {
            variantImages: {
              orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
            },
          },
        },
        attributeValues: {
          include: {
            attribute: true,
            option: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Find or create a "General" cell for the given category.
   */
  private async findOrCreateGeneralCell(category: any): Promise<any> {
    // Look for an existing cell named "General" in this category
    const existingCells = await this.db.cell.findMany({
      where: { categoryId: category.id, isActive: true },
    });

    const generalCell = existingCells.find(
      (cell: any) => cell.name.toLowerCase() === 'general',
    );

    if (generalCell) {
      return generalCell;
    }

    // Create a "General" cell
    const cellSlug = `${category.slug}-general`;
    const cellSku = this.generateCellSku();

    return this.db.cell.create({
      data: {
        name: 'General',
        slug: cellSlug,
        sku: cellSku,
        sortOrder: 0,
        isActive: true,
        categoryId: category.id,
      },
    });
  }

  private generateSlug(text: string): string {
    const baseSlug = text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 200);

    // Ensure uniqueness by appending random suffix
    const randomSuffix = randomBytes(3).toString('hex');
    return `${baseSlug}-${randomSuffix}`;
  }

  private generateProductSku(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `P-${result}`;
  }

  private generateVariantSku(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `V-${result}`;
  }

  private generateCellSku(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `C-${result}`;
  }
}
