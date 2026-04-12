import { Injectable, Logger } from '@nestjs/common';
import { MeiliClient } from '../meilisearch/meili.client';
import { CacheService } from '@core/cache';
import { SearchQueryDto, SearchResultView, SearchResultItem, SearchFacet } from '../dto';
import { SearchIndexNotFoundError, SearchQueryError } from '../domain/errors/search.errors';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly ALIAS_NAME = 'variants';

  constructor(
    private readonly meiliClient: MeiliClient,
    private readonly cacheService: CacheService,
  ) {}

  async searchVariants(query: SearchQueryDto): Promise<SearchResultView> {
    try {
      const queryHash = this.generateQueryHash(query);
      const cacheKey = `search:${queryHash}`;

      return await this.cacheService.wrap(
        cacheKey,
        async () => {
          const filters = this.buildFilters(query);
          const facetFields = query.facets ? query.facets.split(',').map((f) => f.trim()) : ['categoryPath'];

          const searchParams = {
            filter: filters,
            facets: facetFields,
            limit: query.limit ?? 20,
            offset: ((query.page ?? 1) - 1) * (query.limit ?? 20),
            sort: this.buildSort(query),
            matchingStrategy: 'frequency' as const,
            attributesToRetrieve: [
              'variantId', 'productId', 'productName', 'sku',
              'categoryId', 'categoryPath', 'price', 'stock',
              'image', 'attributes',
            ],
            attributesToHighlight: ['productName', 'sku', 'categoryPath'],
            highlightPreTag: '<em>',
            highlightPostTag: '</em>',
          };

          const result = await this.meiliClient.index(this.ALIAS_NAME).search(query.q, searchParams);

          const items: SearchResultItem[] = result.hits.map((hit: any) => {
            const formatted = hit._formatted ?? {};
            return {
              variantId: hit.variantId,
              productId: hit.productId,
              productName: hit.productName,
              sku: hit.sku,
              categoryId: hit.categoryId,
              categoryPath: hit.categoryPath,
              price: hit.price,
              currency: hit.currency,
              stock: hit.stock,
              image: hit.image,
              attributes: hit.attributes ?? {},
              highlight: {
                productName: formatted.productName,
                sku: formatted.sku,
                categoryPath: formatted.categoryPath,
              },
            };
          });

          const facetsResult = this.formatFacets(result.facetDistribution ?? {});

          return {
            total: result.estimatedTotalHits ?? 0,
            page: query.page ?? 1,
            limit: query.limit ?? 20,
            totalPages: Math.ceil((result.estimatedTotalHits ?? 0) / (query.limit ?? 20)),
            items,
            facets: facetsResult,
          };
        },
        60,
      );
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'index_not_found') {
        throw new SearchIndexNotFoundError(this.ALIAS_NAME);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Search failed: ${errorMessage}`);
      throw new SearchQueryError(errorMessage);
    }
  }

  private buildFilters(query: SearchQueryDto): string[] {
    const filters: string[] = [];
    const escapeFilterValue = (value: string) => value.replace(/"/g, '\\"');

    if (query.category) {
      filters.push(`categoryPath = "${escapeFilterValue(query.category)}"`);
    }

    if (query.priceMin !== undefined || query.priceMax !== undefined) {
      if (query.priceMin !== undefined && query.priceMax !== undefined) {
        filters.push(`price >= ${query.priceMin} AND price <= ${query.priceMax}`);
      } else if (query.priceMin !== undefined) {
        filters.push(`price >= ${query.priceMin}`);
      } else {
        filters.push(`price <= ${query.priceMax}`);
      }
    }

    if (query.inStock) {
      filters.push('stock > 0');
    }

    if (query.attributes) {
      for (const [key, value] of Object.entries(query.attributes)) {
        if (typeof value === 'string') {
          filters.push(`attributes.${key} = "${escapeFilterValue(value)}"`);
        } else {
          filters.push(`attributes.${key} = ${value}`);
        }
      }
    }

    return filters;
  }

  private buildSort(query: SearchQueryDto): string[] | undefined {
    const sorts: string[] = [];
    const order = query.sortOrder === 'desc' ? 'desc' : 'asc';

    if (query.sortBy === 'price') {
      sorts.push(`price:${order}`);
    } else if (query.sortBy === 'stock') {
      sorts.push(`stock:${order}`);
    }

    return sorts.length > 0 ? sorts : undefined;
  }

  private formatFacets(facetDistribution: Record<string, Record<string, number>>): SearchFacet[] {
    if (!facetDistribution) {
      return [];
    }

    return Object.entries(facetDistribution).map(([field, values]) => ({
      field,
      values: Object.entries(values).map(([value, count]) => ({
        value,
        count,
      })),
    }));
  }

  private generateQueryHash(query: SearchQueryDto): string {
    const normalized = {
      q: query.q || '',
      category: query.category || '',
      priceMin: query.priceMin ?? null,
      priceMax: query.priceMax ?? null,
      inStock: query.inStock ?? null,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
      attributes: query.attributes || {},
      facets: query.facets || '',
      sortBy: query.sortBy || '',
      sortOrder: query.sortOrder || '',
    };
    const sorted = JSON.stringify(normalized, Object.keys(normalized).sort());
    return Buffer.from(sorted).toString('base64').substring(0, 32);
  }
}
