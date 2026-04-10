import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import csvParser from 'csv-parser';

export interface CsvRow {
  [key: string]: string | undefined;
}

export interface ParsedRow {
  rowNumber: number;
  data: CsvRow;
}

@Injectable()
export class CsvParserService {
  private readonly logger = new Logger(CsvParserService.name);

  /**
   * Parse a CSV file stream and return an async iterable of rows
   * @param fileStream - Readable stream of the CSV file
   * @param options - Optional configuration
   */
  async *parseStream(
    fileStream: Readable,
    options?: {
      validateHeaders?: string[];
    },
  ): AsyncGenerator<ParsedRow, void, unknown> {
    const {
      validateHeaders,
    } = options ?? {};

    let rowNumber = 0;
    let headersLogged = false;

    const parserStream = csvParser();

    try {
      for await (const row of fileStream.pipe(parserStream)) {
        rowNumber++;

        if (!headersLogged) {
          const headers = Object.keys(row);
          headersLogged = true;

          if (validateHeaders) {
            const missingHeaders = validateHeaders.filter(
              (h) => !headers.includes(h),
            );
            if (missingHeaders.length > 0) {
              throw new Error(
                `Missing required headers: ${missingHeaders.join(', ')}`,
              );
            }
          }

          this.logger.log(`CSV headers: ${headers.join(', ')}`);
        }

        this.logger.debug(`Parsed CSV row ${rowNumber}: ${JSON.stringify(row)}`);
        yield {
          rowNumber,
          data: row as CsvRow,
        };
      }

      this.logger.log(`Finished parsing CSV: ${rowNumber} data rows`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error parsing CSV at row ${rowNumber}: ${errorMessage}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Parse a CSV file stream and collect all rows into an array
   * Useful for validation mode or smaller files
   */
  async parseToArray(
    fileStream: Readable,
    options?: {
      skipEmptyLines?: boolean;
      trimHeaders?: boolean;
      validateHeaders?: string[];
    },
  ): Promise<ParsedRow[]> {
    const rows: ParsedRow[] = [];

    for await (const row of this.parseStream(fileStream, options)) {
      rows.push(row);
    }

    return rows;
  }

  /**
   * Get headers from CSV file without parsing all rows
   */
  async getHeaders(
    fileStream: Readable,
  ): Promise<string[]> {
    const parserStream = csvParser();

    try {
      for await (const row of fileStream.pipe(parserStream)) {
        return Object.keys(row);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error reading CSV headers: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }

    return [];
  }

  /**
   * Count total data rows in CSV file (excludes header only)
   * Must match parseToArray behavior — counts all rows the parser emits,
   * including empty rows, so totalRows stays consistent with processedRows.
   */
  async countRows(fileStream: Readable): Promise<number> {
    let count = 0;
    const parserStream = csvParser();

    try {
      for await (const _row of fileStream.pipe(parserStream)) {
        count++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error counting CSV rows: ${errorMessage}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }

    return count;
  }

  /**
   * Validate CSV format by checking first row
   */
  async validateFormat(fileStream: Readable): Promise<boolean> {
    try {
      const headers = await this.getHeaders(fileStream);
      return headers.length > 0;
    } catch {
      return false;
    }
  }
}
