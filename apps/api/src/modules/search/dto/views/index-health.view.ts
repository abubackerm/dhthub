export interface IndexHealthView {
  indexName: string;
  documentCount: number;
  isIndexing: boolean;
  fieldDistribution: Record<string, number>;
  createdAt: string | null;
  updatedAt: string;
}
