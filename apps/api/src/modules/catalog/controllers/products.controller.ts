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
import { CategoryService } from '../services/category.service';
import {
  CreateProductDto,
  CreateVariantDto,
  UpdateProductDto,
  ProductQueryDto,
} from '../dto';
import { ProductView } from '../dto/views/product.view';
import { VariantView } from '../dto/views/variant.view';
import { PaginatedResponseDto } from '@shared/dto';

@Controller('catalog/products')
export class ProductsController {
  constructor(
    private readonly productService: ProductService,
    private readonly categoryService: CategoryService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateProductDto): Promise<ProductView> {
    if (dto.categoryId) {
      await this.categoryService.findById(dto.categoryId);
    }

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
      dto.categoryId ?? null,
      dto.isFeatured ?? false,
    );

    return ProductView.fromEntity(product);
  }

  @Get()
  async findAll(@Query() query: ProductQueryDto): Promise<PaginatedResponseDto<ProductView>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const { products, total } = await this.productService.findAllPaginated({
      search: query.search,
      categoryId: query.categoryId,
      status: query.status,
      limit: pageSize,
      offset,
    });

    return {
      data: ProductView.fromEntities(products),
      meta: { total, limit: pageSize, offset },
    };
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
    if (dto.categoryId) {
      await this.categoryService.findById(dto.categoryId);
    }

    const product = await this.productService.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      categoryId: dto.categoryId,
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
}
