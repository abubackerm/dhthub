import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { CellService } from '../services/cell.service';
import { CategoryRepository } from '@modules/catalog/repositories/category.repository';

@Controller('catalog/categories/:categorySlug/cells')
export class CellCategoryController {
  constructor(
    private readonly cellService: CellService,
    private readonly categoryRepo: CategoryRepository,
  ) {}

  @Get()
  async findByCategorySlug(@Param('categorySlug') slug: string) {
    const category = await this.categoryRepo.findBySlug(slug);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const result = await this.cellService.list({
      categoryId: category.id,
      activeOnly: true,
    });

    return {
      cells: result.cells,
      total: result.total,
    };
  }
}
