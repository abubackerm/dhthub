import { Controller, Get, Post, Delete, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { SearchQueryDto } from '../dto';
import { IndexHealthView } from '../dto';
import { SearchService } from '../services/search.service';
import { IndexerService } from '../services/indexer.service';
import { SearchIndexNotFoundError } from '../domain/errors/search.errors';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

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

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async stats(): Promise<{
    indexName: string;
    documentCount: number;
    isIndexing: boolean;
    hasData: boolean;
  }> {
    try {
      const health = await this.indexerService.getIndexHealth();
      return {
        indexName: health.indexName,
        documentCount: health.documentCount,
        isIndexing: health.isIndexing,
        hasData: health.documentCount > 0,
      };
    } catch (error) {
      return {
        indexName: 'variants',
        documentCount: 0,
        isIndexing: false,
        hasData: false,
      };
    }
  }

  @Post('reindex')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.ACCEPTED)
  async reindex(): Promise<{ message: string }> {
    await this.indexerService.bulkIndexVariants();
    return { message: 'Reindex initiated successfully' };
  }

  @Delete('index')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  async clearIndex(): Promise<{ message: string }> {
    await this.indexerService.clearIndex();
    return { message: 'Search index cleared successfully' };
  }
}
