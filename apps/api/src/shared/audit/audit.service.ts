import { Injectable } from '@nestjs/common';

export interface AuditLogEntry {
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly performedBy: string;
  readonly metadata?: Record<string, unknown>;
  readonly occurredAt: Date;
}

@Injectable()
export class AuditService {
  async log(entry: AuditLogEntry): Promise<void> {
    // TODO: Implement audit logging
    // Future implementations may:
    // - Write to audit_logs table
    // - Send to external audit service
    // - Stream to observability platform
    console.log('[AUDIT]', JSON.stringify(entry));
  }

  async logBatch(entries: AuditLogEntry[]): Promise<void> {
    for (const entry of entries) {
      await this.log(entry);
    }
  }
}
