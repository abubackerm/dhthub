import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CellService } from '../services/cell.service';
import { CreateCellDto } from '../dto/create-cell.dto';
import { UpdateCellDto } from '../dto/update-cell.dto';
import { AssignAttributeDto } from '../dto/assign-attribute.dto';
import { AuthGuard, RolesGuard, Roles } from '@modules/auth';
import { CellView } from '../dto/views/cell.view';

// Admin Controller
@Controller('admin/cells')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class CellAdminController {
  constructor(private readonly cellService: CellService) {}

  @Post()
  create(@Body() dto: CreateCellDto) {
    // TODO: Get userId from request
    return this.cellService.create('system-user', dto);
  }

  @Get()
  async list(
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryId') categoryId?: string,
    @Query('activeOnly') activeOnly?: string
  ) {
    // Support both skip/take and page/pageSize formats
    let parsedSkip = skip ? parseInt(skip) : undefined;
    let parsedTake = take ? parseInt(take) : undefined;

    // If page/pageSize are provided, convert to skip/take
    if (page !== undefined || pageSize !== undefined) {
      const pageNum = page ? parseInt(page) : 1;
      const size = pageSize ? parseInt(pageSize) : 20;
      parsedSkip = (pageNum - 1) * size;
      parsedTake = size;
    }

    const result = await this.cellService.list({
      skip: parsedSkip,
      take: parsedTake,
      categoryId,
      activeOnly: activeOnly === 'true',
    });

    // Map cells through CellView to transform storagePath to url
    const mappedCells = CellView.fromPrismaArray(result.cells);

    // Transform to match frontend's expected PaginatedResponse format
    return {
      data: mappedCells,
      meta: {
        total: result.total,
        limit: parsedTake,
        offset: parsedSkip,
      },
    };
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    const cell = this.cellService.findById(id);
    // Map through CellView to transform storagePath to url
    return CellView.fromPrisma(cell);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCellDto) {
    // TODO: Get userId from request
    return this.cellService.update(id, 'system-user', dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.cellService.delete(id);
  }

  @Post(':id/attributes')
  assignAttribute(
    @Param('id') id: string,
    @Body() dto: AssignAttributeDto
  ) {
    return this.cellService.assignAttribute(id, dto);
  }

  @Delete(':id/attributes/:attributeId')
  removeAttribute(
    @Param('id') id: string,
    @Param('attributeId') attributeId: string
  ) {
    return this.cellService.removeAttribute(id, attributeId);
  }

  @Get(':id/attributes')
  getAttributes(@Param('id') id: string) {
    return this.cellService.getAttributes(id);
  }
}

// Public Controller
@Controller('catalog/cells')
export class CellPublicController {
  constructor(private readonly cellService: CellService) {}

  @Get('categories/:categoryId')
  async getByCategory(
    @Param('categoryId') categoryId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string
  ) {
    const result = await this.cellService.list({
      skip: skip ? parseInt(skip) : undefined,
      take: take ? parseInt(take) : undefined,
      categoryId,
      activeOnly: true, // Only return active cells for public endpoint
    });

    return {
      cells: result.cells,
      total: result.total,
    };
  }

  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.cellService.findBySlug(slug);
  }
}
