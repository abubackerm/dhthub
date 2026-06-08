import { Injectable, Logger } from '@nestjs/common';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir: string;
  private readonly cache = new Map<string, HandlebarsTemplateDelegate>();

  constructor() {
    this.templatesDir = path.join(__dirname, '..', 'templates');
    Handlebars.registerHelper('formatDate', (date: string | Date) => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    });

    Handlebars.registerHelper('formatStatus', (status: string) => {
      return status
        ? status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
        : '';
    });

    Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);
  }

  async render(templateName: string, data: Record<string, unknown>): Promise<string> {
    const compiled = this.getCompiledTemplate(templateName);
    return compiled(data);
  }

  private getCompiledTemplate(templateName: string): HandlebarsTemplateDelegate {
    const cached = this.cache.get(templateName);
    if (cached) return cached;

    const filePath = path.join(this.templatesDir, `${templateName}.hbs`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Email template not found: ${templateName} at ${filePath}`);
    }

    const source = fs.readFileSync(filePath, 'utf-8');
    const compiled = Handlebars.compile(source);
    this.cache.set(templateName, compiled);
    this.logger.debug(`Compiled email template: ${templateName}`);
    return compiled;
  }
}
