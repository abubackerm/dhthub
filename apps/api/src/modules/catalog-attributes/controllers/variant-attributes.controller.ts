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
import { VariantAttributeService } from '../services';
import { AssignVariantAttributesDto } from '../dto';
import { VariantAttributeView } from '../dto/views/variant-attribute.view';

@Controller('catalog/variants/:variantId/attributes')
export class VariantAttributesController {
  constructor(
    private readonly variantAttributeService: VariantAttributeService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async assignAttributes(
    @Param('variantId') variantId: string,
    @Body() dto: AssignVariantAttributesDto,
  ): Promise<VariantAttributeView[]> {
    const attributes = await this.variantAttributeService.assignAttributes(
      variantId,
      dto.attributes.map((attr) => ({
        attributeId: attr.attributeId,
        numberValue: attr.numberValue ?? null,
        textValue: attr.textValue ?? null,
        optionId: attr.optionId ?? null,
      })),
    );

    return VariantAttributeView.fromEntities(attributes as any);
  }

  @Get()
  async getAttributes(
    @Param('variantId') variantId: string,
  ): Promise<VariantAttributeView[]> {
    const attributes = await this.variantAttributeService.getVariantAttributes(
      variantId,
    );

    return VariantAttributeView.fromEntities(attributes as any);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAttributes(@Param('variantId') variantId: string): Promise<void> {
    await this.variantAttributeService.deleteAttributeValues(variantId);
  }
}
