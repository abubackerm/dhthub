import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { RoleService } from '../services';
import { CreateRoleDto, UpdateRoleDto, RoleView } from '../dto';
import { PaginatedResponseDto } from '@shared/dto';

@Controller('v1/auth/roles')
export class RolesController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  async create(@Body() dto: CreateRoleDto): Promise<RoleView> {
    const role = await this.roleService.create(
      dto.name,
      dto.permissions ?? {},
      dto.organizationId,
    );
    return RoleView.fromEntity(role);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<RoleView> {
    const role = await this.roleService.getById(id);
    return RoleView.fromEntity(role);
  }

  @Get('organization/:organizationId')
  async getByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<PaginatedResponseDto<RoleView>> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const roles = await this.roleService.getByOrganization(organizationId);

    return {
      data: RoleView.fromEntities(roles),
      meta: {
        total: roles.length,
        limit: limitNum,
        offset: offsetNum,
      },
    };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
  ): Promise<RoleView> {
    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;

    const role = await this.roleService.update(id, updateData);
    return RoleView.fromEntity(role);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<RoleView> {
    const role = await this.roleService.delete(id);
    return RoleView.fromEntity(role);
  }
}
