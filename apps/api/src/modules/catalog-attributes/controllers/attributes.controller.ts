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
  Req,
  Res,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { AttributeDefinitionService, AttributeImportService } from '../services';
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
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { ImportService, UploadedFile } from '@modules/import/services/import.service';
import { ImportType } from '@modules/import/entities';

@Controller('catalog/attributes')
export class AttributesController {
  constructor(
    private readonly attributeService: AttributeDefinitionService,
    private readonly optionService: AttributeOptionService,
    private readonly importService: AttributeImportService,
    private readonly importModuleService: ImportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAttributeDto): Promise<AttributeView> {
    const attribute = await this.attributeService.create({
      name: dto.name,
      slug: dto.slug, // Can be undefined - service will auto-generate
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
  async findAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
  ): Promise<{ data: AttributeView[]; total: number }> {
    const result = await this.attributeService.findAll({ skip, take, search });
    return {
      data: AttributeView.fromEntities(result.data),
      total: result.total,
    };
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

  @Post('import')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async importAttributes(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query('validateOnly') validateOnly?: string,
    @Query('conflictMode') conflictMode?: string,
  ) {
    const data = await req.file();
    if (!data) {
      throw new BadRequestException('No file provided');
    }

    const buffer = await data.toBuffer();
    const filename = data.filename;
    const createdBy = (data.fields as any)?.createdBy?.value;

    const isZip = filename.endsWith('.zip');

    // Handle ZIP files (async worker processing)
    if (isZip) {
      // Save ZIP file and create import job
      const file: UploadedFile = {
        fieldname: data.fieldname,
        filename: data.filename,
        encoding: data.encoding,
        mimetype: data.mimetype,
        buffer,
        size: buffer.length,
        originalname: data.filename,
      };

      const result = await this.importModuleService.uploadZip(file, { 
        createdBy,
        importType: ImportType.ATTRIBUTES,
      });
      return reply.status(HttpStatus.ACCEPTED).send({
        jobId: result.jobId,
        fileUrl: result.fileUrl,
        fileName: result.fileName,
        fileSize: result.fileSize,
        message: 'ZIP file upload accepted. Processing will begin shortly.',
      });
    }

    // Handle CSV files (sync processing)
    const path = require('path');
    const fs = require('fs');
    const os = require('os');
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'attribute-import-'));
    let attributesFile: string | null = null;
    let optionsFile: string | null = null;

    try {
      const baseName = path.basename(filename).toLowerCase();
      // Accept any CSV file as attributes file
      if (baseName.endsWith('.csv')) {
        attributesFile = path.join(tmpDir, 'attributes.csv');
        fs.writeFileSync(attributesFile, buffer);
      }

      const result = await this.importService.importFromFiles(
        attributesFile,
        optionsFile,
        {
          validateOnly: validateOnly === 'true',
          createdBy,
          conflictMode: conflictMode as any,
        },
      );

      return reply.status(HttpStatus.OK).send(result);
    } finally {
      try {
        if (fs.existsSync(tmpDir)) {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        }
      } catch (error) {
        console.error('Failed to clean up temp directory:', error);
      }
    }
  }

  @Get('import/template')
  async getTemplate() {
    const template = await this.importService.generateTemplate();

    return {
      filename: 'attributes-template.csv',
      headers: {
        attributes: ['name', 'dataType', 'group', 'isFilterable', 'filterType', 'unitSymbol'],
      },
      description: 'Download attribute template for bulk import. Only attributes.csv is needed - slug and sortOrder are auto-generated.',
      files: {
        attributes: {
          filename: 'attributes.csv',
          content: template.attributesCsv,
        },
      },
    };
  }

  @Get('import/template/download')
  async downloadTemplate(@Res() reply: FastifyReply) {
    const template = await this.importService.generateTemplate();

    reply
      .type('text/csv')
      .header('Content-Disposition', 'attachment; filename="attributes-template.csv"')
      .send(template.attributesCsv);
  }
}
