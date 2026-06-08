import { EventEmitter2 } from '@nestjs/event-emitter';

export abstract class BaseService {
  constructor(protected readonly eventEmitter: EventEmitter2) {}

  protected emit(eventName: string, payload: unknown): void {
    this.eventEmitter.emit(eventName, payload);
  }
}
