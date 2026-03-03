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

export const CATALOG_EVENTS = {
  PRODUCT_CREATED: 'catalog.product.created',
  PRODUCT_UPDATED: 'catalog.product.updated',
  PRODUCT_STATUS_CHANGED: 'catalog.product.status_changed',
  PRODUCT_VARIANT_CREATED: 'catalog.product_variant.created',
  CATEGORY_CREATED: 'catalog.category.created',
  CATEGORY_UPDATED: 'catalog.category.updated',
} as const;
