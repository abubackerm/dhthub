import { Injectable, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { FastifyRequest } from 'fastify';
import { DatabaseProvider } from '@core/database/database.provider';

export interface AuditLogEntry {
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly performedBy: string;
  readonly metadata?: Record<string, unknown>;
  readonly ipAddress?: string;
  readonly userAgent?: string;
  readonly occurredAt?: Date;
}

@Injectable()
export class AuditService {
  constructor(
    private readonly db: DatabaseProvider,
    @Inject(REQUEST) private readonly request?: FastifyRequest,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.db.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        performedBy: entry.performedBy,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress || this.extractIpAddress(),
        userAgent: entry.userAgent || this.extractUserAgent(),
        occurredAt: entry.occurredAt || new Date(),
      },
    });
  }

  async logBatch(entries: AuditLogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.log(entry);
    }
  }

  private extractIpAddress(): string | undefined {
    if (!this.request) return undefined;

    // Check forwarded headers first (Fastify headers are plain objects)
    const forwarded = this.request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0]?.trim();
    }

    const realIp = this.request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }

    // Fastify provides IP via .ip property
    return this.request.ip || undefined;
  }

  private extractUserAgent(): string | undefined {
    if (!this.request) return undefined;
    const userAgent = this.request.headers['user-agent'] as string;
    return userAgent || undefined;
  }
}
