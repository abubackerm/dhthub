import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Centralized versioned cache key builder.
 *
 * All catalog and product cache keys MUST go through this service so that
 * bumping the version env-var immediately invalidates every stale key without
 * requiring a SCAN-delete or application restart.
 *
 * ## When to bump
 * - `CATALOG_CACHE_VERSION`: change the shape/semantics of any category-tree,
 *   leaf-page, consolidated-leaf, or filter-data response DTO.
 * - `PRODUCT_CACHE_VERSION`: change the shape/semantics of the product-detail
 *   (by-slug) response DTO.
 *
 * Old-versioned keys are simply never read again. They expire via TTL or can
 * be bulk-deleted once with `delPattern('catalog:v<old>:*')`.
 */
@Injectable()
export class CacheKeyService {
  private readonly catalogVersion: number;
  private readonly productVersion: number;

  constructor(private readonly configService: ConfigService) {
    this.catalogVersion = parseInt(
      this.configService.get<string>('cache.catalogVersion') || '1',
      10,
    );
    this.productVersion = parseInt(
      this.configService.get<string>('cache.productVersion') || '1',
      10,
    );
  }

  // ---------------------------------------------------------------------------
  // Catalog keys  (prefix: catalog:v{N}:)
  // ---------------------------------------------------------------------------

  /** Full category tree – `catalog:v{N}:tree` */
  catalogTree(): string {
    return `catalog:v${this.catalogVersion}:tree`;
  }

  /** Leaf page data for a single slug – `catalog:v{N}:leaf:{slug}` */
  catalogLeaf(slug: string): string {
    return `catalog:v${this.catalogVersion}:leaf:${slug}`;
  }

  /** Consolidated leaf data for a branch slug – `catalog:v{N}:consolidated:{slug}` */
  catalogConsolidated(slug: string): string {
    return `catalog:v${this.catalogVersion}:consolidated:${slug}`;
  }

  /** Aggregated filter / facet data – `catalog:v{N}:filter:{slug}` */
  catalogFilter(slug: string): string {
    return `catalog:v${this.catalogVersion}:filter:${slug}`;
  }

  /** Glob pattern that matches every catalog key at the current version. */
  catalogPattern(): string {
    return `catalog:v${this.catalogVersion}:*`;
  }

  // ---------------------------------------------------------------------------
  // Product keys  (prefix: product:v{N}:)
  // ---------------------------------------------------------------------------

  /** Product detail by slug – `product:v{N}:slug:{slug}` */
  productSlug(slug: string): string {
    return `product:v${this.productVersion}:slug:${slug}`;
  }

  /** Glob pattern that matches every product key at the current version. */
  productPattern(): string {
    return `product:v${this.productVersion}:*`;
  }
}
