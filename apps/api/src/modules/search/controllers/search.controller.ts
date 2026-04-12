import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SearchQueryDto } from '../dto';
import { IndexHealthView } from '../dto';
import { SearchService } from '../services/search.service';
import { IndexerService } from '../services/indexer.service';
import { SearchIndexNotFoundError } from '../domain/errors/search.errors';

@Controller('search')
export class SearchController {
  constructor(
    private readonly searchService: SearchService,
    private readonly indexerService: IndexerService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async search(@Query() query: SearchQueryDto) {
    try {
      return await this.searchService.searchVariants(query);
    } catch (error) {
      if (error instanceof SearchIndexNotFoundError) {
        return {
          total: 0,
          page: query.page ?? 1,
          limit: query.limit ?? 20,
          totalPages: 0,
          items: [],
          facets: [],
        };
      }
      throw error;
    }
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async health(): Promise<IndexHealthView> {
    try {
      return await this.indexerService.getIndexHealth();
    } catch (error) {
      if (error instanceof SearchIndexNotFoundError) {
        return {
          indexName: 'variants',
          documentCount: 0,
          isIndexing: false,
          fieldDistribution: {},
          createdAt: null,
          updatedAt: new Date().toISOString(),
        };
      }
      throw error;
    }
  }
}
