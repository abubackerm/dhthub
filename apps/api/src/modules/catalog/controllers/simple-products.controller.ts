import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { SimpleProductService } from '../services/simple-product.service';
import { SimpleProductView } from '../dto/views/simple-product.view';
import { CreateSimpleProductDto } from '../dto/create-simple-product.dto';
import { CreateSimpleProductImageDto } from '../dto/create-simple-product-image.dto';
import { UpdateSimpleProductDto } from '../dto/update-simple-product.dto';
import { SetSimpleProductAttributeDto } from '../dto/set-simple-product-attribute.dto';

@Controller('catalog/simple-products')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class SimpleProductsController {
  constructor(private readonly simpleProductService: SimpleProductService) {}

  @Get(':categoryId')
  async listByCategory(
    @Param('categoryId') categoryId: string,
  ): Promise<SimpleProductView[]> {
    const products = await this.simpleProductService.findByCategory(categoryId);
    return SimpleProductView.fromEntities(products);
  }

  @Get(':categoryId/:productId')
  async getByCategoryAndProduct(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
  ): Promise<SimpleProductView> {
    const product = await this.simpleProductService.findByCategoryAndProductId(
      categoryId,
      productId,
    );
    return SimpleProductView.fromEntity(product);
  }

  @Post(':categoryId')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('categoryId') categoryId: string,
    @Body() dto: CreateSimpleProductDto,
  ): Promise<SimpleProductView> {
    const product = await this.simpleProductService.create(categoryId, dto);
    return SimpleProductView.fromEntity(product);
  }

  @Patch(':categoryId/:productId')
  async update(
    @Param('categoryId') _categoryId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateSimpleProductDto,
  ): Promise<SimpleProductView> {
    const product = await this.simpleProductService.update(productId, dto);
    return SimpleProductView.fromEntity(product);
  }

  @Delete(':categoryId/:productId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('categoryId') _categoryId: string,
    @Param('productId') productId: string,
  ): Promise<void> {
    await this.simpleProductService.delete(productId);
  }

  // ============================================
  // Image Management Endpoints
  // ============================================

  @Post(':categoryId/:productId/images')
  @HttpCode(HttpStatus.CREATED)
  async addImage(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
    @Body() dto: CreateSimpleProductImageDto,
  ): Promise<any> {
    const image = await this.simpleProductService.addImage(categoryId, productId, dto);
    return {
      id: image.id,
      url: image.url,
      altText: image.altText,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
    };
  }

  @Get(':categoryId/:productId/images')
  async listImages(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
  ): Promise<any[]> {
    const images = await this.simpleProductService.getImages(categoryId, productId);
    return images.map((img: any) => ({
      id: img.id,
      url: img.url,
      altText: img.altText,
      isPrimary: img.isPrimary,
      sortOrder: img.sortOrder,
    }));
  }

  @Patch(':categoryId/:productId/images/:imageId')
  async updateImage(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
    @Body() body: { altText?: string; isPrimary?: boolean; sortOrder?: number },
  ): Promise<any> {
    const image = await this.simpleProductService.updateImage(
      categoryId,
      productId,
      imageId,
      body,
    );
    return {
      id: image.id,
      url: image.url,
      altText: image.altText,
      isPrimary: image.isPrimary,
      sortOrder: image.sortOrder,
    };
  }

  @Delete(':categoryId/:productId/images/:imageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteImage(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ): Promise<void> {
    await this.simpleProductService.deleteImage(categoryId, productId, imageId);
  }

  // ============================================
  // Attribute Value Endpoints
  // ============================================

  @Get(':categoryId/:productId/attributes')
  async listAttributeValues(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
  ): Promise<any[]> {
    return this.simpleProductService.getAttributeValues(categoryId, productId);
  }

  @Post(':categoryId/:productId/attributes')
  @HttpCode(HttpStatus.CREATED)
  async setAttributeValue(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
    @Body() dto: SetSimpleProductAttributeDto,
  ): Promise<any> {
    return this.simpleProductService.setAttributeValue(categoryId, productId, dto);
  }

  @Delete(':categoryId/:productId/attributes/:attributeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttributeValue(
    @Param('categoryId') categoryId: string,
    @Param('productId') productId: string,
    @Param('attributeId') attributeId: string,
  ): Promise<void> {
    await this.simpleProductService.removeAttributeValue(
      categoryId,
      productId,
      attributeId,
    );
  }
}
