import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfidentialClientApplication } from '@azure/msal-node';
import type { Configuration } from '@azure/msal-node';
import Redis from 'ioredis';

const TOKEN_BUFFER_SECONDS = 300; // 5 minutes

@Injectable()
export class MsalService {
  private readonly logger = new Logger(MsalService.name);
  private readonly msalClient: ConfidentialClientApplication;
  private readonly redis: Redis | null = null;
  private readonly redisKey: string;

  constructor(private readonly configService: ConfigService) {
    const tenantId = this.configService.get<string>('microsoft.tenantId');
    const clientId = this.configService.get<string>('microsoft.clientId');
    const clientSecret = this.configService.get<string>('microsoft.clientSecret');

    if (!tenantId || !clientId || !clientSecret) {
      this.logger.warn('Microsoft Graph API credentials are not fully configured. Email sending will not work.');
    }

    this.redisKey = `msal:access_token:${tenantId}:${clientId}`;

    const msalConfig: Configuration = {
      auth: {
        clientId: clientId || '',
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret: clientSecret || '',
      },
    };

    this.msalClient = new ConfidentialClientApplication(msalConfig);

    const redisHost = this.configService.get<string>('cache.host');
    const redisPort = this.configService.get<number>('cache.port');
    const redisPassword = this.configService.get<string>('cache.password');
    const redisDb = this.configService.get<number>('cache.db');

    if (redisHost) {
      this.redis = new Redis({
        host: redisHost,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('error', (err) => {
        this.logger.warn(`Redis connection error: ${err.message}. Falling back to MSAL in-memory cache.`);
      });

      this.redis.connect().catch((err) => {
        this.logger.warn(`Failed to connect to Redis: ${err.message}. Falling back to MSAL in-memory cache.`);
      });
    } else {
      this.logger.debug('Redis host not configured. Using MSAL in-memory token cache only.');
    }
  }

  async getAccessToken(): Promise<string> {
    if (this.redis) {
      try {
        const cachedToken = await this.redis.get(this.redisKey);
        if (cachedToken) {
          this.logger.debug('Using cached access token from Redis');
          return cachedToken;
        }
      } catch {
        this.logger.debug('Redis cache read failed, acquiring new token');
      }
    }

    const tokenResponse = await this.msalClient.acquireTokenByClientCredential({
      scopes: ['https://graph.microsoft.com/.default'],
    });

    if (!tokenResponse) {
      throw new Error('Failed to acquire access token from Microsoft Graph API');
    }

    const expiresIn = tokenResponse.expiresOn
      ? Math.floor((tokenResponse.expiresOn.getTime() - Date.now()) / 1000)
      : 3600;

    const ttl = Math.max(expiresIn - TOKEN_BUFFER_SECONDS, 60);

    if (this.redis && tokenResponse.accessToken) {
      try {
        await this.redis.set(this.redisKey, tokenResponse.accessToken, 'EX', ttl);
        this.logger.debug(`Cached access token in Redis with TTL ${ttl}s`);
      } catch {
        this.logger.debug('Failed to cache token in Redis');
      }
    }

    return tokenResponse.accessToken;
  }

  async onModuleDestroy() {
    if (this.redis) {
      this.redis.quit();
    }
  }
}
