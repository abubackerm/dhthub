import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProductService } from '../services/product.service';
import {
  CreateProductDto,
  CreateVariantDto,
  UpdateProductDto,
  BulkUpdateProductDto,
  ProductQueryDto,
} from '../dto';
import { ProductView } from '../dto/views/product.view';
import { VariantView } from '../dto/views/variant.view';
import { PaginatedResponseDto } from '@shared/dto';

@Controller('catalog/products')
export class ProductsController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto): Promise<ProductView> {
    const slug = dto.slug ?? await this.productService.generateUniqueSlug(dto.name);

    const product = await this.productService.create(
      null,
      dto.name,
      slug,
      dto.description ?? null,
      dto.type as any,
      dto.price ?? null,
      null,
      null,
      'USD',
      dto.quantity ?? 0,
      dto.cellId ?? null,
      dto.isFeatured ?? false,
    );

    return ProductView.fromEntity(product);
  }

  @Get()
  async findAll(@Query() query: ProductQueryDto): Promise<PaginatedResponseDto<ProductView>> {
    console.log('[ProductsController] findAll called with query:', JSON.stringify(query, null, 2))
    
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    console.log('[ProductsController] Querying with:', {
      search: query.search,
      categoryId: query.categoryId,
      cellId: query.cellId,
      status: query.status,
      limit: pageSize,
      offset,
    })

    const { products, total } = await this.productService.findAllPaginated({
      search: query.search,
      categoryId: query.categoryId,
      cellId: query.cellId,
      status: query.status,
      limit: pageSize,
      offset,
    });

    console.log('[ProductsController] Found products:', products.length, 'total:', total)

    return {
      data: ProductView.fromEntities(products),
      meta: { total, limit: pageSize, offset },
    };
  }

  @Patch('bulk')
  async bulkUpdate(
    @Body() dto: BulkUpdateProductDto,
  ): Promise<{ updatedCount: number }> {
    return this.productService.bulkUpdate(dto.ids, {
      status: dto.data.status as any,
      price: dto.data.price,
      quantity: dto.data.quantity,
      cellId: dto.data.cellId,
      isFeatured: dto.data.isFeatured,
    });
  }

  @Get('by-sku/:sku')
  async findBySku(@Param('sku') sku: string): Promise<ProductView> {
    const product = await this.productService.findBySku(sku);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const variants = await this.productService.getVariants(product.id);
    return ProductView.fromEntity(product, variants as any);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ProductView> {
    const product = await this.productService.findById(id);
    const variants = await this.productService.getVariants(id);
    return ProductView.fromEntity(product, variants as any);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductView> {
    const product = await this.productService.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      cellId: dto.cellId,
      status: dto.status as any,
      price: dto.price,
      quantity: dto.quantity,
      isFeatured: dto.isFeatured,
    });

    return ProductView.fromEntity(product);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(@Param('id') id: string): Promise<void> {
    await this.productService.changeStatus(id, 'archived' as any);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  async hardDelete(@Param('id') id: string): Promise<void> {
    await this.productService.delete(id);
  }

  @Post(':productId/variants')
  @HttpCode(HttpStatus.CREATED)
  async addVariant(
    @Param('productId') productId: string,
    @Body() dto: CreateVariantDto,
  ): Promise<VariantView> {
    const existing = await this.productService.findVariantBySku(dto.sku);
    if (existing) {
      throw new ConflictException('SKU already exists');
    }

    const variant = await this.productService.addVariant(productId, {
      sku: dto.sku,
      name: dto.name ?? `Variant-${dto.sku}`,
      price: dto.price ?? null,
      quantity: dto.quantity ?? 1,
      attributes: {},
      isDefault: dto.isDefault ?? false,
    });

    return VariantView.fromEntity(variant as any);
  }

  @Delete(':productId/variants/:variantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVariant(
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
  ): Promise<void> {
    await this.productService.removeVariant(productId, variantId);
  }
}
