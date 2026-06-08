import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrganizationService } from '../services';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationView,
} from '../dto';
import { PaginatedResponseDto } from '@shared/dto';
import { AuthGuard } from '../auth.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';

@Controller('auth/organizations')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class OrganizationsController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  async create(@Body() dto: CreateOrganizationDto): Promise<OrganizationView> {
    const org = await this.organizationService.create(
      dto.name,
      dto.slug,
      dto.ownerId,
    );
    return OrganizationView.fromEntity(org);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<OrganizationView> {
    const org = await this.organizationService.getById(id);
    return OrganizationView.fromEntity(org);
  }

  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string): Promise<OrganizationView | null> {
    const org = await this.organizationService.getBySlug(slug);
    return org ? OrganizationView.fromEntity(org) : null;
  }

  @Get('owner/:ownerId')
  async getByOwner(
    @Param('ownerId') ownerId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<PaginatedResponseDto<OrganizationView>> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const orgs = await this.organizationService.getByOwner(ownerId);

    return {
      data: OrganizationView.fromEntities(orgs),
      meta: {
        total: orgs.length,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationView> {
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;

    const org = await this.organizationService.update(id, updateData);
    return OrganizationView.fromEntity(org);
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string): Promise<OrganizationView> {
    const org = await this.organizationService.archive(id);
    return OrganizationView.fromEntity(org);
  }
}
