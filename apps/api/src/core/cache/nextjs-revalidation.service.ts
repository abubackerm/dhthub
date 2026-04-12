import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Triggers on-demand ISR revalidation in the Next.js frontend.
 *
 * This service is intentionally fire-and-forget: errors are logged but never
 * propagated to the caller, because a failed revalidation should not block
 * an import completion or admin action.
 *
 * The caller provides Next.js cache tags; this service POSTs to the
 * `/api/revalidate` endpoint on the Next.js app.
 */
@Injectable()
export class NextJsRevalidationService {
  private readonly logger = new Logger(NextJsRevalidationService.name);

  private readonly webUrl: string;
  private readonly secret: string;
  private readonly timeout: number;

  constructor(private readonly configService: ConfigService) {
    this.webUrl = this.configService.get<string>('nextJs.webUrl') ?? 'http://localhost:3005';
    this.secret = this.configService.get<string>('nextJs.revalidationSecret') ?? '';
    this.timeout = 10_000;
  }

  /**
   * Revalidate specific Next.js cache tags.
   *
   * @param tags    Array of Next.js cache tags (e.g. `['catalog', 'product']`).
   * @param context Human-readable label for logging (e.g. `'catalog-import'`).
   */
  async revalidateTags(tags: string[], context: string): Promise<void> {
    if (!this.secret) {
      this.logger.debug(`Skipping Next.js revalidation (${context}) — no REVALIDATION_SECRET configured`);
      return;
    }

    if (tags.length === 0) return;

    try {
      const url = `${this.webUrl}/api/revalidate`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-revalidation-secret': this.secret,
        },
        body: JSON.stringify({ tags }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        this.logger.warn(
          `Next.js revalidation returned ${response.status} (${context}): ${text}`,
        );
        return;
      }

      this.logger.log(`Next.js revalidation triggered (${context}): tags=[${tags.join(', ')}]`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Next.js revalidation failed (${context}): ${message}`);
    }
  }
}
