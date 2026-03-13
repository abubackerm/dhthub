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
} from '@nestjs/common';
import { AttributeDefinitionService } from '../services';
import { AttributeOptionService } from '../services/attribute-option.service';
import {
  CreateAttributeDto,
  UpdateAttributeDto,
  AttributeDataTypeDto,
  UpdateAttributeOptionDto,
} from '../dto';
import { CreateAttributeOptionDto } from '../dto/create-attribute-option.dto';
import { AttributeView } from '../dto/views/attribute.view';
import { AttributeOptionView } from '../dto/views/attribute-option.view';

@Controller('catalog/attributes')
export class AttributesController {
  constructor(
    private readonly attributeService: AttributeDefinitionService,
    private readonly optionService: AttributeOptionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAttributeDto): Promise<AttributeView> {
    const attribute = await this.attributeService.create({
      name: dto.name,
      slug: dto.slug,
      dataType: dto.dataType as any,
      group: dto.group ?? null,
      sortOrder: dto.sortOrder ?? 0,
      filterType: dto.filterType as any ?? null,
      unitId: dto.unitId ?? null,
      isFilterable: dto.isFilterable ?? false,
      isRequired: dto.isRequired ?? false,
    });

    return AttributeView.fromEntity(attribute);
  }

  @Get()
  async findAll(@Query('skip') skip?: number, @Query('take') take?: number): Promise<AttributeView[]> {
    const attributes = await this.attributeService.findAll({ skip, take });
    return AttributeView.fromEntities(attributes);
  }

  @Get('by-data-type/:dataType')
  async findByDataType(@Param('dataType') dataType: AttributeDataTypeDto): Promise<AttributeView[]> {
    const attributes = await this.attributeService.findByDataType(dataType as any);
    return AttributeView.fromEntities(attributes);
  }

  @Get('by-group/:group')
  async findByGroup(@Param('group') group: string): Promise<AttributeView[]> {
    const attributes = await this.attributeService.findByGroup(group);
    return AttributeView.fromEntities(attributes);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<AttributeView> {
    const attribute = await this.attributeService.findById(id);
    return AttributeView.fromEntity(attribute);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAttributeDto,
  ): Promise<AttributeView> {
    const attribute = await this.attributeService.update(id, {
      name: dto.name,
      dataType: dto.dataType as any,
      group: dto.group,
      sortOrder: dto.sortOrder,
      filterType: dto.filterType as any,
      unitId: dto.unitId,
      isFilterable: dto.isFilterable,
      isRequired: dto.isRequired,
    });

    return AttributeView.fromEntity(attribute);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string): Promise<void> {
    await this.attributeService.delete(id);
  }

  @Post(':id/options')
  @HttpCode(HttpStatus.CREATED)
  async createOption(
    @Param('id') attributeId: string,
    @Body() dto: CreateAttributeOptionDto,
  ): Promise<AttributeOptionView> {
    const option = await this.optionService.create({
      attributeId,
      label: dto.label,
      value: dto.value,
      sortOrder: dto.sortOrder ?? 0,
    });

    return AttributeOptionView.fromEntity(option);
  }

  @Patch(':id/options/:optionId')
  async updateOption(
    @Param('id') attributeId: string,
    @Param('optionId') optionId: string,
    @Body() dto: UpdateAttributeOptionDto,
  ): Promise<AttributeOptionView> {
    const option = await this.optionService.findById(optionId);
    if (option.attributeId !== attributeId) {
      throw new NotFoundException('Attribute option not found');
    }

    const updated = await this.optionService.update(optionId, {
      label: dto.label,
      value: dto.value,
      sortOrder: dto.sortOrder,
    });

    return AttributeOptionView.fromEntity(updated);
  }

  @Get(':id/options')
  async getOptions(@Param('id') attributeId: string): Promise<AttributeOptionView[]> {
    const options = await this.optionService.findByAttributeId(attributeId);
    return AttributeOptionView.fromEntities(options);
  }

  @Delete(':id/options/:optionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOption(
    @Param('id') attributeId: string,
    @Param('optionId') optionId: string,
  ): Promise<void> {
    const option = await this.optionService.findById(optionId);
    if (option.attributeId !== attributeId) {
      throw new NotFoundException('Attribute option not found');
    }

    await this.optionService.delete(optionId);
  }
}
