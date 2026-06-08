import { Controller, Get, Param, Query } from '@nestjs/common';
import { CellService } from '../services/cell.service';
import { CellQueryDto } from '../dto/cell-query.dto';

@Controller('catalog/cells')
export class CellCatalogController {
  constructor(private readonly cellService: CellService) {}

  @Get()
  async list(@Query() query: CellQueryDto) {
    // Always return only active cells for catalog
    return this.cellService.list({ ...query, activeOnly: true });
  }

  @Get(':slug')
  async findBySlug(@Param('slug') slug: string) {
    const cell = await this.cellService.findBySlug(slug);

    // Only return if active
    if (!cell.isActive) {
      throw { statusCode: 404, message: 'Cell not found' };
    }

    return cell;
  }
}
