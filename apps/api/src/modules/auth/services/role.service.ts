import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BaseService,
  OrganizationNotFoundError,
  OrganizationArchivedError,
  RoleNotFoundError,
  RoleNameExistsError,
  CannotDeleteSystemRoleError,
  CannotRenameSystemRoleError,
} from '@shared/domain';
import { AUTH_EVENTS } from '@shared/events';
import { RoleRepository, OrganizationRepository } from '../repositories';
import { RoleEntity, RolePermissions } from '../entities';
import { RoleCreatedEvent } from '../events';

const DEFAULT_ADMIN_ROLE_NAME = 'admin';
const DEFAULT_MEMBER_ROLE_NAME = 'member';

const DEFAULT_ADMIN_PERMISSIONS: RolePermissions = {
  'org:read': true,
  'org:update': true,
  'org:delete': true,
  'members:read': true,
  'members:create': true,
  'members:update': true,
  'members:delete': true,
  'roles:read': true,
  'roles:create': true,
  'roles:update': true,
  'roles:delete': true,
};

const DEFAULT_MEMBER_PERMISSIONS: RolePermissions = {
  'org:read': true,
  'members:read': true,
  'roles:read': true,
};

@Injectable()
export class RoleService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly roleRepo: RoleRepository,
    private readonly orgRepo: OrganizationRepository,
  ) {
    super(eventEmitter);
  }

  async create(
    name: string,
    permissions: RolePermissions,
    organizationId: string,
    isSystemRole = false,
  ): Promise<RoleEntity> {
    const org = await this.orgRepo.findById(organizationId);
    if (!org) {
      throw new OrganizationNotFoundError(organizationId);
    }

    if (org.isArchived) {
      throw new OrganizationArchivedError(organizationId);
    }

    const existingRole = await this.roleRepo.findByNameAndOrganizationId(
      name,
      organizationId,
    );
    if (existingRole) {
      throw new RoleNameExistsError(name, organizationId);
    }

    const role = await this.roleRepo.create({
      name,
      permissions,
      organizationId,
      isSystemRole,
    });

    this.emit(
      AUTH_EVENTS.ROLE_CREATED,
      new RoleCreatedEvent(
        role.id,
        role.name,
        role.permissions,
        role.organizationId,
        role.isSystemRole,
      ),
    );

    return role;
  }

  async getById(id: string): Promise<RoleEntity> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw new RoleNotFoundError(id);
    }
    return role;
  }

  async getByOrganization(organizationId: string): Promise<RoleEntity[]> {
    return this.roleRepo.findByOrganizationId(organizationId);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      permissions: RolePermissions;
    }>,
  ): Promise<RoleEntity> {
    const role = await this.getById(id);

    if (role.isSystemRole && data.name && data.name !== role.name) {
      throw new CannotRenameSystemRoleError(id);
    }

    if (data.name && data.name !== role.name) {
      const existingRole = await this.roleRepo.findByNameAndOrganizationId(
        data.name,
        role.organizationId,
      );
      if (existingRole) {
        throw new RoleNameExistsError(data.name, role.organizationId);
      }
    }

    return this.roleRepo.update(id, data);
  }

  async delete(id: string): Promise<RoleEntity> {
    const role = await this.getById(id);

    if (role.isSystemRole) {
      throw new CannotDeleteSystemRoleError(id);
    }

    return this.roleRepo.delete(id);
  }

  async getAdminRole(organizationId: string): Promise<RoleEntity> {
    let adminRole = await this.roleRepo.findByNameAndOrganizationId(
      DEFAULT_ADMIN_ROLE_NAME,
      organizationId,
    );

    if (!adminRole) {
      adminRole = await this.create(
        DEFAULT_ADMIN_ROLE_NAME,
        DEFAULT_ADMIN_PERMISSIONS,
        organizationId,
        true,
      );
    }

    return adminRole;
  }

  async getMemberRole(organizationId: string): Promise<RoleEntity> {
    let memberRole = await this.roleRepo.findByNameAndOrganizationId(
      DEFAULT_MEMBER_ROLE_NAME,
      organizationId,
    );

    if (!memberRole) {
      memberRole = await this.create(
        DEFAULT_MEMBER_ROLE_NAME,
        DEFAULT_MEMBER_PERMISSIONS,
        organizationId,
        true,
      );
    }

    return memberRole;
  }

  getDefaultRolesForNewOrg(): Array<{
    name: string;
    permissions: RolePermissions;
    isSystemRole: boolean;
  }> {
    return [
      {
        name: DEFAULT_ADMIN_ROLE_NAME,
        permissions: DEFAULT_ADMIN_PERMISSIONS,
        isSystemRole: true,
      },
      {
        name: DEFAULT_MEMBER_ROLE_NAME,
        permissions: DEFAULT_MEMBER_PERMISSIONS,
        isSystemRole: true,
      },
    ];
  }
}
