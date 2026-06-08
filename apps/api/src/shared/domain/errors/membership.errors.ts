import {
  NotFoundError,
  AlreadyExistsError,
  InvalidOperationError,
} from './base.domain-error';
import { MembershipStatus } from '../../../modules/auth/entities';

export class MembershipNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super('Membership', identifier);
  }
}

export class UserAlreadyMemberError extends AlreadyExistsError {
  constructor(userId: string, organizationId: string) {
    super(
      'Membership',
      'user-organization',
      `${userId}@${organizationId}`,
    );
  }
}

export class InvalidMembershipTransitionError extends InvalidOperationError {
  constructor(
    membershipId: string,
    fromStatus: MembershipStatus,
    toStatus: MembershipStatus,
  ) {
    super(
      `Cannot transition membership ${membershipId} from ${fromStatus} to ${toStatus}`,
      'INVALID_MEMBERSHIP_TRANSITION',
    );
  }
}

export class MembershipAlreadyInStatusError extends InvalidOperationError {
  constructor(membershipId: string, status: MembershipStatus) {
    super(
      `Membership ${membershipId} is already in status: ${status}`,
      'MEMBERSHIP_ALREADY_IN_STATUS',
    );
  }
}

export class RoleDoesNotBelongToOrganizationError extends InvalidOperationError {
  constructor(roleId: string, organizationId: string) {
    super(
      `Role ${roleId} does not belong to organization ${organizationId}`,
      'ROLE_DOES_NOT_BELONG_TO_ORGANIZATION',
    );
  }
}
