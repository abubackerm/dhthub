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
import { QuoteEnquiryDto, UpdateEnquiryStatusDto, AdminListEnquiriesDto } from '../dto';
import { EnquiryView } from '../dto/views';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('admin/enquiries')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminEnquiryController {
  constructor(private readonly enquiryService: EnquiryService) {}

  @Get()
  async findAll(@Query() dto: AdminListEnquiriesDto): Promise<{ enquiries: EnquiryView[]; total: number }> {
    return this.enquiryService.findAllForAdmin(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<EnquiryView> {
    return this.enquiryService.findByIdForAdmin(id);
  }

  @Patch(':id/quote')
  async addQuote(
    @Param('id') id: string,
    @Body() dto: QuoteEnquiryDto,
    @Req() req: any,
  ): Promise<EnquiryView> {
    const updatedBy = req.user.id;
    return this.enquiryService.addQuote(id, dto, updatedBy);
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

  @Post(':id/mark-paid')
  async markAsPaid(@Param('id') id: string, @Req() req: any): Promise<EnquiryView> {
    const updatedBy = req.user.id;
    return this.enquiryService.markAsPaid(id, updatedBy);
  }
}
