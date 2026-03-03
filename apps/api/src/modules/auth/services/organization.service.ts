import { Inject, Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BaseService,
  TransactionalExecutor,
  UserNotFoundError,
  UserDeactivatedError,
  OrganizationNotFoundError,
  SlugAlreadyExistsError,
  OrganizationArchivedError,
  OrganizationAlreadyArchivedError,
} from '@shared/domain';
import { AUTH_EVENTS } from '@shared/events';
import {
  OrganizationRepository,
  RoleRepository,
  MembershipRepository,
  UserRepository,
} from '../repositories';
import { OrganizationEntity, MembershipStatus, RolePermissions } from '../entities';
import {
  OrganizationCreatedEvent,
  OrganizationArchivedEvent,
} from '../events';

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

@Injectable()
export class OrganizationService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly orgRepo: OrganizationRepository,
    private readonly roleRepo: RoleRepository,
    private readonly membershipRepo: MembershipRepository,
    private readonly userRepo: UserRepository,
    @Inject('TransactionalExecutor')
    private readonly tx: TransactionalExecutor,
  ) {
    super(eventEmitter);
  }

  async create(
    name: string,
    slug: string,
    ownerId: string,
  ): Promise<OrganizationEntity> {
    const existingSlug = await this.orgRepo.findBySlug(slug);
    if (existingSlug) {
      throw new SlugAlreadyExistsError(slug);
    }

    const owner = await this.userRepo.findById(ownerId);
    if (!owner) {
      throw new UserNotFoundError(ownerId);
    }

    if (!owner.isActive) {
      throw new UserDeactivatedError(ownerId);
    }

    const organization = await this.tx.execute(async () => {
      const org = await this.orgRepo.create({ name, slug, ownerId });

      const adminRole = await this.roleRepo.create({
        name: 'admin',
        permissions: DEFAULT_ADMIN_PERMISSIONS,
        organizationId: org.id,
        isSystemRole: true,
      });

      await this.membershipRepo.create({
        userId: ownerId,
        organizationId: org.id,
        roleId: adminRole.id,
        status: MembershipStatus.ACTIVE,
      });

      return org;
    });

    this.emit(
      AUTH_EVENTS.ORGANIZATION_CREATED,
      new OrganizationCreatedEvent(
        organization.id,
        organization.name,
        organization.slug,
        organization.ownerId,
      ),
    );

    return organization;
  }

  async getById(id: string): Promise<OrganizationEntity> {
    const org = await this.orgRepo.findById(id);
    if (!org) {
      throw new OrganizationNotFoundError(id);
    }
    return org;
  }

  async getBySlug(slug: string): Promise<OrganizationEntity | null> {
    return this.orgRepo.findBySlug(slug);
  }

  async getByOwner(ownerId: string): Promise<OrganizationEntity[]> {
    return this.orgRepo.findByOwnerId(ownerId);
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      slug: string;
    }>,
  ): Promise<OrganizationEntity> {
    const org = await this.getById(id);

    if (org.isArchived) {
      throw new OrganizationArchivedError(id);
    }

    if (data.slug && data.slug !== org.slug) {
      const existingSlug = await this.orgRepo.findBySlug(data.slug);
      if (existingSlug) {
        throw new SlugAlreadyExistsError(data.slug);
      }
    }

    return this.orgRepo.update(id, data);
  }

  async archive(id: string): Promise<OrganizationEntity> {
    const org = await this.getById(id);

    if (org.isArchived) {
      throw new OrganizationAlreadyArchivedError(id);
    }

    const archivedOrg = await this.orgRepo.archive(id);

    this.emit(
      AUTH_EVENTS.ORGANIZATION_ARCHIVED,
      new OrganizationArchivedEvent(
        archivedOrg.id,
        archivedOrg.name,
        archivedOrg.slug,
        archivedOrg.ownerId,
      ),
    );

    return archivedOrg;
  }

  async isSlugUnique(slug: string): Promise<boolean> {
    const org = await this.orgRepo.findBySlug(slug);
    return org === null;
  }
}
