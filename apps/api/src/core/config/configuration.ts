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
    ttl: {
      attributeDefinition: parseInt(process.env.CACHE_TTL_ATTRIBUTE_DEFINITION || '3600', 10),
      attributeOption: parseInt(process.env.CACHE_TTL_ATTRIBUTE_OPTION || '3600', 10),
      categoryAttribute: parseInt(process.env.CACHE_TTL_CATEGORY_ATTRIBUTE || '1800', 10),
      unitDefinition: parseInt(process.env.CACHE_TTL_UNIT_DEFINITION || '7200', 10),
    },
  },
});
