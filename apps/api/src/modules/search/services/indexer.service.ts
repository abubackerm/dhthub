import { Injectable, Logger } from '@nestjs/common';
import { MeiliClient } from '../meilisearch/meili.client';
import { VariantDocumentBuilder } from './document-builder.service';
import { SearchIndexCreationError, SearchIndexingError } from '../domain/errors/search.errors';

export interface IndexSettings {
  searchableAttributes: string[];
  filterableAttributes: string[];
  sortableAttributes: string[];
  rankingRules: string[];
}

export interface IndexVersion {
  version: number;
  indexName: string;
  createdAt: Date;
}

@Injectable()
export class IndexerService {
  private readonly logger = new Logger(IndexerService.name);
  private readonly ALIAS_NAME = 'variants';
  private readonly INDEX_PREFIX = 'variants_v';
  private readonly BATCH_SIZE = 1000;
  private currentVersion = 1;

  constructor(
    private readonly meiliClient: MeiliClient,
    private readonly documentBuilder: VariantDocumentBuilder,
  ) {}

  private get currentIndexName(): string {
    return `${this.INDEX_PREFIX}${this.currentVersion}`;
  }

  async ensureIndex(): Promise<void> {
    try {
      const indexes = await this.meiliClient.getIndexes();
      const indexExists = indexes.results.some((idx) => idx.uid === this.ALIAS_NAME);

      if (!indexExists) {
        await this.meiliClient.createIndex(this.ALIAS_NAME, {
          primaryKey: 'variantId',
        });
        this.logger.log(`Created search index '${this.ALIAS_NAME}'`);
        await this.configureIndexSettings();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to ensure index: ${errorMessage}`);
      throw new SearchIndexCreationError(this.ALIAS_NAME, errorMessage);
    }
  }

  async indexVariant(variantId: string): Promise<void> {
    try {
      const document = await this.documentBuilder.buildDocument(variantId);
      if (!document) {
        this.logger.warn(`Variant ${variantId} not found, skipping indexing`);
        return;
      }

      await this.meiliClient.index(this.ALIAS_NAME).addDocuments([document]);
      this.logger.debug(`Indexed variant ${variantId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to index variant ${variantId}: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async updateVariant(variantId: string): Promise<void> {
    try {
      const document = await this.documentBuilder.buildDocument(variantId);
      if (!document) {
        this.logger.warn(`Variant ${variantId} not found, skipping update`);
        return;
      }

      await this.meiliClient.index(this.ALIAS_NAME).updateDocuments([document]);
      this.logger.debug(`Updated variant ${variantId} in search index`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update variant ${variantId}: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async deleteVariant(variantId: string): Promise<void> {
    try {
      await this.meiliClient.index(this.ALIAS_NAME).deleteDocument(variantId);
      this.logger.debug(`Deleted variant ${variantId} from search index`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to delete variant ${variantId}: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async bulkIndexVariants(variantIds?: string[]): Promise<void> {
    try {
      await this.ensureIndex();

      const prisma = this.documentBuilder['prisma'];
      const variantsToIndex = variantIds
        ? await prisma.productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true },
          })
        : await prisma.productVariant.findMany({
            select: { id: true },
          });

      const totalVariants = variantsToIndex.length;
      this.logger.log(`Starting bulk index of ${totalVariants} variants`);

      for (let i = 0; i < totalVariants; i += this.BATCH_SIZE) {
        const batch = variantsToIndex.slice(i, i + this.BATCH_SIZE);
        const documents = await Promise.all(
          batch.map((v) => this.documentBuilder.buildDocument(v.id)),
        );

        const validDocuments = documents.filter((doc) => doc !== null);

        if (validDocuments.length > 0) {
          await this.meiliClient.index(this.ALIAS_NAME).addDocuments(validDocuments);
        }

        this.logger.debug(`Batch ${Math.floor(i / this.BATCH_SIZE) + 1} completed: ${batch.length} variants`);
      }

      this.logger.log(`Bulk index completed: ${totalVariants} variants`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Bulk index failed: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async configureIndexSettings(indexName: string = this.ALIAS_NAME): Promise<void> {
    try {
      const settings: IndexSettings = {
        searchableAttributes: ['productName', 'sku', 'categoryPath'],
        filterableAttributes: [
          'categoryPath',
          'categoryId',
          'price',
          'stock',
          'attributes.material',
          'attributes.finish',
          'attributes.diameter',
          'attributes.*',
        ],
        sortableAttributes: ['price', 'stock'],
        rankingRules: ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
      };

      await this.meiliClient.index(indexName).updateSettings(settings);
      this.logger.log(`Updated index settings for '${indexName}'`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to configure index settings: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async clearIndex(): Promise<void> {
    try {
      await this.meiliClient.index(this.ALIAS_NAME).deleteAllDocuments();
      this.logger.log(`Cleared all documents from index '${this.ALIAS_NAME}'`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to clear index: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async getIndexStats(): Promise<unknown> {
    try {
      return await this.meiliClient.index(this.ALIAS_NAME).getStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get index stats: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async getIndexHealth(): Promise<{
    indexName: string;
    documentCount: number;
    isIndexing: boolean;
    fieldDistribution: Record<string, number>;
    createdAt: string | null;
    updatedAt: string;
  }> {
    try {
      const stats = await this.meiliClient.index(this.ALIAS_NAME).getStats();
      return {
        indexName: this.ALIAS_NAME,
        documentCount: stats.numberOfDocuments ?? 0,
        isIndexing: stats.isIndexing ?? false,
        fieldDistribution: stats.fieldDistribution ?? {},
        createdAt: null,
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get index health: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  async rotateIndexVersion(): Promise<void> {
    try {
      const nextVersion = this.currentVersion + 1;
      const nextIndexName = `${this.INDEX_PREFIX}${nextVersion}`;

      this.logger.log(`Starting index version rotation from ${this.currentVersion} to ${nextVersion}`);

      await this.meiliClient.createIndex(nextIndexName, {
        primaryKey: 'variantId',
      });
      this.logger.log(`Created new index '${nextIndexName}'`);

      await this.configureIndexSettings(nextIndexName);

      await this.bulkIndexVariants();

      const oldIndexName = this.currentIndexName;
      this.currentVersion = nextVersion;
      this.logger.log(`Switched to new version ${this.currentVersion}`);

      await this.deleteOldIndex(oldIndexName);
      this.logger.log(`Index version rotation completed`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Index version rotation failed: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }

  private async deleteOldIndex(indexName: string): Promise<void> {
    try {
      await this.meiliClient.deleteIndex(indexName);
      this.logger.log(`Deleted old index '${indexName}'`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to delete old index '${indexName}': ${errorMessage}`);
    }
  }

  async getCurrentVersion(): Promise<IndexVersion> {
    try {
      return {
        version: this.currentVersion,
        indexName: this.currentIndexName,
        createdAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get current version: ${errorMessage}`);
      throw new SearchIndexingError(errorMessage);
    }
  }
}
