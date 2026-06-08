// ===========================================
// DHT Hub - Environment Configuration
// ===========================================

export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.API_PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  catalog: {
    productLimit: parseInt(process.env.CATALOG_PRODUCT_LIMIT || '25000', 10),
  },
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    catalogVersion: process.env.CATALOG_CACHE_VERSION || '1',
    productVersion: process.env.PRODUCT_CACHE_VERSION || '1',
    ttl: {
      attributeDefinition: parseInt(process.env.CACHE_TTL_ATTRIBUTE_DEFINITION || '3600', 10),
      attributeOption: parseInt(process.env.CACHE_TTL_ATTRIBUTE_OPTION || '3600', 10),
      categoryAttribute: parseInt(process.env.CACHE_TTL_CATEGORY_ATTRIBUTE || '1800', 10),
      unitDefinition: parseInt(process.env.CACHE_TTL_UNIT_DEFINITION || '7200', 10),
      categoryTree: parseInt(process.env.CACHE_TTL_CATEGORY_TREE || '300', 10),
      categoryLeaf: parseInt(process.env.CACHE_TTL_CATEGORY_LEAF || '120', 10),
      categoryConsolidated: parseInt(process.env.CACHE_TTL_CATEGORY_CONSOLIDATED || '120', 10),
      categoryFilter: parseInt(process.env.CACHE_TTL_CATEGORY_FILTER || '300', 10),
      productSlug: parseInt(process.env.CACHE_TTL_PRODUCT_SLUG || '120', 10),
    },
  },
  meilisearch: {
    host: process.env.MEILISEARCH_HOST || 'http://localhost',
    port: parseInt(process.env.MEILISEARCH_PORT || '7700', 10),
    masterKey: process.env.MEILISEARCH_MASTER_KEY || '',
  },
  microsoft: {
    tenantId: process.env.MS_TENANT_ID,
    clientId: process.env.MS_CLIENT_ID,
    clientSecret: process.env.MS_CLIENT_SECRET,
  },
  email: {
    from: process.env.EMAIL_FROM,
    fromName: process.env.EMAIL_FROM_NAME || 'DHT',
    adminRecipient: process.env.EMAIL_ADMIN_RECIPIENT,
  },
  recaptcha: {
    secretKey: process.env.RECAPTCHA_SECRET_KEY,
    skip: process.env.SKIP_RECAPTCHA === 'true',
  },
  nextJs: {
    webUrl: process.env.NEXT_WEB_URL || 'http://localhost:3005',
    revalidationSecret: process.env.REVALIDATION_SECRET || '',
  },
  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_API_PORT || '9000', 10),
    consolePort: parseInt(process.env.MINIO_CONSOLE_PORT || '9001', 10),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ROOT_USER || 'minioadmin',
    secretKey: process.env.MINIO_ROOT_PASSWORD || 'minioadmin',
  },
});
