import { HttpException, HttpStatus } from '@nestjs/common';

export class SearchIndexNotFoundError extends HttpException {
  constructor(indexName: string) {
    super(
      {
        message: `Search index '${indexName}' not found`,
        error: 'SEARCH_INDEX_NOT_FOUND',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SearchIndexCreationError extends HttpException {
  constructor(indexName: string, reason: string) {
    super(
      {
        message: `Failed to create search index '${indexName}': ${reason}`,
        error: 'SEARCH_INDEX_CREATION_ERROR',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class SearchDocumentNotFoundError extends HttpException {
  constructor(documentId: string) {
    super(
      {
        message: `Search document '${documentId}' not found`,
        error: 'SEARCH_DOCUMENT_NOT_FOUND',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class SearchIndexingError extends HttpException {
  constructor(reason: string) {
    super(
      {
        message: `Failed to index document: ${reason}`,
        error: 'SEARCH_INDEXING_ERROR',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class SearchQueryError extends HttpException {
  constructor(reason: string) {
    super(
      {
        message: `Invalid search query: ${reason}`,
        error: 'SEARCH_QUERY_ERROR',
      },
      HttpStatus.BAD_REQUEST,
    );
  }
}
