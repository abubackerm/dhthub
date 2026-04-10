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
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { CategoryService } from '../services/category.service';
import { CategoryEntity } from '../entities/category.entity';
import {
  CreateCategoryDto,
  UpdateCategoryDto,
  CategoryQueryDto,
  CategoryView,
  CategoryTreeView,
  LeafPageView,
  ConsolidatedLeafPageView,
  AggregatedFilterDataView,
} from '../dto';
import { Cell } from '../../cell/dto/views/cell.view';

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

  @Get('search')
  async search(
    @Query('q') q: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('leafOnly') leafOnly?: string,
  ): Promise<CategoryView[]> {
    const query = (q ?? '').trim();
    if (!query) {
      return [];
    }

    const categories = await this.categoryService.search(query, limit ?? 20, {
      leafOnly: leafOnly === 'true',
    });
    return CategoryView.fromEntities(categories);
  }

  @Get(':slug/leaf-data')
  async getLeafData(@Param('slug') slug: string): Promise<LeafPageView> {
    const data = await this.categoryService.getLeafPageData(slug);
    if (!data) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return LeafPageView.fromPrisma(data);
  }

  @Get(':slug/consolidated-leaf-data')
  async getConsolidatedLeafData(@Param('slug') slug: string): Promise<ConsolidatedLeafPageView> {
    const data = await this.categoryService.getConsolidatedLeafData(slug);
    if (!data) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return ConsolidatedLeafPageView.fromPrisma(data);
  }

  @Get(':slug/filter-data')
  async getAggregatedFilterData(@Param('slug') slug: string): Promise<AggregatedFilterDataView> {
    const data = await this.categoryService.getAggregatedFilterData(slug);
    if (!data) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }
    return AggregatedFilterDataView.fromPrisma(data);
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
      dto.sku,
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
      sku: dto.sku,
    });
    return CategoryView.fromEntity(category);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.categoryService.delete(id);
  }

  @Get(':slug/cells')
  async getCellsByCategorySlug(@Param('slug') slug: string): Promise<Cell[]> {
    // Find the category by slug
    const category = await this.categoryService.findBySlug(slug);
    if (!category || !category.isActive) {
      return [];
    }

    // Use the cell service to get cells for this category
    // We need to import CellService, but let's create a simpler approach
    // Get cells through the category relation
    const categoryWithCells = await this.categoryService.findWithCells(category.id);
    
    return categoryWithCells.cells || [];
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
