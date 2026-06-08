import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { CategoryAttributeService } from '../services';
import { CategoryAttributeView } from '../dto/views/category-attribute.view';

export class AssignAttributeToCategoryDto {
  attributeId: string;
}

@Controller('catalog/categories/:categoryId/attributes')
export class CategoryAttributesController {
  constructor(
    private readonly categoryAttributeService: CategoryAttributeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async assignAttribute(
    @Param('categoryId') categoryId: string,
    @Body() dto: AssignAttributeToCategoryDto,
  ): Promise<{ id: string }> {
    const categoryAttribute = await this.categoryAttributeService.assignAttribute({
      categoryId,
      attributeId: dto.attributeId,
    });

    return { id: categoryAttribute.id };
  }

  @Get()
  async getAttributes(
    @Param('categoryId') categoryId: string,
  ): Promise<CategoryAttributeView[]> {
    const categoryAttributes = await this.categoryAttributeService.getCategoryAttributes(
      categoryId,
    );

    return CategoryAttributeView.fromEntities(categoryAttributes);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeAttribute(@Param('id') id: string): Promise<void> {
    await this.categoryAttributeService.removeAttribute(id);
  }
}
