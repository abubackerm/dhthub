import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuditService } from './audit.service';
import { AuditEventListener } from './audit.listener';

@Module({
  imports: [EventEmitterModule],
  providers: [AuditService, AuditEventListener],
  exports: [AuditService],
})
export class AuditModule {}
