import { Injectable, BadRequestException } from '@nestjs/common';
import pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';

@Injectable()
export class ParserService {
  async extractText(buffer: Buffer, mimeType: string): Promise<string> {
    if (mimeType === 'application/pdf') {
      const fn = typeof pdfParse === 'function' ? pdfParse : (pdfParse as unknown as { default: typeof pdfParse }).default;
      const data = await fn(buffer);
      return data.text;
    }

    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      mimeType === 'application/msword'
    ) {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }

    const text = buffer.toString('utf8');
    if (!text.trim()) throw new BadRequestException('Could not extract text from the uploaded file');
    return text;
  }
}
