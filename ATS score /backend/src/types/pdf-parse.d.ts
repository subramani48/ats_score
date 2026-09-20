declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string;
    IsAcroFormPresent: boolean;
    IsXFAPresent: boolean;
    Author?: string;
    Creator?: string;
    Producer?: string;
    [key: string]: unknown;
  }
  interface PDFMetadata {
    [key: string]: unknown;
  }
  interface PDFData {
    numpages: number;
    numrender: number;
    info: PDFInfo;
    metadata: PDFMetadata;
    text: string;
    version: string;
  }
  function pdfParse(dataBuffer: Buffer, options?: object): Promise<PDFData>;
  export = pdfParse;
}
