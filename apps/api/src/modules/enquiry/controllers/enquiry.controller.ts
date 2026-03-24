import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { EnquiryService } from '../services';
import { CreateEnquiryFromCartDto, UpdateEnquiryStatusDto } from '../dto';
import { EnquiryView } from '../dto/views';
import { EnquiryStatus } from '../entities';
import { AuthGuard } from '../../auth/auth.guard';

@Controller('enquiries')
@UseGuards(AuthGuard)
export class EnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Post('from-cart')
  async createFromCart(
    @Req() req: any,
    @Body() dto: CreateEnquiryFromCartDto,
  ): Promise<EnquiryView> {
    const userId = req.user.id;
    const user = req.user;
    return this.enquiryService.createFromCart(userId, dto, user);
  }

  @Get()
  async findEnquiries(
    @Req() req: any,
    @Query('status') status?: EnquiryStatus,
  ): Promise<EnquiryView[]> {
    if (status) {
      return this.enquiryService.findByStatus(status);
    }
    const userId = req.user.id;
    return this.enquiryService.findByUser(userId);
  }

  @Get(':id')
  async findById(@Req() req: any, @Param('id') id: string): Promise<EnquiryView> {
    const userId = req.user.id;
    return this.enquiryService.findById(id, userId);
  }

  @Post(':id/confirm')
  async confirmOrder(@Req() req: any, @Param('id') id: string): Promise<EnquiryView> {
    const userId = req.user.id;
    return this.enquiryService.confirmOrder(id, userId);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEnquiryStatusDto,
    @Req() req: any,
  ): Promise<EnquiryView> {
    const updatedBy = req.user.id;
    return this.enquiryService.updateStatus(id, dto, updatedBy);
  }
}
