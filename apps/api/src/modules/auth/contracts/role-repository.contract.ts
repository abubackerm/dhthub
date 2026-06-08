import { RoleEntity, RolePermissions } from '../entities';

export interface RoleRepositoryContract {
  findAll(): Promise<RoleEntity[]>;
  findById(id: string): Promise<RoleEntity | null>;
  findByNameAndOrganizationId(
    name: string,
    organizationId: string,
  ): Promise<RoleEntity | null>;
  findByOrganizationId(organizationId: string): Promise<RoleEntity[]>;
  create(data: {
    name: string;
    permissions?: RolePermissions;
    organizationId: string;
  }): Promise<RoleEntity>;
  update(
    id: string,
    data: Partial<{
      name: string;
      permissions: RolePermissions;
    }>,
  ): Promise<RoleEntity>;
  delete(id: string): Promise<RoleEntity>;
  count(where?: Record<string, any>): Promise<number>;
}
