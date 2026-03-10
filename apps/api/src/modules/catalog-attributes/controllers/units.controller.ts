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
} from '@nestjs/common';
import { UnitService } from '../services';
import { CreateUnitDto } from '../dto';
import { UnitView } from '../dto/views/unit.view';

@Controller('catalog/units')
export class UnitsController {
  constructor(private readonly unitService: UnitService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUnitDto): Promise<UnitView> {
    const unit = await this.unitService.create({
      name: dto.name,
      symbol: dto.symbol,
    });

    return UnitView.fromEntity(unit);
  }

  @Get()
  async findAll(): Promise<UnitView[]> {
    const units = await this.unitService.findAll();
    return UnitView.fromEntities(units);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<UnitView> {
    const unit = await this.unitService.findById(id);
    return UnitView.fromEntity(unit);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateUnitDto>,
  ): Promise<UnitView> {
    const unit = await this.unitService.update(id, {
      name: dto.name,
      symbol: dto.symbol,
    });

    return UnitView.fromEntity(unit);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.unitService.delete(id);
  }
}
