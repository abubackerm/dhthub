import { MeiliSearch } from 'meilisearch';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

@Injectable()
export class MeiliClient extends MeiliSearch implements OnModuleDestroy {
  private readonly logger = new Logger(MeiliClient.name);

  constructor(configService: ConfigService) {
    const host = configService.get<string>('meilisearch.host', 'http://localhost');
    const port = configService.get<number>('meilisearch.port', 7700);
    const apiKey = configService.get<string>('meilisearch.masterKey', '');

    super({
      host: `${host}:${port}`,
      apiKey,
    });

    this.logger.log(`Meilisearch client initialized for ${host}:${port}`);
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Meilisearch client cleanup complete');
  }
}
