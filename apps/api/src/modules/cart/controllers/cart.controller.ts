import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CartService } from '../services/cart.service';
import { AddCartItemDto, UpdateCartItemDto, BulkAddCartItemsDto } from '../dto';
import { CartView } from '../dto/views/cart.view';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('cart')
@UseGuards(AuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  async getCart(@Req() req: any): Promise<CartView> {
    const userId = req.user.id;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  async addItem(
    @Req() req: any,
    @Body() dto: AddCartItemDto,
  ): Promise<CartView> {
    const userId = req.user.id;
    return this.cartService.addItem(userId, dto.variantId, dto.qty);
  }

  @Post('items/bulk')
  async bulkAddItems(
    @Req() req: any,
    @Body() dto: BulkAddCartItemsDto,
  ): Promise<CartView> {
    const userId = req.user.id;
    return this.cartService.bulkAddItems(userId, dto);
  }

  @Patch('items/:id')
  async updateItem(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartView> {
    const userId = req.user.id;
    return this.cartService.updateItem(userId, id, dto);
  }

  @Delete('items/:id')
  async removeItem(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<CartView> {
    const userId = req.user.id;
    return this.cartService.removeItem(userId, id);
  }

  @Delete()
  async clearCart(@Req() req: any): Promise<CartView> {
    const userId = req.user.id;
    return this.cartService.clearCart(userId);
  }

  @Post('submit')
  async submitCart(@Req() req: any): Promise<CartView> {
    const userId = req.user.id;
    return this.cartService.submitCart(userId);
  }
}
