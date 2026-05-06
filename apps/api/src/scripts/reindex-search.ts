/**
 * Search Index Reindex Script
 * 
 * Usage: pnpm --filter api reindex-search
 * 
 * This script rebuilds the entire Meilisearch index for product variants.
 * Use this when:
 * - Search results are missing or incomplete
 * - After bulk data imports
 * - When search index gets corrupted
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { IndexerService } from '../modules/search/services/indexer.service';

async function bootstrap() {
  const logger = new Logger('ReindexSearch');
  
  logger.log('🚀 Starting search index reindex...');
  logger.log('⏳ This may take several minutes depending on the number of variants');

  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    const indexerService = app.get(IndexerService);

    logger.log('📦 Fetching all variants from database...');
    await indexerService.bulkIndexVariants();

    logger.log('✅ Reindex completed successfully!');
    
    await app.close();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`❌ Reindex failed: ${errorMessage}`);
    logger.error('Stack trace:', error instanceof Error ? error.stack : 'N/A');
    process.exit(1);
  }
}

bootstrap();
