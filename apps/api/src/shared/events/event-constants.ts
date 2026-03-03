export const AUTH_EVENTS = {
  USER_CREATED: 'auth.user.created',
  USER_UPDATED: 'auth.user.updated',
  USER_DEACTIVATED: 'auth.user.deactivated',
  ORGANIZATION_CREATED: 'auth.organization.created',
  ORGANIZATION_ARCHIVED: 'auth.organization.archived',
  MEMBERSHIP_CREATED: 'auth.membership.created',
  MEMBERSHIP_STATUS_CHANGED: 'auth.membership.status_changed',
  ROLE_CREATED: 'auth.role.created',
} as const;
