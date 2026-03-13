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
  PRODUCT_VARIANT_UPDATED: 'catalog.product_variant.updated',
  PRODUCT_VARIANT_DELETED: 'catalog.product_variant.deleted',
  CATEGORY_CREATED: 'catalog.category.created',
  CATEGORY_UPDATED: 'catalog.category.updated',
} as const;

export const INVENTORY_EVENTS = {
  STOCK_ADJUSTED: 'inventory.stock.adjusted',
  STOCK_RESERVED: 'inventory.stock.reserved',
  STOCK_RELEASED: 'inventory.stock.released',
} as const;

export const SEARCH_EVENTS = {
  INDEX_UPDATED: 'search.index.updated',
  INDEX_BULK_UPDATED: 'search.index.bulk_updated',
  INDEX_CLEARED: 'search.index.cleared',
} as const;

export const IMPORT_EVENTS = {
  JOB_CREATED: 'import.job.created',
  JOB_STARTED: 'import.job.started',
  JOB_COMPLETED: 'import.job.completed',
  JOB_FAILED: 'import.job.failed',
  BATCH_PROCESSED: 'import.batch.processed',
} as const;

export const CART_EVENTS = {
  CART_CREATED: 'cart.created',
  CART_CLEARED: 'cart.cleared',
  CART_SUBMITTED: 'cart.submitted',
  CART_ITEM_ADDED: 'cart.item.added',
  CART_ITEM_UPDATED: 'cart.item.updated',
  CART_ITEM_REMOVED: 'cart.item.removed',
} as const;

export const ENQUIRY_EVENTS = {
  ENQUIRY_CREATED: 'enquiry.created',
  ENQUIRY_STATUS_UPDATED: 'enquiry.status.updated',
} as const;
