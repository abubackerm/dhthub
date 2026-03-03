import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  BaseService,
  UserNotFoundError,
  OrganizationNotFoundError,
  OrganizationArchivedError,
  RoleNotFoundError,
  MembershipNotFoundError,
  UserAlreadyMemberError,
  InvalidMembershipTransitionError,
  MembershipAlreadyInStatusError,
  RoleDoesNotBelongToOrganizationError,
} from '@shared/domain';
import { AUTH_EVENTS } from '@shared/events';
import { MembershipRepository, OrganizationRepository, UserRepository, RoleRepository } from '../repositories';
import { MembershipEntity, MembershipStatus } from '../entities';
import { MembershipCreatedEvent, MembershipStatusChangedEvent } from '../events';

const VALID_STATUS_TRANSITIONS: Record<MembershipStatus, MembershipStatus[]> = {
  [MembershipStatus.INVITED]: [MembershipStatus.ACTIVE, MembershipStatus.REMOVED],
  [MembershipStatus.ACTIVE]: [MembershipStatus.SUSPENDED, MembershipStatus.REMOVED],
  [MembershipStatus.SUSPENDED]: [MembershipStatus.ACTIVE, MembershipStatus.REMOVED],
  [MembershipStatus.REMOVED]: [],
};

@Injectable()
export class MembershipService extends BaseService {
  constructor(
    eventEmitter: EventEmitter2,
    private readonly membershipRepo: MembershipRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly userRepo: UserRepository,
    private readonly roleRepo: RoleRepository,
  ) {
    super(eventEmitter);
  }

  async create(
    userId: string,
    organizationId: string,
    roleId: string,
  ): Promise<MembershipEntity> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    const org = await this.orgRepo.findById(organizationId);
    if (!org) {
      throw new OrganizationNotFoundError(organizationId);
    }

    if (org.isArchived) {
      throw new OrganizationArchivedError(organizationId);
    }

    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    if (role.organizationId !== organizationId) {
      throw new RoleDoesNotBelongToOrganizationError(roleId, organizationId);
    }

    const existingMembership = await this.membershipRepo.findByUserIdAndOrganizationId(
      userId,
      organizationId,
    );
    if (existingMembership) {
      throw new UserAlreadyMemberError(userId, organizationId);
    }

    const membership = await this.membershipRepo.create({
      userId,
      organizationId,
      roleId,
      status: MembershipStatus.INVITED,
    });

    this.emit(
      AUTH_EVENTS.MEMBERSHIP_CREATED,
      new MembershipCreatedEvent(
        membership.id,
        membership.userId,
        membership.organizationId,
        membership.roleId,
      ),
    );

    return membership;
  }

  async getById(id: string): Promise<MembershipEntity> {
    const membership = await this.membershipRepo.findById(id);
    if (!membership) {
      throw new MembershipNotFoundError(id);
    }
    return membership;
  }

  async getByUser(userId: string): Promise<MembershipEntity[]> {
    return this.membershipRepo.findByUserId(userId);
  }

  async getByOrganization(organizationId: string): Promise<MembershipEntity[]> {
    return this.membershipRepo.findByOrganizationId(organizationId);
  }

  async getByOrganizationAndStatus(
    organizationId: string,
    status: MembershipStatus,
  ): Promise<MembershipEntity[]> {
    return this.membershipRepo.findByOrganizationIdAndStatus(organizationId, status);
  }

  async changeStatus(
    id: string,
    newStatus: MembershipStatus,
  ): Promise<MembershipEntity> {
    const membership = await this.getById(id);
    const previousStatus = membership.status;

    if (previousStatus === newStatus) {
      throw new MembershipAlreadyInStatusError(id, newStatus);
    }

    const validTransitions = VALID_STATUS_TRANSITIONS[previousStatus];
    if (!validTransitions.includes(newStatus)) {
      throw new InvalidMembershipTransitionError(id, previousStatus, newStatus);
    }

    const updatedMembership = await this.membershipRepo.updateStatus(id, newStatus);

    this.emit(
      AUTH_EVENTS.MEMBERSHIP_STATUS_CHANGED,
      new MembershipStatusChangedEvent(
        updatedMembership.id,
        updatedMembership.userId,
        updatedMembership.organizationId,
        previousStatus,
        newStatus,
      ),
    );

    return updatedMembership;
  }

  async activate(id: string): Promise<MembershipEntity> {
    return this.changeStatus(id, MembershipStatus.ACTIVE);
  }

  async suspend(id: string): Promise<MembershipEntity> {
    return this.changeStatus(id, MembershipStatus.SUSPENDED);
  }

  async remove(id: string): Promise<MembershipEntity> {
    return this.changeStatus(id, MembershipStatus.REMOVED);
  }

  async updateRole(id: string, roleId: string): Promise<MembershipEntity> {
    const membership = await this.getById(id);

    const role = await this.roleRepo.findById(roleId);
    if (!role) {
      throw new RoleNotFoundError(roleId);
    }

    if (role.organizationId !== membership.organizationId) {
      throw new RoleDoesNotBelongToOrganizationError(roleId, membership.organizationId);
    }

    return this.membershipRepo.update(id, { roleId });
  }

  async countByStatus(
    organizationId: string,
    status: MembershipStatus,
  ): Promise<number> {
    return this.membershipRepo.countByStatus(organizationId, status);
  }
}
