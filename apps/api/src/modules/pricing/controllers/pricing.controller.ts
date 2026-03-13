import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  HttpStatus,
  HttpCode,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { PricingService } from '../services/pricing.service';
import { CreateVariantPricingDto } from '../dto/create-variant-pricing.dto';
import { ReplaceVariantPricingDto } from '../dto/replace-variant-pricing.dto';
import { PriceCalculationQueryDto } from '../dto/price-calculation-query.dto';
import { PriceView } from '../dto/views/price.view';
import { PriceCalculationView } from '../dto/views/price-calculation.view';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('pricing/variants')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post(':variantId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async createVariantPricing(
    @Param('variantId') variantId: string,
    @Body() dto: CreateVariantPricingDto,
  ): Promise<PriceView> {
    const pricing = await this.pricingService.createVariantPricing(
      variantId,
      dto.currency,
      dto.tiers,
    );

    return PriceView.fromEntity(pricing);
  }

  @Put(':variantId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async replaceVariantPricing(
    @Param('variantId') variantId: string,
    @Body() dto: ReplaceVariantPricingDto,
  ): Promise<PriceView> {
    const pricing = await this.pricingService.replaceVariantPricing(
      variantId,
      dto.currency,
      dto.tiers,
    );

    return PriceView.fromEntity(pricing);
  }

  @Get(':variantId')
  async getVariantPricing(
    @Param('variantId') variantId: string,
    @Query('currency') currency: string,
  ): Promise<PriceView> {
    const pricing = await this.pricingService.getVariantPricing(
      variantId,
      currency,
    );

    if (!pricing) {
      throw new NotFoundException('Pricing not found');
    }

    return PriceView.fromEntity(pricing);
  }

  @Get(':variantId/price')
  async getPriceForQuantity(
    @Param('variantId') variantId: string,
    @Query() query: PriceCalculationQueryDto,
  ): Promise<PriceCalculationView> {
    const result = await this.pricingService.getPriceForQuantity(
      variantId,
      query.currency,
      query.qty,
    );

    if (!result) {
      throw new NotFoundException('Price not found for the specified quantity');
    }

    return PriceCalculationView.fromResult(
      {
        minQty: result.tierMinQty,
        maxQty: result.tierMaxQty,
        unitPrice: result.unitPrice,
      },
      result.quantity,
    );
  }
}
