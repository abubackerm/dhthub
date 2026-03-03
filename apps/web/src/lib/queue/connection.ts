import IORedis from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6380', 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const connectionOptions = {
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
};

export const redisConnection = new IORedis(connectionOptions);

redisConnection.on('connect', () => {
  console.log('[Redis] Connected successfully');
});

redisConnection.on('error', (err) => {
  console.error('[Redis] Connection error:', err.message);
});

export default redisConnection;
