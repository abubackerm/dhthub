export class SearchIndexUpdatedEvent {
  constructor(
    public readonly variantId: string,
    public readonly action: 'indexed' | 'updated' | 'deleted',
    public readonly occurredAt: Date = new Date(),
  ) {}
}

export class SearchIndexBulkUpdatedEvent {
  constructor(
    public readonly count: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}

export class SearchIndexClearedEvent {
  constructor(
    public readonly occurredAt: Date = new Date(),
  ) {}
}
