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
} from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { CategoryEntity } from '../entities/category.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategoryView,
  CategoryTreeView,
} from '../dto';

@Controller('catalog/categories')
export class CategoriesController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  async findAll(@Query() query: CategoryQueryDto): Promise<CategoryView[]> {
    let categories: CategoryView[];
    
    if (query.parentId) {
      const entities = await this.categoryService.findChildren(query.parentId);
      categories = CategoryView.fromEntities(entities);
    } else {
      const entities = await this.categoryService.findAll();
      if (query.isActive !== undefined && !query.includeInactive) {
        const filtered = entities.filter((c) => c.isActive === query.isActive);
        categories = CategoryView.fromEntities(filtered);
      } else {
        categories = CategoryView.fromEntities(entities);
      }
    }
    
    return categories;
  }

  @Get('tree')
  async getTree(@Query() query: CategoryQueryDto): Promise<CategoryTreeView[]> {
    const entities = await this.categoryService.getTree();

    const convertToTreeView = (categories: CategoryEntity[], depth: number = 0): CategoryTreeView[] => {
      return categories.map((category) => {
        const children = (category as any).children || [];
        return CategoryTreeView.fromEntity(category, convertToTreeView(children, depth + 1), depth);
      });
    };

    let treeViews = convertToTreeView(entities);

    if (query.isActive !== undefined && !query.includeInactive) {
      treeViews = filterActiveCategories(treeViews);
    }

    return treeViews;
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<CategoryView> {
    const category = await this.categoryService.findById(id);
    return CategoryView.fromEntity(category);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCategoryDto): Promise<CategoryView> {
    const category = await this.categoryService.create(
      dto.name,
      dto.slug,
      dto.description,
      dto.parentId,
      dto.imageUrl,
      dto.sortOrder,
      dto.isActive,
    );
    return CategoryView.fromEntity(category);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryView> {
    const category = await this.categoryService.update(id, {
      name: dto.name,
      slug: dto.slug,
      description: dto.description,
      imageUrl: dto.imageUrl,
      sortOrder: dto.sortOrder,
      isActive: dto.isActive,
    });
    return CategoryView.fromEntity(category);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.categoryService.delete(id);
  }
}

function filterActiveCategories(categories: CategoryTreeView[]): CategoryTreeView[] {
  return categories
    .filter((c) => c.isActive)
    .map((c) => ({
      ...c,
      children: filterActiveCategories(c.children || []),
    }));
}
