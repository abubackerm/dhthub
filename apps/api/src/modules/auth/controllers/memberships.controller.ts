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
import { MembershipService } from '../services';
import {
  CreateMembershipDto,
  UpdateMembershipDto,
  MembershipView,
} from '../dto';
import { PaginatedResponseDto } from '@shared/dto';
import { AuthGuard } from '../auth.guard';
import { RolesGuard } from '../roles.guard';
import { Roles } from '../roles.decorator';

@Controller('auth/memberships')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class MembershipsController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post()
  async create(@Body() dto: CreateMembershipDto): Promise<MembershipView> {
    const membership = await this.membershipService.create(
      dto.userId,
      dto.organizationId,
      dto.roleId,
    );
    return MembershipView.fromEntity(membership);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<MembershipView> {
    const membership = await this.membershipService.getById(id);
    return MembershipView.fromEntity(membership);
  }

  @Get('user/:userId')
  async getByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<PaginatedResponseDto<MembershipView>> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const memberships = await this.membershipService.getByUser(userId);

    return {
      data: MembershipView.fromEntities(memberships),
      meta: {
        total: memberships.length,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  @Get('organization/:organizationId')
  async getByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<PaginatedResponseDto<MembershipView>> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const memberships =
      await this.membershipService.getByOrganization(organizationId);

    return {
      data: MembershipView.fromEntities(memberships),
      meta: {
        total: memberships.length,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  @Patch(':id/role')
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateMembershipDto,
  ): Promise<MembershipView> {
    const membership = await this.membershipService.updateRole(id, dto.roleId!);
    return MembershipView.fromEntity(membership);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string): Promise<MembershipView> {
    const membership = await this.membershipService.activate(id);
    return MembershipView.fromEntity(membership);
  }

  @Post(':id/suspend')
  async suspend(@Param('id') id: string): Promise<MembershipView> {
    const membership = await this.membershipService.suspend(id);
    return MembershipView.fromEntity(membership);
  }

  @Post(':id/remove')
  async remove(@Param('id') id: string): Promise<MembershipView> {
    const membership = await this.membershipService.remove(id);
    return MembershipView.fromEntity(membership);
  }
}
